import { CorridorStation, StationRecord } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { Logger } from '../utils/Logger';

/**
 * Service for managing Berlin-Hamburg corridor station identification and data
 */
export class CorridorService {
  private db: DatabaseService;
  private logger = Logger.getInstance();

  // Known Berlin-Hamburg corridor stations with their approximate distances
  private readonly CORRIDOR_STATIONS = [
    { eva: 8011160, name: 'Berlin Hbf', distanceFromBerlin: 0 },
    { eva: 8010404, name: 'Berlin-Spandau', distanceFromBerlin: 15 },
    { eva: 8010406, name: 'Berlin-Wannsee', distanceFromBerlin: 25 },
    { eva: 8012666, name: 'Potsdam Hbf', distanceFromBerlin: 35 },
    { eva: 8013456, name: 'Brandenburg(Havel)', distanceFromBerlin: 70 },
    { eva: 8010334, name: 'Rathenow', distanceFromBerlin: 95 },
    { eva: 8010316, name: 'Stendal', distanceFromBerlin: 140 },
    { eva: 8010310, name: 'Salzwedel', distanceFromBerlin: 165 },
    { eva: 8000152, name: 'Hagenow Land', distanceFromBerlin: 180 },
    { eva: 8000147, name: 'Ludwigslust', distanceFromBerlin: 200 },
    { eva: 8000237, name: 'Büchen', distanceFromBerlin: 240 },
    { eva: 8002549, name: 'Hamburg-Harburg', distanceFromBerlin: 270 },
    { eva: 8002548, name: 'Hamburg Hbf', distanceFromBerlin: 289 }
  ];

  constructor(databaseService: DatabaseService) {
    this.db = databaseService;
  }

  /**
   * Identifies and returns all stations along the Berlin-Hamburg corridor
   */
  async getCorridorStations(): Promise<CorridorStation[]> {
    try {
      this.logger.info('Fetching Berlin-Hamburg corridor stations');
      
      const query = `
        SELECT 
          eva,
          name,
          ST_X(coordinates) as longitude,
          ST_Y(coordinates) as latitude,
          distance_from_berlin,
          category,
          platform_count,
          facilities,
          is_strategic_hub
        FROM corridor_stations 
        ORDER BY distance_from_berlin ASC
      `;

      const result = await this.db.query(query);
      
      return result.rows.map(row => ({
        eva: row.eva,
        name: row.name,
        coordinates: [row.longitude, row.latitude] as [number, number],
        distanceFromBerlin: row.distance_from_berlin,
        category: row.category,
        platforms: row.platform_count,
        facilities: row.facilities,
        upgradePriority: 0, // Will be calculated by priority service
        isStrategicHub: row.is_strategic_hub
      }));
    } catch (error) {
      this.logger.error('Error fetching corridor stations:', error);
      throw new Error('Failed to fetch corridor stations');
    }
  }

  /**
   * Gets a specific corridor station by EVA number
   */
  async getStationByEva(eva: number): Promise<CorridorStation | null> {
    try {
      const query = `
        SELECT 
          eva,
          name,
          ST_X(coordinates) as longitude,
          ST_Y(coordinates) as latitude,
          distance_from_berlin,
          category,
          platform_count,
          facilities,
          is_strategic_hub
        FROM corridor_stations 
        WHERE eva = $1
      `;

      const result = await this.db.query(query, [eva]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        eva: row.eva,
        name: row.name,
        coordinates: [row.longitude, row.latitude] as [number, number],
        distanceFromBerlin: row.distance_from_berlin,
        category: row.category,
        platforms: row.platform_count,
        facilities: row.facilities,
        upgradePriority: 0,
        isStrategicHub: row.is_strategic_hub
      };
    } catch (error) {
      this.logger.error(`Error fetching station ${eva}:`, error);
      throw new Error(`Failed to fetch station ${eva}`);
    }
  }

  /**
   * Calculates the distance between Berlin Hbf and a given station
   */
  calculateDistanceFromBerlin(coordinates: [number, number]): number {
    const berlinCoords: [number, number] = [13.369545, 52.525589]; // Berlin Hbf
    
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coordinates[1] - berlinCoords[1]);
    const dLon = this.toRadians(coordinates[0] - berlinCoords[0]);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(berlinCoords[1])) * Math.cos(this.toRadians(coordinates[1])) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Stores corridor station data in the database
   */
  async storeCorridorStation(station: Omit<CorridorStation, 'upgradePriority'>): Promise<void> {
    try {
      const query = `
        INSERT INTO corridor_stations 
        (eva, name, coordinates, distance_from_berlin, category, platform_count, facilities, is_strategic_hub)
        VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7, $8)
        ON CONFLICT (eva) DO UPDATE SET
          name = EXCLUDED.name,
          coordinates = EXCLUDED.coordinates,
          distance_from_berlin = EXCLUDED.distance_from_berlin,
          category = EXCLUDED.category,
          platform_count = EXCLUDED.platform_count,
          facilities = EXCLUDED.facilities,
          is_strategic_hub = EXCLUDED.is_strategic_hub,
          updated_at = NOW()
      `;

      const coordinates = `POINT(${station.coordinates[0]} ${station.coordinates[1]})`;
      
      await this.db.query(query, [
        station.eva,
        station.name,
        coordinates,
        station.distanceFromBerlin,
        station.category,
        station.platforms,
        JSON.stringify(station.facilities),
        station.isStrategicHub
      ]);

      this.logger.info(`Stored corridor station: ${station.name} (EVA: ${station.eva})`);
    } catch (error) {
      this.logger.error(`Error storing station ${station.eva}:`, error);
      throw new Error(`Failed to store station ${station.eva}`);
    }
  }

  /**
   * Validates if a station is part of the Berlin-Hamburg corridor
   */
  isCorridorStation(eva: number): boolean {
    return this.CORRIDOR_STATIONS.some(station => station.eva === eva);
  }

  /**
   * Gets the linear position of a station along the corridor (0-1 scale)
   */
  getCorridorPosition(distanceFromBerlin: number): number {
    const totalDistance = 289; // Berlin to Hamburg distance in km
    return Math.min(distanceFromBerlin / totalDistance, 1);
  }

  /**
   * Gets stations within a specific distance range from Berlin
   */
  async getStationsInRange(minDistance: number, maxDistance: number): Promise<CorridorStation[]> {
    try {
      const query = `
        SELECT 
          eva,
          name,
          ST_X(coordinates) as longitude,
          ST_Y(coordinates) as latitude,
          distance_from_berlin,
          category,
          platform_count,
          facilities,
          is_strategic_hub
        FROM corridor_stations 
        WHERE distance_from_berlin >= $1 AND distance_from_berlin <= $2
        ORDER BY distance_from_berlin ASC
      `;

      const result = await this.db.query(query, [minDistance, maxDistance]);
      
      return result.rows.map(row => ({
        eva: row.eva,
        name: row.name,
        coordinates: [row.longitude, row.latitude] as [number, number],
        distanceFromBerlin: row.distance_from_berlin,
        category: row.category,
        platforms: row.platform_count,
        facilities: row.facilities,
        upgradePriority: 0,
        isStrategicHub: row.is_strategic_hub
      }));
    } catch (error) {
      this.logger.error('Error fetching stations in range:', error);
      throw new Error('Failed to fetch stations in range');
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}