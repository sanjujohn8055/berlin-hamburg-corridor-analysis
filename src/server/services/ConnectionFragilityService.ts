import { ConnectionFragility, CorridorStation } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { TimetableApiService } from './TimetableApiService';
import { Logger } from '../utils/Logger';

/**
 * Service for analyzing timetable connection fragility along the Berlin-Hamburg corridor
 */
export class ConnectionFragilityService {
  private db: DatabaseService;
  private timetableService: TimetableApiService;
  private logger = Logger.getInstance();

  // Fragility thresholds (in minutes)
  private readonly BUFFER_TIME_THRESHOLDS = {
    CRITICAL: 5,    // < 5 minutes buffer is critical
    HIGH: 10,       // 5-10 minutes is high risk
    MEDIUM: 15,     // 10-15 minutes is medium risk
    LOW: 20         // > 20 minutes is low risk
  };

  // Connection importance weights
  private readonly CONNECTION_WEIGHTS = {
    INTERCITY: 1.0,      // IC/ICE connections are most important
    REGIONAL: 0.7,       // Regional connections are important
    LOCAL: 0.4           // Local connections are less critical
  };

  constructor(databaseService: DatabaseService, timetableService: TimetableApiService) {
    this.db = databaseService;
    this.timetableService = timetableService;
  }

  /**
   * Analyzes connection fragility for all corridor connections
   */
  async analyzeCorridorConnectionFragility(): Promise<ConnectionFragility[]> {
    try {
      this.logger.info('Starting corridor connection fragility analysis');

      // Get all corridor stations
      const stations = await this.getCorridorStations();
      
      // Get timetable connections between corridor stations
      const connections = await this.getTimetableConnections(stations);
      
      // Analyze fragility for each connection
      const fragilityAnalysis: ConnectionFragility[] = [];
      
      for (const connection of connections) {
        const fragility = await this.analyzeConnectionFragility(connection);
        if (fragility) {
          fragilityAnalysis.push(fragility);
        }
      }

      // Store results in database
      await this.storeFragilityAnalysis(fragilityAnalysis);

      this.logger.info(`Completed fragility analysis for ${fragilityAnalysis.length} connections`);
      return fragilityAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing corridor connection fragility:', error);
      throw new Error('Failed to analyze connection fragility');
    }
  }

  /**
   * Analyzes fragility for a specific connection
   */
  async analyzeConnectionFragility(connection: {
    fromStation: number;
    toStation: number;
    arrivalTime: string;
    departureTime: string;
    trainType: string;
    bufferTime: number;
  }): Promise<ConnectionFragility | null> {
    try {
      // Calculate base fragility score based on buffer time
      const bufferFragilityScore = this.calculateBufferFragilityScore(connection.bufferTime);
      
      // Calculate cascade risk based on downstream connections
      const cascadeRisk = await this.calculateCascadeRisk(connection);
      
      // Count alternative routes
      const alternativeRoutes = await this.countAlternativeRoutes(
        connection.fromStation, 
        connection.toStation
      );
      
      // Calculate connection importance weight
      const importanceWeight = this.getConnectionImportanceWeight(connection.trainType);
      
      // Calculate composite fragility score (0-100)
      const fragilityScore = Math.min(100, Math.round(
        (bufferFragilityScore * 0.4 + cascadeRisk * 0.4 + (100 - alternativeRoutes * 10) * 0.2) * importanceWeight
      ));

      // Generate recommendations
      const recommendations = this.generateFragilityRecommendations(
        connection, 
        fragilityScore, 
        bufferFragilityScore, 
        cascadeRisk, 
        alternativeRoutes
      );

      return {
        fromStation: connection.fromStation,
        toStation: connection.toStation,
        bufferTime: connection.bufferTime,
        fragilityScore,
        cascadeRisk,
        alternativeRoutes,
        recommendations
      };
    } catch (error) {
      this.logger.error(`Error analyzing connection fragility for ${connection.fromStation}-${connection.toStation}:`, error);
      return null;
    }
  }

  /**
   * Calculates fragility score based on buffer time
   */
  private calculateBufferFragilityScore(bufferTime: number): number {
    if (bufferTime < this.BUFFER_TIME_THRESHOLDS.CRITICAL) {
      return 100; // Critical - very high fragility
    } else if (bufferTime < this.BUFFER_TIME_THRESHOLDS.HIGH) {
      return 80;  // High fragility
    } else if (bufferTime < this.BUFFER_TIME_THRESHOLDS.MEDIUM) {
      return 60;  // Medium fragility
    } else if (bufferTime < this.BUFFER_TIME_THRESHOLDS.LOW) {
      return 40;  // Low fragility
    } else {
      return 20;  // Very low fragility
    }
  }

  /**
   * Calculates cascade delay risk for a connection
   */
  private async calculateCascadeRisk(connection: {
    fromStation: number;
    toStation: number;
    arrivalTime: string;
    departureTime: string;
  }): Promise<number> {
    try {
      // Get downstream connections from the destination station
      const downstreamConnections = await this.getDownstreamConnections(
        connection.toStation, 
        connection.arrivalTime
      );

      if (downstreamConnections.length === 0) {
        return 20; // Low cascade risk if no downstream connections
      }

      // Calculate risk based on number and timing of downstream connections
      let totalRisk = 0;
      for (const downstream of downstreamConnections) {
        const timeDiff = this.calculateTimeDifference(connection.arrivalTime, downstream.departureTime);
        
        // Higher risk for connections with shorter time differences
        if (timeDiff < 30) {
          totalRisk += 80; // High cascade risk
        } else if (timeDiff < 60) {
          totalRisk += 60; // Medium cascade risk
        } else {
          totalRisk += 20; // Low cascade risk
        }
      }

      // Average the risk and cap at 100
      return Math.min(100, Math.round(totalRisk / downstreamConnections.length));
    } catch (error) {
      this.logger.error('Error calculating cascade risk:', error);
      return 50; // Default medium risk
    }
  }

  /**
   * Counts alternative routes between two stations
   */
  private async countAlternativeRoutes(fromStation: number, toStation: number): Promise<number> {
    try {
      // This is a simplified implementation - in a real system you'd analyze the network graph
      // For now, we'll estimate based on station importance and distance
      
      const fromStationInfo = await this.getStationInfo(fromStation);
      const toStationInfo = await this.getStationInfo(toStation);
      
      if (!fromStationInfo || !toStationInfo) {
        return 1; // Assume at least one route exists
      }

      // Major stations typically have more alternative routes
      let alternativeCount = 1; // Direct route
      
      if (fromStationInfo.category <= 2 && toStationInfo.category <= 2) {
        alternativeCount += 2; // Major stations have more alternatives
      } else if (fromStationInfo.category <= 4 || toStationInfo.category <= 4) {
        alternativeCount += 1; // Medium stations have some alternatives
      }

      // Distance factor - longer distances typically have more route options
      const distance = Math.abs(fromStationInfo.distanceFromBerlin - toStationInfo.distanceFromBerlin);
      if (distance > 100) {
        alternativeCount += 1;
      }

      return Math.min(5, alternativeCount); // Cap at 5 alternative routes
    } catch (error) {
      this.logger.error('Error counting alternative routes:', error);
      return 1; // Default to one route
    }
  }

  /**
   * Gets connection importance weight based on train type
   */
  private getConnectionImportanceWeight(trainType: string): number {
    const type = trainType.toLowerCase();
    
    if (type.includes('ice') || type.includes('ic')) {
      return this.CONNECTION_WEIGHTS.INTERCITY;
    } else if (type.includes('re') || type.includes('rb')) {
      return this.CONNECTION_WEIGHTS.REGIONAL;
    } else {
      return this.CONNECTION_WEIGHTS.LOCAL;
    }
  }

  /**
   * Generates recommendations for improving connection fragility
   */
  private generateFragilityRecommendations(
    connection: any,
    fragilityScore: number,
    bufferScore: number,
    cascadeRisk: number,
    alternativeRoutes: number
  ): string[] {
    const recommendations: string[] = [];

    // Buffer time recommendations
    if (bufferScore >= 80) {
      recommendations.push(`Increase buffer time to at least ${this.BUFFER_TIME_THRESHOLDS.MEDIUM} minutes`);
    } else if (bufferScore >= 60) {
      recommendations.push(`Consider increasing buffer time to ${this.BUFFER_TIME_THRESHOLDS.LOW} minutes for better reliability`);
    }

    // Cascade risk recommendations
    if (cascadeRisk >= 70) {
      recommendations.push('Implement delay management protocols for downstream connections');
      recommendations.push('Consider staggering departure times of connecting services');
    }

    // Alternative routes recommendations
    if (alternativeRoutes <= 1) {
      recommendations.push('Develop alternative routing options for service disruptions');
    }

    // Overall fragility recommendations
    if (fragilityScore >= 80) {
      recommendations.push('Priority connection requiring immediate timetable optimization');
    } else if (fragilityScore >= 60) {
      recommendations.push('Monitor connection performance and consider schedule adjustments');
    }

    return recommendations;
  }

  /**
   * Gets corridor stations from database
   */
  private async getCorridorStations(): Promise<CorridorStation[]> {
    const query = `
      SELECT eva, name, ST_X(coordinates) as longitude, ST_Y(coordinates) as latitude,
             distance_from_berlin, category, platform_count, facilities, is_strategic_hub
      FROM corridor_stations
      ORDER BY distance_from_berlin
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => ({
      eva: row.eva,
      name: row.name,
      coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
      distanceFromBerlin: row.distance_from_berlin,
      category: row.category,
      platforms: row.platform_count,
      facilities: row.facilities || {},
      upgradePriority: 0,
      isStrategicHub: row.is_strategic_hub
    }));
  }

  /**
   * Gets timetable connections between corridor stations
   */
  private async getTimetableConnections(stations: CorridorStation[]): Promise<any[]> {
    // This would integrate with the TimetableApiService to get real connections
    // For now, we'll create mock connections for development
    const connections = [];
    
    for (let i = 0; i < stations.length - 1; i++) {
      const fromStation = stations[i];
      const toStation = stations[i + 1];
      
      // Mock connection data
      connections.push({
        fromStation: fromStation.eva,
        toStation: toStation.eva,
        arrivalTime: '10:30',
        departureTime: '10:35',
        trainType: 'ICE',
        bufferTime: 5
      });
      
      connections.push({
        fromStation: fromStation.eva,
        toStation: toStation.eva,
        arrivalTime: '14:15',
        departureTime: '14:22',
        trainType: 'RE',
        bufferTime: 7
      });
    }
    
    return connections;
  }

  /**
   * Gets downstream connections from a station
   */
  private async getDownstreamConnections(stationEva: number, afterTime: string): Promise<any[]> {
    // Mock implementation - would query real timetable data
    return [
      { departureTime: '11:00', trainType: 'ICE' },
      { departureTime: '11:30', trainType: 'RE' }
    ];
  }

  /**
   * Gets station information
   */
  private async getStationInfo(eva: number): Promise<any> {
    const query = `
      SELECT eva, name, distance_from_berlin, category, is_strategic_hub
      FROM corridor_stations
      WHERE eva = $1
    `;

    const result = await this.db.query(query, [eva]);
    return result.rows[0] || null;
  }

  /**
   * Calculates time difference in minutes
   */
  private calculateTimeDifference(time1: string, time2: string): number {
    // Simple time difference calculation (would need proper date/time handling in production)
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    
    return Math.abs(minutes2 - minutes1);
  }

  /**
   * Stores fragility analysis results in database
   */
  private async storeFragilityAnalysis(fragilityData: ConnectionFragility[]): Promise<void> {
    try {
      const query = `
        INSERT INTO connection_fragility 
        (from_eva, to_eva, analysis_date, buffer_time, fragility_score, cascade_risk, alternative_routes, recommendations)
        VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
        ON CONFLICT (from_eva, to_eva, analysis_date) DO UPDATE SET
          buffer_time = EXCLUDED.buffer_time,
          fragility_score = EXCLUDED.fragility_score,
          cascade_risk = EXCLUDED.cascade_risk,
          alternative_routes = EXCLUDED.alternative_routes,
          recommendations = EXCLUDED.recommendations
      `;

      for (const fragility of fragilityData) {
        await this.db.query(query, [
          fragility.fromStation,
          fragility.toStation,
          fragility.bufferTime,
          fragility.fragilityScore,
          fragility.cascadeRisk,
          fragility.alternativeRoutes,
          JSON.stringify(fragility.recommendations)
        ]);
      }

      this.logger.debug(`Stored ${fragilityData.length} fragility analysis records`);
    } catch (error) {
      this.logger.error('Error storing fragility analysis:', error);
      throw new Error('Failed to store fragility analysis');
    }
  }

  /**
   * Gets fragility analysis for a specific date range
   */
  async getFragilityAnalysis(
    startDate?: string, 
    endDate?: string
  ): Promise<ConnectionFragility[]> {
    try {
      let query = `
        SELECT from_eva, to_eva, buffer_time, fragility_score, 
               cascade_risk, alternative_routes, recommendations, analysis_date
        FROM connection_fragility
      `;
      
      const params: any[] = [];
      
      if (startDate && endDate) {
        query += ' WHERE analysis_date BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE analysis_date >= $1';
        params.push(startDate);
      } else {
        query += ' WHERE analysis_date = CURRENT_DATE';
      }
      
      query += ' ORDER BY fragility_score DESC';

      const result = await this.db.query(query, params);
      
      return result.rows.map(row => ({
        fromStation: row.from_eva,
        toStation: row.to_eva,
        bufferTime: row.buffer_time,
        fragilityScore: row.fragility_score,
        cascadeRisk: row.cascade_risk,
        alternativeRoutes: row.alternative_routes,
        recommendations: JSON.parse(row.recommendations || '[]')
      }));
    } catch (error) {
      this.logger.error('Error getting fragility analysis:', error);
      throw new Error('Failed to get fragility analysis');
    }
  }

  /**
   * Gets the most fragile connections (top N by fragility score)
   */
  async getMostFragileConnections(limit: number = 10): Promise<ConnectionFragility[]> {
    try {
      const query = `
        SELECT cf.from_eva, cf.to_eva, cf.buffer_time, cf.fragility_score,
               cf.cascade_risk, cf.alternative_routes, cf.recommendations,
               cs1.name as from_station_name, cs2.name as to_station_name
        FROM connection_fragility cf
        JOIN corridor_stations cs1 ON cf.from_eva = cs1.eva
        JOIN corridor_stations cs2 ON cf.to_eva = cs2.eva
        WHERE cf.analysis_date = CURRENT_DATE
        ORDER BY cf.fragility_score DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);
      
      return result.rows.map(row => ({
        fromStation: row.from_eva,
        toStation: row.to_eva,
        bufferTime: row.buffer_time,
        fragilityScore: row.fragility_score,
        cascadeRisk: row.cascade_risk,
        alternativeRoutes: row.alternative_routes,
        recommendations: JSON.parse(row.recommendations || '[]')
      }));
    } catch (error) {
      this.logger.error('Error getting most fragile connections:', error);
      throw new Error('Failed to get most fragile connections');
    }
  }
}