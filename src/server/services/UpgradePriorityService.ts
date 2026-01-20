import { CorridorStation, UpgradePriorityMetrics, PriorityConfiguration } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { TimetableApiService } from './TimetableApiService';
import { PriorityConfigService } from './PriorityConfigService';
import { Logger } from '../utils/Logger';

/**
 * Service for calculating station upgrade priorities along the Berlin-Hamburg corridor
 */
export class UpgradePriorityService {
  private db: DatabaseService;
  private timetableService: TimetableApiService;
  private priorityConfigService: PriorityConfigService;
  private logger = Logger.getInstance();

  constructor(
    databaseService: DatabaseService, 
    timetableService: TimetableApiService,
    priorityConfigService?: PriorityConfigService
  ) {
    this.db = databaseService;
    this.timetableService = timetableService;
    this.priorityConfigService = priorityConfigService || new PriorityConfigService(databaseService);
  }

  /**
   * Calculates upgrade priority for a single station with user configuration
   */
  async calculateStationPriority(
    station: CorridorStation, 
    userId: string = 'default',
    configName: string = 'balanced'
  ): Promise<UpgradePriorityMetrics> {
    try {
      this.logger.info(`Calculating upgrade priority for station ${station.name} (EVA: ${station.eva})`);

      // Get user's priority configuration
      const config = await this.priorityConfigService.getConfiguration(userId, configName) ||
                     this.priorityConfigService.getDefaultConfiguration();

      // Get current date for timetable analysis
      const today = new Date();
      const dateStr = this.formatDate(today);

      // Calculate individual metrics
      const trafficVolume = await this.calculateTrafficVolumeScore(station.eva, dateStr);
      const capacityConstraints = this.calculateCapacityConstraints(station);
      const strategicImportance = this.calculateStrategicImportance(station);
      const facilityDeficits = this.calculateFacilityDeficits(station);

      // Calculate weighted composite score
      const compositeScore = this.calculateCompositeScore(
        { trafficVolume, capacityConstraints, strategicImportance, facilityDeficits },
        config
      );

      const metrics: UpgradePriorityMetrics = {
        trafficVolume,
        capacityConstraints,
        strategicImportance,
        facilityDeficits,
        compositeScore
      };

      // Store results in database
      await this.storePriorityMetrics(station.eva, metrics);

      return metrics;
    } catch (error) {
      this.logger.error(`Error calculating priority for station ${station.eva}:`, error);
      throw new Error(`Failed to calculate priority for station ${station.eva}`);
    }
  }

  /**
   * Calculates upgrade priorities for all corridor stations with user configuration
   */
  async calculateAllStationPriorities(
    stations: CorridorStation[],
    userId: string = 'default',
    configName: string = 'balanced'
  ): Promise<Map<number, UpgradePriorityMetrics>> {
    const results = new Map<number, UpgradePriorityMetrics>();

    this.logger.info(`Calculating upgrade priorities for ${stations.length} corridor stations`);

    // Get user's priority configuration once
    const config = await this.priorityConfigService.getConfiguration(userId, configName) ||
                   this.priorityConfigService.getDefaultConfiguration();

    for (const station of stations) {
      try {
        const metrics = await this.calculateStationPriorityWithConfig(station, config);
        results.set(station.eva, metrics);
        
        // Rate limiting to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(`Failed to calculate priority for station ${station.eva}, skipping`);
      }
    }

    return results;
  }

  /**
   * Helper method to calculate station priority with a given configuration
   */
  private async calculateStationPriorityWithConfig(
    station: CorridorStation, 
    config: PriorityConfiguration
  ): Promise<UpgradePriorityMetrics> {
    // Get current date for timetable analysis
    const today = new Date();
    const dateStr = this.formatDate(today);

    // Calculate individual metrics
    const trafficVolume = await this.calculateTrafficVolumeScore(station.eva, dateStr);
    const capacityConstraints = this.calculateCapacityConstraints(station);
    const strategicImportance = this.calculateStrategicImportance(station);
    const facilityDeficits = this.calculateFacilityDeficits(station);

    // Calculate weighted composite score
    const compositeScore = this.calculateCompositeScore(
      { trafficVolume, capacityConstraints, strategicImportance, facilityDeficits },
      config
    );

    const metrics: UpgradePriorityMetrics = {
      trafficVolume,
      capacityConstraints,
      strategicImportance,
      facilityDeficits,
      compositeScore
    };

    // Store results in database
    await this.storePriorityMetrics(station.eva, metrics);

    return metrics;
  }

  /**
   * Gets stations ranked by upgrade priority with recommendations using user configuration
   */
  async getRankedStationsWithRecommendations(
    userId: string = 'default',
    configName: string = 'balanced',
    limit?: number
  ): Promise<Array<{ 
    eva: number; 
    name: string; 
    priority: number; 
    priorityLevel: 'low' | 'medium' | 'high';
    metrics: UpgradePriorityMetrics;
    recommendations: string[];
    estimatedCost: string;
    expectedImpact: string;
    timeline: string;
  }>> {
    try {
      const rankedStations = await this.getRankedStations(userId, configName, limit);
      const recommendationService = new (await import('./RecommendationService')).RecommendationService();
      
      return rankedStations.map((station: any) => {
        const priorityLevel = this.getPriorityLevel(station.priority);
        const recommendations = recommendationService.generateStationRecommendations(
          { eva: station.eva, name: station.name } as CorridorStation,
          station.metrics
        );
        
        const costCategory = recommendationService.estimateImplementationCost(
          { eva: station.eva, name: station.name } as CorridorStation,
          station.metrics
        );
        
        const impactCategory = recommendationService.estimateExpectedImpact(
          { eva: station.eva, name: station.name } as CorridorStation,
          station.metrics
        );
        
        const timeline = recommendationService.generateImplementationTimeline(
          station.metrics,
          costCategory
        );

        return {
          ...station,
          priorityLevel,
          recommendations,
          estimatedCost: this.formatCostCategory(costCategory),
          expectedImpact: this.formatImpactCategory(impactCategory),
          timeline
        };
      });
    } catch (error) {
      this.logger.error('Error getting ranked stations with recommendations:', error);
      throw new Error('Failed to get ranked stations with recommendations');
    }
  }

  /**
   * Gets critical stations that exceed priority thresholds using user configuration
   */
  async getCriticalStations(
    userId: string = 'default',
    configName: string = 'balanced',
    threshold: number = 75
  ): Promise<Array<{ eva: number; name: string; priority: number; urgencyLevel: string }>> {
    try {
      const query = `
        SELECT 
          cs.eva,
          cs.name,
          sup.upgrade_priority_score
        FROM corridor_stations cs
        JOIN station_upgrade_priorities sup ON cs.eva = sup.eva
        WHERE sup.analysis_date = CURRENT_DATE
          AND sup.upgrade_priority_score >= $1
        ORDER BY sup.upgrade_priority_score DESC
      `;

      const result = await this.db.query(query, [threshold]);
      
      return result.rows.map((row: any) => ({
        eva: row.eva,
        name: row.name,
        priority: row.upgrade_priority_score,
        urgencyLevel: this.getUrgencyLevel(row.upgrade_priority_score)
      }));
    } catch (error) {
      this.logger.error('Error getting critical stations:', error);
      throw new Error('Failed to get critical stations');
    }
  }

  /**
   * Gets priority level based on score
   */
  private getPriorityLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Gets urgency level based on score
   */
  private getUrgencyLevel(score: number): string {
    if (score >= 90) return 'Critical - Immediate action required';
    if (score >= 80) return 'High - Action needed within 6 months';
    if (score >= 75) return 'Elevated - Action needed within 12 months';
    return 'Moderate - Monitor closely';
  }

  /**
   * Formats cost category for display
   */
  private formatCostCategory(category: 'low' | 'medium' | 'high' | 'very_high'): string {
    const costLabels = {
      low: '€50K-200K',
      medium: '€200K-1M',
      high: '€1M-5M',
      very_high: '€5M+'
    };
    return costLabels[category];
  }

  /**
   * Formats impact category for display
   */
  private formatImpactCategory(category: 'low' | 'medium' | 'high' | 'very_high'): string {
    const impactLabels = {
      low: 'Limited corridor impact',
      medium: 'Moderate corridor improvement',
      high: 'Significant corridor enhancement',
      very_high: 'Major corridor transformation'
    };
    return impactLabels[category];
  }

  /**
   * Calculates traffic volume score (0-100)
   */
  private async calculateTrafficVolumeScore(eva: number, date: string): Promise<number> {
    try {
      const dailyTraffic = await this.timetableService.getDailyTrafficVolume(eva, date);
      
      // Normalize traffic volume to 0-100 scale
      // Based on typical German railway station traffic patterns
      const maxExpectedTraffic = 500; // High-volume station threshold
      const minExpectedTraffic = 10;  // Low-volume station threshold
      
      const normalizedScore = Math.min(
        100,
        Math.max(
          0,
          ((dailyTraffic - minExpectedTraffic) / (maxExpectedTraffic - minExpectedTraffic)) * 100
        )
      );

      this.logger.debug(`Traffic volume for EVA ${eva}: ${dailyTraffic} stops/day, score: ${normalizedScore}`);
      return Math.round(normalizedScore);
    } catch (error) {
      this.logger.warn(`Could not get traffic volume for EVA ${eva}, using default score`);
      return 50; // Default moderate score
    }
  }

  /**
   * Calculates capacity constraints score (0-100)
   */
  private calculateCapacityConstraints(station: CorridorStation): number {
    let constraintScore = 0;

    // Platform capacity assessment
    const platformScore = this.assessPlatformCapacity(station.platforms, station.category);
    constraintScore += platformScore * 0.6; // 60% weight for platforms

    // Facility capacity assessment
    const facilityScore = this.assessFacilityCapacity(station);
    constraintScore += facilityScore * 0.4; // 40% weight for facilities

    this.logger.debug(`Capacity constraints for ${station.name}: platforms=${platformScore}, facilities=${facilityScore}, total=${constraintScore}`);
    return Math.round(constraintScore);
  }

  /**
   * Assesses platform capacity relative to station category
   */
  private assessPlatformCapacity(platforms: number, category: number): number {
    // Expected platform counts by category
    const expectedPlatforms: { [key: number]: number } = {
      1: 12, // Major stations
      2: 8,  // Important stations
      3: 6,  // Regional stations
      4: 4,  // Local stations
      5: 2,  // Small stations
      6: 2,  // Halt points
      7: 1   // Basic stops
    };

    const expected = expectedPlatforms[category] || 2;
    const ratio = platforms / expected;

    // Score increases as platform deficit increases
    if (ratio >= 1.0) return 0;   // Adequate platforms
    if (ratio >= 0.8) return 25;  // Slight deficit
    if (ratio >= 0.6) return 50;  // Moderate deficit
    if (ratio >= 0.4) return 75;  // Significant deficit
    return 100; // Severe deficit
  }

  /**
   * Assesses facility capacity and modernization needs
   */
  private assessFacilityCapacity(station: CorridorStation): number {
    let deficitScore = 0;
    const facilities = station.facilities;

    // Essential facilities for different station categories
    if (station.category <= 2) {
      // Major/Important stations should have comprehensive facilities
      if (!facilities.hasWiFi) deficitScore += 15;
      if (!facilities.hasTravelCenter) deficitScore += 20;
      if (!facilities.hasDBLounge) deficitScore += 10;
      if (!facilities.hasLocalPublicTransport) deficitScore += 15;
      if (!facilities.hasParking) deficitScore += 10;
      if (facilities.steplessAccess !== 'yes') deficitScore += 20;
      if (!facilities.hasMobilityService) deficitScore += 10;
    } else if (station.category <= 4) {
      // Regional/Local stations need basic facilities
      if (!facilities.hasWiFi) deficitScore += 20;
      if (!facilities.hasLocalPublicTransport) deficitScore += 25;
      if (!facilities.hasParking) deficitScore += 15;
      if (facilities.steplessAccess === 'no') deficitScore += 30;
      if (!facilities.hasMobilityService) deficitScore += 10;
    } else {
      // Small stations need minimal facilities
      if (facilities.steplessAccess === 'no') deficitScore += 40;
      if (!facilities.hasParking) deficitScore += 30;
      if (!facilities.hasLocalPublicTransport) deficitScore += 30;
    }

    return Math.min(100, deficitScore);
  }

  /**
   * Calculates strategic importance score (0-100)
   */
  private calculateStrategicImportance(station: CorridorStation): number {
    let importanceScore = 0;

    // Category-based importance
    const categoryScore = this.getCategoryImportance(station.category);
    importanceScore += categoryScore * 0.4; // 40% weight

    // Corridor position importance
    const positionScore = this.getCorridorPositionImportance(station.distanceFromBerlin);
    importanceScore += positionScore * 0.3; // 30% weight

    // Hub status importance
    const hubScore = station.isStrategicHub ? 30 : 0;
    importanceScore += hubScore * 0.3; // 30% weight

    this.logger.debug(`Strategic importance for ${station.name}: category=${categoryScore}, position=${positionScore}, hub=${hubScore}, total=${importanceScore}`);
    return Math.round(importanceScore);
  }

  /**
   * Gets importance score based on station category
   */
  private getCategoryImportance(category: number): number {
    const categoryScores: { [key: number]: number } = {
      1: 100, // Major stations - highest importance
      2: 80,  // Important stations
      3: 60,  // Regional stations
      4: 40,  // Local stations
      5: 20,  // Small stations
      6: 10,  // Halt points
      7: 5    // Basic stops
    };
    return categoryScores[category] || 0;
  }

  /**
   * Gets importance score based on corridor position
   */
  private getCorridorPositionImportance(distanceFromBerlin: number): number {
    // Strategic positions along the corridor
    if (distanceFromBerlin === 0 || distanceFromBerlin >= 289) return 100; // Endpoints
    if (distanceFromBerlin <= 50 || distanceFromBerlin >= 240) return 80;  // Near endpoints
    if (distanceFromBerlin >= 140 && distanceFromBerlin <= 150) return 70; // Mid-corridor hub
    return 50; // Standard corridor position
  }

  /**
   * Calculates facility deficits score (0-100)
   */
  private calculateFacilityDeficits(station: CorridorStation): number {
    // This is the same as facility capacity assessment
    return this.assessFacilityCapacity(station);
  }

  /**
   * Calculates weighted composite score
   */
  private calculateCompositeScore(
    metrics: Omit<UpgradePriorityMetrics, 'compositeScore'>,
    config: PriorityConfiguration
  ): number {
    // Adjust weights based on focus area
    let weights = { ...config };
    
    switch (config.focusArea) {
      case 'infrastructure':
        weights = { infrastructureWeight: 0.6, timetableWeight: 0.2, populationRiskWeight: 0.2, focusArea: 'infrastructure' };
        break;
      case 'timetable':
        weights = { infrastructureWeight: 0.2, timetableWeight: 0.6, populationRiskWeight: 0.2, focusArea: 'timetable' };
        break;
      case 'population':
        weights = { infrastructureWeight: 0.2, timetableWeight: 0.2, populationRiskWeight: 0.6, focusArea: 'population' };
        break;
    }

    // Calculate weighted score
    const score = 
      (metrics.trafficVolume * weights.infrastructureWeight * 0.3) +
      (metrics.capacityConstraints * weights.infrastructureWeight * 0.7) +
      (metrics.strategicImportance * weights.timetableWeight) +
      (metrics.facilityDeficits * weights.populationRiskWeight);

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Stores priority metrics in database
   */
  private async storePriorityMetrics(eva: number, metrics: UpgradePriorityMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO station_upgrade_priorities 
        (eva, analysis_date, traffic_volume, capacity_constraints, strategic_importance, facility_deficits, upgrade_priority_score)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
        ON CONFLICT (eva, analysis_date) DO UPDATE SET
          traffic_volume = EXCLUDED.traffic_volume,
          capacity_constraints = EXCLUDED.capacity_constraints,
          strategic_importance = EXCLUDED.strategic_importance,
          facility_deficits = EXCLUDED.facility_deficits,
          upgrade_priority_score = EXCLUDED.upgrade_priority_score
      `;

      await this.db.query(query, [
        eva,
        metrics.trafficVolume,
        metrics.capacityConstraints,
        metrics.strategicImportance,
        metrics.facilityDeficits,
        metrics.compositeScore
      ]);

      this.logger.debug(`Stored priority metrics for EVA ${eva}`);
    } catch (error) {
      this.logger.error(`Error storing priority metrics for EVA ${eva}:`, error);
      throw error;
    }
  }

  /**
   * Formats date for API calls
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Gets stations ranked by upgrade priority (base method) using user configuration
   */
  async getRankedStations(
    userId: string = 'default',
    configName: string = 'balanced',
    limit?: number
  ): Promise<Array<{ eva: number; name: string; priority: number; metrics: UpgradePriorityMetrics }>> {
    try {
      const query = `
        SELECT 
          cs.eva,
          cs.name,
          sup.traffic_volume,
          sup.capacity_constraints,
          sup.strategic_importance,
          sup.facility_deficits,
          sup.upgrade_priority_score
        FROM corridor_stations cs
        JOIN station_upgrade_priorities sup ON cs.eva = sup.eva
        WHERE sup.analysis_date = CURRENT_DATE
        ORDER BY sup.upgrade_priority_score DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;

      const result = await this.db.query(query);
      
      return result.rows.map((row: any) => ({
        eva: row.eva,
        name: row.name,
        priority: row.upgrade_priority_score,
        metrics: {
          trafficVolume: row.traffic_volume,
          capacityConstraints: row.capacity_constraints,
          strategicImportance: row.strategic_importance,
          facilityDeficits: row.facility_deficits,
          compositeScore: row.upgrade_priority_score
        }
      }));
    } catch (error) {
      this.logger.error('Error getting ranked stations:', error);
      throw new Error('Failed to get ranked stations');
    }
  }
}