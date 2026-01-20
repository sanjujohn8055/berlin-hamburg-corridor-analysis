import { PriorityConfiguration, CorridorStation, UpgradePriorityMetrics } from '../../shared/types';
import { PriorityConfigService } from './PriorityConfigService';
import { UpgradePriorityService } from './UpgradePriorityService';
import { DatabaseService } from './DatabaseService';
import { TimetableApiService } from './TimetableApiService';
import { Logger } from '../utils/Logger';

/**
 * Priority Engine Service - Orchestrates real-time priority recalculation
 * This service implements the core requirement for real-time recalculation when priorities change
 */
export class PriorityEngineService {
  private priorityConfigService: PriorityConfigService;
  private upgradePriorityService: UpgradePriorityService;
  private logger = Logger.getInstance();

  constructor(
    databaseService: DatabaseService,
    timetableService: TimetableApiService
  ) {
    this.priorityConfigService = new PriorityConfigService(databaseService);
    this.upgradePriorityService = new UpgradePriorityService(
      databaseService, 
      timetableService, 
      this.priorityConfigService
    );

    // Register real-time recalculation callback
    this.priorityConfigService.registerRecalculationCallback(
      this.handlePriorityConfigurationChange.bind(this)
    );

    this.logger.info('Priority Engine Service initialized with real-time recalculation');
  }

  /**
   * Handles priority configuration changes with real-time recalculation
   */
  private async handlePriorityConfigurationChange(
    userId: string,
    configName: string,
    config: PriorityConfiguration
  ): Promise<void> {
    try {
      this.logger.info(`Processing priority configuration change for user ${userId}, config ${configName}`);

      // Get all corridor stations
      const stations = await this.getAllCorridorStations();
      
      if (stations.length === 0) {
        this.logger.warn('No corridor stations found for recalculation');
        return;
      }

      // Recalculate priorities for all stations with new configuration
      const recalculationResults = await this.upgradePriorityService.calculateAllStationPriorities(
        stations,
        userId,
        configName
      );

      this.logger.info(`Real-time recalculation completed: ${recalculationResults.size} stations updated`);

      // Log significant priority changes
      await this.logPriorityChanges(userId, configName, recalculationResults);

    } catch (error) {
      this.logger.error(`Error in real-time priority recalculation:`, error);
      throw error;
    }
  }

  /**
   * Updates user priority configuration and triggers real-time recalculation
   */
  async updatePriorityConfiguration(
    userId: string,
    configName: string,
    config: PriorityConfiguration
  ): Promise<{
    success: boolean;
    recalculatedStations: number;
    significantChanges: Array<{
      eva: number;
      name: string;
      oldPriority: number;
      newPriority: number;
      change: number;
    }>;
  }> {
    try {
      this.logger.info(`Updating priority configuration ${configName} for user ${userId}`);

      // Get current priorities before change
      const stationsBefore = await this.getStationsWithCurrentPriorities();
      
      // Save new configuration (this will trigger real-time recalculation)
      await this.priorityConfigService.saveConfiguration(userId, configName, config);

      // Get priorities after change
      const stationsAfter = await this.getStationsWithCurrentPriorities();

      // Calculate significant changes (>= 5 point difference)
      const significantChanges = this.calculateSignificantChanges(stationsBefore, stationsAfter);

      return {
        success: true,
        recalculatedStations: stationsAfter.length,
        significantChanges
      };

    } catch (error) {
      this.logger.error(`Error updating priority configuration:`, error);
      return {
        success: false,
        recalculatedStations: 0,
        significantChanges: []
      };
    }
  }

  /**
   * Gets real-time analysis results with current user configuration
   */
  async getRealTimeAnalysis(
    userId: string = 'default',
    configName: string = 'balanced'
  ): Promise<{
    configuration: PriorityConfiguration;
    topPriorities: Array<{
      eva: number;
      name: string;
      priority: number;
      priorityLevel: 'low' | 'medium' | 'high';
      focusAreaImpact: {
        infrastructure: number;
        timetable: number;
        populationRisk: number;
      };
    }>;
    configurationImpact: {
      averagePriorityChange: number;
      stationsAffected: number;
      focusAreaDistribution: {
        infrastructure: number;
        timetable: number;
        populationRisk: number;
      };
    };
  }> {
    try {
      // Get current configuration
      const config = await this.priorityConfigService.getConfiguration(userId, configName) ||
                     this.priorityConfigService.getDefaultConfiguration();

      // Get top priority stations with current configuration
      const rankedStations = await this.upgradePriorityService.getRankedStations(userId, configName, 10);

      // Calculate focus area impacts for each station
      const topPriorities = await Promise.all(
        rankedStations.map(async (station) => {
          const focusAreaImpact = await this.calculateFocusAreaImpact(station.eva, config);
          return {
            eva: station.eva,
            name: station.name,
            priority: station.priority,
            priorityLevel: this.getPriorityLevel(station.priority),
            focusAreaImpact
          };
        })
      );

      // Calculate configuration impact
      const configurationImpact = await this.calculateConfigurationImpact(config);

      return {
        configuration: config,
        topPriorities,
        configurationImpact
      };

    } catch (error) {
      this.logger.error('Error getting real-time analysis:', error);
      throw new Error('Failed to get real-time analysis');
    }
  }

  /**
   * Applies focus area changes and shows immediate impact
   */
  async applyFocusAreaChange(
    userId: string,
    newFocusArea: 'infrastructure' | 'timetable' | 'population' | 'balanced'
  ): Promise<{
    oldConfiguration: PriorityConfiguration;
    newConfiguration: PriorityConfiguration;
    impactPreview: Array<{
      eva: number;
      name: string;
      currentPriority: number;
      projectedPriority: number;
      change: number;
      changeDirection: 'increase' | 'decrease' | 'minimal';
    }>;
  }> {
    try {
      // Get current configuration
      const oldConfig = await this.priorityConfigService.getConfiguration(userId, 'current') ||
                        this.priorityConfigService.getDefaultConfiguration();

      // Create new configuration based on focus area
      const newConfig = await this.priorityConfigService.createFocusConfiguration(
        userId,
        'preview',
        newFocusArea
      );

      // Get current station priorities
      const currentStations = await this.getStationsWithCurrentPriorities();

      // Calculate projected priorities with new configuration
      const impactPreview = await Promise.all(
        currentStations.slice(0, 15).map(async (station) => {
          const projectedMetrics = await this.calculateProjectedPriority(station, newConfig);
          const change = projectedMetrics.compositeScore - station.priority;
          
          return {
            eva: station.eva,
            name: station.name,
            currentPriority: station.priority,
            projectedPriority: projectedMetrics.compositeScore,
            change: Math.round(change),
            changeDirection: Math.abs(change) < 2 ? 'minimal' as const : (change > 0 ? 'increase' as const : 'decrease' as const)
          };
        })
      );

      return {
        oldConfiguration: oldConfig,
        newConfiguration: newConfig,
        impactPreview: impactPreview.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      };

    } catch (error) {
      this.logger.error('Error applying focus area change:', error);
      throw new Error('Failed to apply focus area change');
    }
  }

  /**
   * Gets all corridor stations from database
   */
  private async getAllCorridorStations(): Promise<CorridorStation[]> {
    const query = `
      SELECT eva, name, ST_X(coordinates) as longitude, ST_Y(coordinates) as latitude,
             distance_from_berlin, category, platform_count, facilities, is_strategic_hub
      FROM corridor_stations
      ORDER BY distance_from_berlin
    `;

    const result = await this.upgradePriorityService['db'].query(query);
    return result.rows.map((row: any) => ({
      eva: row.eva,
      name: row.name,
      coordinates: [row.longitude, row.latitude],
      distanceFromBerlin: row.distance_from_berlin,
      category: row.category,
      platforms: row.platform_count,
      facilities: row.facilities,
      upgradePriority: 0,
      isStrategicHub: row.is_strategic_hub
    }));
  }

  /**
   * Gets stations with their current priority scores
   */
  private async getStationsWithCurrentPriorities(): Promise<Array<{
    eva: number;
    name: string;
    priority: number;
  }>> {
    const query = `
      SELECT cs.eva, cs.name, COALESCE(sup.upgrade_priority_score, 0) as priority
      FROM corridor_stations cs
      LEFT JOIN station_upgrade_priorities sup ON cs.eva = sup.eva AND sup.analysis_date = CURRENT_DATE
      ORDER BY cs.distance_from_berlin
    `;

    const result = await this.upgradePriorityService['db'].query(query);
    return result.rows.map((row: any) => ({
      eva: row.eva,
      name: row.name,
      priority: row.priority
    }));
  }

  /**
   * Calculates significant priority changes between before and after
   */
  private calculateSignificantChanges(
    before: Array<{ eva: number; name: string; priority: number }>,
    after: Array<{ eva: number; name: string; priority: number }>
  ): Array<{ eva: number; name: string; oldPriority: number; newPriority: number; change: number }> {
    const beforeMap = new Map(before.map(s => [s.eva, s]));
    const changes: Array<{ eva: number; name: string; oldPriority: number; newPriority: number; change: number }> = [];

    for (const afterStation of after) {
      const beforeStation = beforeMap.get(afterStation.eva);
      if (beforeStation) {
        const change = afterStation.priority - beforeStation.priority;
        if (Math.abs(change) >= 5) { // Significant change threshold
          changes.push({
            eva: afterStation.eva,
            name: afterStation.name,
            oldPriority: beforeStation.priority,
            newPriority: afterStation.priority,
            change: Math.round(change)
          });
        }
      }
    }

    return changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  /**
   * Logs priority changes for audit purposes
   */
  private async logPriorityChanges(
    userId: string,
    configName: string,
    results: Map<number, UpgradePriorityMetrics>
  ): Promise<void> {
    const changesCount = results.size;
    const avgPriority = Array.from(results.values())
      .reduce((sum, metrics) => sum + metrics.compositeScore, 0) / changesCount;

    this.logger.info(`Priority recalculation summary for ${userId}/${configName}:`, {
      stationsRecalculated: changesCount,
      averagePriority: Math.round(avgPriority),
      highPriorityStations: Array.from(results.values()).filter(m => m.compositeScore >= 75).length
    });
  }

  /**
   * Calculates focus area impact for a station
   */
  private async calculateFocusAreaImpact(
    eva: number,
    config: PriorityConfiguration
  ): Promise<{ infrastructure: number; timetable: number; populationRisk: number }> {
    // This is a simplified calculation - in practice, you'd want more sophisticated analysis
    return {
      infrastructure: Math.round(config.infrastructureWeight * 100),
      timetable: Math.round(config.timetableWeight * 100),
      populationRisk: Math.round(config.populationRiskWeight * 100)
    };
  }

  /**
   * Calculates overall configuration impact
   */
  private async calculateConfigurationImpact(config: PriorityConfiguration): Promise<{
    averagePriorityChange: number;
    stationsAffected: number;
    focusAreaDistribution: { infrastructure: number; timetable: number; populationRisk: number };
  }> {
    // Simplified calculation - would be more complex in practice
    return {
      averagePriorityChange: 0, // Would calculate based on historical data
      stationsAffected: 0, // Would calculate based on actual changes
      focusAreaDistribution: {
        infrastructure: Math.round(config.infrastructureWeight * 100),
        timetable: Math.round(config.timetableWeight * 100),
        populationRisk: Math.round(config.populationRiskWeight * 100)
      }
    };
  }

  /**
   * Calculates projected priority for a station with new configuration
   */
  private async calculateProjectedPriority(
    station: { eva: number; name: string; priority: number },
    config: PriorityConfiguration
  ): Promise<UpgradePriorityMetrics> {
    // Get full station data
    const fullStation = await this.getStationByEva(station.eva);
    if (!fullStation) {
      throw new Error(`Station ${station.eva} not found`);
    }

    // Calculate with new configuration
    return await this.upgradePriorityService['calculateStationPriorityWithConfig'](fullStation, config);
  }

  /**
   * Gets full station data by EVA
   */
  private async getStationByEva(eva: number): Promise<CorridorStation | null> {
    const query = `
      SELECT eva, name, ST_X(coordinates) as longitude, ST_Y(coordinates) as latitude,
             distance_from_berlin, category, platform_count, facilities, is_strategic_hub
      FROM corridor_stations
      WHERE eva = $1
    `;

    const result = await this.upgradePriorityService['db'].query(query, [eva]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      eva: row.eva,
      name: row.name,
      coordinates: [row.longitude, row.latitude],
      distanceFromBerlin: row.distance_from_berlin,
      category: row.category,
      platforms: row.platform_count,
      facilities: row.facilities,
      upgradePriority: 0,
      isStrategicHub: row.is_strategic_hub
    };
  }

  /**
   * Gets priority level from score
   */
  private getPriorityLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Gets the priority configuration service instance
   */
  getPriorityConfigService(): PriorityConfigService {
    return this.priorityConfigService;
  }

  /**
   * Gets the upgrade priority service instance
   */
  getUpgradePriorityService(): UpgradePriorityService {
    return this.upgradePriorityService;
  }
}