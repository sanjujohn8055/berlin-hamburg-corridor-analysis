import { CorridorStation, CORRIDOR_ENDPOINTS } from '../../../src/shared/types';

/**
 * Service for identifying and managing Berlin-Hamburg corridor stations
 */
export class CorridorIdentificationService {
  // Known major stations along the Berlin-Hamburg corridor with approximate distances
  private readonly CORRIDOR_STATIONS = [
    { eva: 8011160, name: 'Berlin Hbf', distance: 0 },
    { eva: 8010404, name: 'Berlin-Spandau', distance: 15 },
    { eva: 8000284, name: 'Rathenow', distance: 75 },
    { eva: 8010310, name: 'Stendal', distance: 120 },
    { eva: 8000036, name: 'Salzwedel', distance: 160 },
    { eva: 8000022, name: 'Uelzen', distance: 200 },
    { eva: 8000152, name: 'Lüneburg', distance: 240 },
    { eva: 8002548, name: 'Hamburg-Harburg', distance: 275 },
    { eva: 8002549, name: 'Hamburg Hbf', distance: 290 }
  ];

  /**
   * Identifies all stations along the Berlin-Hamburg corridor
   * @returns Array of corridor station identifiers with distances
   */
  public identifyCorridorStations(): Array<{eva: number, name: string, distanceFromBerlin: number}> {
    return this.CORRIDOR_STATIONS.map(station => ({
      eva: station.eva,
      name: station.name,
      distanceFromBerlin: station.distance
    }));
  }

  /**
   * Calculates the distance from Berlin for a given station
   * @param eva Station EVA number
   * @returns Distance in kilometers, or null if not on corridor
   */
  public getDistanceFromBerlin(eva: number): number | null {
    const station = this.CORRIDOR_STATIONS.find(s => s.eva === eva);
    return station ? station.distance : null;
  }

  /**
   * Checks if a station is part of the Berlin-Hamburg corridor
   * @param eva Station EVA number
   * @returns True if station is on the corridor
   */
  public isCorridorStation(eva: number): boolean {
    return this.CORRIDOR_STATIONS.some(s => s.eva === eva);
  }

  /**
   * Gets the next station along the corridor in the direction of travel
   * @param currentEva Current station EVA
   * @param direction Travel direction
   * @returns Next station EVA or null if at end
   */
  public getNextStation(currentEva: number, direction: 'BERLIN_TO_HAMBURG' | 'HAMBURG_TO_BERLIN'): number | null {
    const currentIndex = this.CORRIDOR_STATIONS.findIndex(s => s.eva === currentEva);
    if (currentIndex === -1) return null;

    if (direction === 'BERLIN_TO_HAMBURG') {
      const nextIndex = currentIndex + 1;
      return nextIndex < this.CORRIDOR_STATIONS.length ? this.CORRIDOR_STATIONS[nextIndex].eva : null;
    } else {
      const nextIndex = currentIndex - 1;
      return nextIndex >= 0 ? this.CORRIDOR_STATIONS[nextIndex].eva : null;
    }
  }

  /**
   * Gets all stations between two points on the corridor
   * @param fromEva Starting station EVA
   * @param toEva Ending station EVA
   * @returns Array of station EVAs in order
   */
  public getStationsBetween(fromEva: number, toEva: number): number[] {
    const fromIndex = this.CORRIDOR_STATIONS.findIndex(s => s.eva === fromEva);
    const toIndex = this.CORRIDOR_STATIONS.findIndex(s => s.eva === toEva);
    
    if (fromIndex === -1 || toIndex === -1) return [];

    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    return this.CORRIDOR_STATIONS
      .slice(startIndex, endIndex + 1)
      .map(s => s.eva);
  }

  /**
   * Determines if a station is a strategic hub based on its position and characteristics
   * @param eva Station EVA number
   * @returns True if station is considered strategic
   */
  public isStrategicHub(eva: number): boolean {
    // Strategic hubs are major terminals and key intermediate stations
    const strategicHubs = [
      8011160, // Berlin Hbf - major terminal
      8002549, // Hamburg Hbf - major terminal
      8010310, // Stendal - major intermediate junction
      8000152  // Lüneburg - important regional hub
    ];
    
    return strategicHubs.includes(eva);
  }

  /**
   * Gets corridor statistics
   * @returns Corridor metadata
   */
  public getCorridorStats() {
    return {
      totalStations: this.CORRIDOR_STATIONS.length,
      totalDistance: 290, // km
      strategicHubs: this.CORRIDOR_STATIONS.filter(s => this.isStrategicHub(s.eva)).length,
      endpoints: {
        berlin: CORRIDOR_ENDPOINTS.BERLIN_EVA,
        hamburg: CORRIDOR_ENDPOINTS.HAMBURG_EVA
      }
    };
  }
}