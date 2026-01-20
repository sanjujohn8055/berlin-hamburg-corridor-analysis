import { PriorityConfiguration, CorridorStation } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { Logger } from '../utils/Logger';

/**
 * Service for managing user priority configurations for corridor analysis
 */
export class PriorityConfigService {
  private db: DatabaseService;
  private logger = Logger.getInstance();
  private recalculationCallbacks: Array<(userId: string, configName: string, config: PriorityConfiguration) => Promise<void>> = [];

  // Predefined configuration templates
  private readonly PRESET_CONFIGS: { [key: string]: PriorityConfiguration } = {
    balanced: {
      infrastructureWeight: 0.33,
      timetableWeight: 0.33,
      populationRiskWeight: 0.34,
      focusArea: 'balanced'
    },
    infrastructure_focus: {
      infrastructureWeight: 0.60,
      timetableWeight: 0.20,
      populationRiskWeight: 0.20,
      focusArea: 'infrastructure'
    },
    timetable_focus: {
      infrastructureWeight: 0.20,
      timetableWeight: 0.60,
      populationRiskWeight: 0.20,
      focusArea: 'timetable'
    },
    population_focus: {
      infrastructureWeight: 0.20,
      timetableWeight: 0.20,
      populationRiskWeight: 0.60,
      focusArea: 'population'
    }
  };

  constructor(databaseService: DatabaseService) {
    this.db = databaseService;
  }

  /**
   * Gets all available priority configurations for a user
   */
  async getUserConfigurations(userId: string): Promise<Array<{
    name: string;
    config: PriorityConfiguration;
    isPreset: boolean;
    createdAt: string;
  }>> {
    try {
      this.logger.info(`Getting priority configurations for user ${userId}`);

      // Get user's custom configurations
      const query = `
        SELECT config_name, infrastructure_weight, timetable_weight, 
               population_risk_weight, focus_area, created_at
        FROM priority_configurations
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [userId]);
      const userConfigs = result.rows.map((row: any) => ({
        name: row.config_name,
        config: {
          infrastructureWeight: parseFloat(row.infrastructure_weight),
          timetableWeight: parseFloat(row.timetable_weight),
          populationRiskWeight: parseFloat(row.population_risk_weight),
          focusArea: row.focus_area as 'infrastructure' | 'timetable' | 'population' | 'balanced'
        },
        isPreset: false,
        createdAt: row.created_at
      }));

      // Add preset configurations
      const presetConfigs = Object.entries(this.PRESET_CONFIGS).map(([name, config]) => ({
        name,
        config,
        isPreset: true,
        createdAt: '2024-01-01T00:00:00Z' // Default timestamp for presets
      }));

      return [...presetConfigs, ...userConfigs];
    } catch (error) {
      this.logger.error(`Error getting configurations for user ${userId}:`, error);
      throw new Error('Failed to get user configurations');
    }
  }

  /**
   * Gets a specific priority configuration
   */
  async getConfiguration(userId: string, configName: string): Promise<PriorityConfiguration | null> {
    try {
      // Check if it's a preset configuration
      if (this.PRESET_CONFIGS[configName]) {
        return this.PRESET_CONFIGS[configName];
      }

      // Get from database
      const query = `
        SELECT infrastructure_weight, timetable_weight, 
               population_risk_weight, focus_area
        FROM priority_configurations
        WHERE user_id = $1 AND config_name = $2
      `;

      const result = await this.db.query(query, [userId, configName]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        infrastructureWeight: parseFloat(row.infrastructure_weight) || 0,
        timetableWeight: parseFloat(row.timetable_weight) || 0,
        populationRiskWeight: parseFloat(row.population_risk_weight) || 0,
        focusArea: row.focus_area as 'infrastructure' | 'timetable' | 'population' | 'balanced'
      };
    } catch (error) {
      this.logger.error(`Error getting configuration ${configName} for user ${userId}:`, error);
      throw new Error('Failed to get configuration');
    }
  }

  /**
   * Saves a new or updated priority configuration with real-time recalculation
   */
  async saveConfiguration(
    userId: string, 
    configName: string, 
    config: PriorityConfiguration
  ): Promise<void> {
    try {
      // Validate configuration
      this.validateConfiguration(config);

      this.logger.info(`Saving priority configuration ${configName} for user ${userId}`);

      const query = `
        INSERT INTO priority_configurations 
        (user_id, config_name, infrastructure_weight, timetable_weight, 
         population_risk_weight, focus_area)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, config_name) DO UPDATE SET
          infrastructure_weight = EXCLUDED.infrastructure_weight,
          timetable_weight = EXCLUDED.timetable_weight,
          population_risk_weight = EXCLUDED.population_risk_weight,
          focus_area = EXCLUDED.focus_area
      `;

      await this.db.query(query, [
        userId,
        configName,
        config.infrastructureWeight,
        config.timetableWeight,
        config.populationRiskWeight,
        config.focusArea
      ]);

      this.logger.debug(`Successfully saved configuration ${configName} for user ${userId}`);

      // Trigger real-time recalculation
      await this.triggerRecalculation(userId, configName, config);
    } catch (error) {
      this.logger.error(`Error saving configuration ${configName} for user ${userId}:`, error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Deletes a user's priority configuration
   */
  async deleteConfiguration(userId: string, configName: string): Promise<boolean> {
    try {
      // Cannot delete preset configurations
      if (this.PRESET_CONFIGS[configName]) {
        throw new Error('Cannot delete preset configurations');
      }

      this.logger.info(`Deleting priority configuration ${configName} for user ${userId}`);

      const query = `
        DELETE FROM priority_configurations
        WHERE user_id = $1 AND config_name = $2
      `;

      const result = await this.db.query(query, [userId, configName]);
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      this.logger.error(`Error deleting configuration ${configName} for user ${userId}:`, error);
      throw new Error('Failed to delete configuration');
    }
  }

  /**
   * Creates a custom configuration based on focus area preferences
   */
  async createFocusConfiguration(
    userId: string,
    configName: string,
    focusArea: 'infrastructure' | 'timetable' | 'population' | 'balanced',
    customWeights?: {
      infrastructureWeight?: number;
      timetableWeight?: number;
      populationRiskWeight?: number;
    }
  ): Promise<PriorityConfiguration> {
    try {
      let config: PriorityConfiguration;

      if (customWeights) {
        // Use custom weights but ensure they sum to 1.0
        const totalWeight = (customWeights.infrastructureWeight || 0) + 
                           (customWeights.timetableWeight || 0) + 
                           (customWeights.populationRiskWeight || 0);
        
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          throw new Error('Configuration weights must sum to 1.0');
        }

        config = {
          infrastructureWeight: customWeights.infrastructureWeight || 0.33,
          timetableWeight: customWeights.timetableWeight || 0.33,
          populationRiskWeight: customWeights.populationRiskWeight || 0.34,
          focusArea
        };
      } else {
        // Use preset configuration for the focus area
        config = { ...this.PRESET_CONFIGS[`${focusArea}_focus`] || this.PRESET_CONFIGS.balanced };
        config.focusArea = focusArea;
      }

      await this.saveConfiguration(userId, configName, config);
      return config;
    } catch (error) {
      this.logger.error(`Error creating focus configuration ${configName}:`, error);
      throw new Error('Failed to create focus configuration');
    }
  }

  /**
   * Gets the default configuration for new users
   */
  getDefaultConfiguration(): PriorityConfiguration {
    return { ...this.PRESET_CONFIGS.balanced };
  }

  /**
   * Validates a priority configuration
   */
  private validateConfiguration(config: PriorityConfiguration): void {
    // Check weights are between 0 and 1
    if (config.infrastructureWeight < 0 || config.infrastructureWeight > 1) {
      throw new Error('Infrastructure weight must be between 0 and 1');
    }
    if (config.timetableWeight < 0 || config.timetableWeight > 1) {
      throw new Error('Timetable weight must be between 0 and 1');
    }
    if (config.populationRiskWeight < 0 || config.populationRiskWeight > 1) {
      throw new Error('Population risk weight must be between 0 and 1');
    }

    // Check weights sum to approximately 1.0 (allow small floating point errors)
    const totalWeight = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Configuration weights must sum to 1.0 (current sum: ${totalWeight})`);
    }

    // Check focus area is valid
    const validFocusAreas = ['infrastructure', 'timetable', 'population', 'balanced'];
    if (!validFocusAreas.includes(config.focusArea)) {
      throw new Error(`Invalid focus area: ${config.focusArea}`);
    }
  }

  /**
   * Gets configuration statistics for analysis
   */
  async getConfigurationStats(userId: string): Promise<{
    totalConfigurations: number;
    mostUsedFocusArea: string;
    averageInfrastructureWeight: number;
    averageTimetableWeight: number;
    averagePopulationRiskWeight: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_configurations,
          MODE() WITHIN GROUP (ORDER BY focus_area) as most_used_focus_area,
          AVG(infrastructure_weight) as avg_infrastructure_weight,
          AVG(timetable_weight) as avg_timetable_weight,
          AVG(population_risk_weight) as avg_population_risk_weight
        FROM priority_configurations
        WHERE user_id = $1
      `;

      const result = await this.db.query(query, [userId]);
      const row = result.rows[0];

      return {
        totalConfigurations: parseInt(row.total_configurations) || 0,
        mostUsedFocusArea: row.most_used_focus_area || 'balanced',
        averageInfrastructureWeight: parseFloat(row.avg_infrastructure_weight) || 0.33,
        averageTimetableWeight: parseFloat(row.avg_timetable_weight) || 0.33,
        averagePopulationRiskWeight: parseFloat(row.avg_population_risk_weight) || 0.34
      };
    } catch (error) {
      this.logger.error(`Error getting configuration stats for user ${userId}:`, error);
      throw new Error('Failed to get configuration statistics');
    }
  }

  /**
   * Registers a callback for real-time recalculation when priorities change
   */
  registerRecalculationCallback(
    callback: (userId: string, configName: string, config: PriorityConfiguration) => Promise<void>
  ): void {
    this.recalculationCallbacks.push(callback);
    this.logger.debug('Registered recalculation callback');
  }

  /**
   * Triggers real-time recalculation for all registered services
   */
  private async triggerRecalculation(
    userId: string, 
    configName: string, 
    config: PriorityConfiguration
  ): Promise<void> {
    this.logger.info(`Triggering real-time recalculation for user ${userId}, config ${configName}`);
    
    const recalculationPromises = this.recalculationCallbacks.map(async (callback) => {
      try {
        await callback(userId, configName, config);
      } catch (error) {
        this.logger.error('Error in recalculation callback:', error);
        // Don't throw - continue with other callbacks
      }
    });

    await Promise.allSettled(recalculationPromises);
    this.logger.debug('Completed real-time recalculation triggers');
  }

  /**
   * Applies configuration changes and triggers recalculation for specific stations
   */
  async applyConfigurationToStations(
    userId: string,
    configName: string,
    stationEvas?: number[]
  ): Promise<{
    recalculatedStations: number;
    updatedPriorities: Array<{ eva: number; oldPriority: number; newPriority: number }>;
  }> {
    try {
      const config = await this.getConfiguration(userId, configName);
      if (!config) {
        throw new Error(`Configuration ${configName} not found for user ${userId}`);
      }

      this.logger.info(`Applying configuration ${configName} to stations for user ${userId}`);

      // Get stations to recalculate
      let stations: CorridorStation[];
      if (stationEvas && stationEvas.length > 0) {
        stations = await this.getStationsByEvas(stationEvas);
      } else {
        stations = await this.getAllCorridorStations();
      }

      // Store old priorities for comparison
      const oldPriorities = await this.getCurrentPriorities(stations.map(s => s.eva));

      // Trigger recalculation with new configuration
      await this.triggerRecalculation(userId, configName, config);

      // Get new priorities for comparison
      const newPriorities = await this.getCurrentPriorities(stations.map(s => s.eva));

      // Calculate changes
      const updatedPriorities = stations.map(station => ({
        eva: station.eva,
        oldPriority: oldPriorities.get(station.eva) || 0,
        newPriority: newPriorities.get(station.eva) || 0
      })).filter(change => Math.abs(change.oldPriority - change.newPriority) > 1); // Only significant changes

      return {
        recalculatedStations: stations.length,
        updatedPriorities
      };
    } catch (error) {
      this.logger.error(`Error applying configuration to stations:`, error);
      throw new Error('Failed to apply configuration to stations');
    }
  }

  /**
   * Gets corridor stations by EVA numbers
   */
  private async getStationsByEvas(evas: number[]): Promise<CorridorStation[]> {
    const query = `
      SELECT eva, name, ST_X(coordinates) as longitude, ST_Y(coordinates) as latitude,
             distance_from_berlin, category, platform_count, facilities, is_strategic_hub
      FROM corridor_stations
      WHERE eva = ANY($1)
    `;

    const result = await this.db.query(query, [evas]);
    return result.rows.map(this.mapRowToStation);
  }

  /**
   * Gets all corridor stations
   */
  private async getAllCorridorStations(): Promise<CorridorStation[]> {
    const query = `
      SELECT eva, name, ST_X(coordinates) as longitude, ST_Y(coordinates) as latitude,
             distance_from_berlin, category, platform_count, facilities, is_strategic_hub
      FROM corridor_stations
      ORDER BY distance_from_berlin
    `;

    const result = await this.db.query(query);
    return result.rows.map(this.mapRowToStation);
  }

  /**
   * Gets current priority scores for stations
   */
  private async getCurrentPriorities(evas: number[]): Promise<Map<number, number>> {
    const query = `
      SELECT eva, upgrade_priority_score
      FROM station_upgrade_priorities
      WHERE eva = ANY($1) AND analysis_date = CURRENT_DATE
    `;

    const result = await this.db.query(query, [evas]);
    const priorities = new Map<number, number>();
    
    result.rows.forEach((row: any) => {
      priorities.set(row.eva, row.upgrade_priority_score);
    });

    return priorities;
  }

  /**
   * Sets the active priority configuration for a user
   */
  async setActiveConfiguration(userId: string, configName: string): Promise<void> {
    try {
      // Verify the configuration exists
      const config = await this.getConfiguration(userId, configName);
      if (!config) {
        throw new Error(`Configuration ${configName} not found for user ${userId}`);
      }

      this.logger.info(`Setting active configuration ${configName} for user ${userId}`);

      // Store the active configuration reference
      const query = `
        INSERT INTO user_active_configurations (user_id, active_config_name, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          active_config_name = EXCLUDED.active_config_name,
          updated_at = EXCLUDED.updated_at
      `;

      await this.db.query(query, [userId, configName]);

      // Trigger real-time recalculation with the new active configuration
      await this.triggerRecalculation(userId, configName, config);

      this.logger.debug(`Successfully set active configuration ${configName} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error setting active configuration ${configName} for user ${userId}:`, error);
      throw new Error('Failed to set active configuration');
    }
  }

  /**
   * Gets the currently active priority configuration for a user
   */
  async getActiveConfiguration(userId: string): Promise<{
    configName: string;
    config: PriorityConfiguration;
    isPreset: boolean;
    lastUpdated: string;
  } | null> {
    try {
      const query = `
        SELECT active_config_name, updated_at
        FROM user_active_configurations
        WHERE user_id = $1
      `;

      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default configuration if no active configuration is set
        return {
          configName: 'balanced',
          config: this.getDefaultConfiguration(),
          isPreset: true,
          lastUpdated: new Date().toISOString()
        };
      }

      const row = result.rows[0];
      const configName = row.active_config_name;
      const config = await this.getConfiguration(userId, configName);
      
      if (!config) {
        // Configuration was deleted, fall back to default
        await this.setActiveConfiguration(userId, 'balanced');
        return {
          configName: 'balanced',
          config: this.getDefaultConfiguration(),
          isPreset: true,
          lastUpdated: new Date().toISOString()
        };
      }

      return {
        configName,
        config,
        isPreset: this.PRESET_CONFIGS[configName] !== undefined,
        lastUpdated: row.updated_at
      };
    } catch (error) {
      this.logger.error(`Error getting active configuration for user ${userId}:`, error);
      throw new Error('Failed to get active configuration');
    }
  }

  /**
   * Gets configuration management summary for a user
   */
  async getConfigurationManagementSummary(userId: string): Promise<{
    activeConfiguration: {
      name: string;
      focusArea: string;
      lastUpdated: string;
    };
    totalConfigurations: number;
    recentConfigurations: Array<{
      name: string;
      focusArea: string;
      createdAt: string;
      isActive: boolean;
    }>;
    presetConfigurations: Array<{
      name: string;
      focusArea: string;
      description: string;
    }>;
  }> {
    try {
      // Get active configuration
      const activeConfig = await this.getActiveConfiguration(userId);
      
      // Get user's custom configurations
      const userConfigsQuery = `
        SELECT config_name, focus_area, created_at
        FROM priority_configurations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;

      const userConfigsResult = await this.db.query(userConfigsQuery, [userId]);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM priority_configurations
        WHERE user_id = $1
      `;

      const countResult = await this.db.query(countQuery, [userId]);
      const totalConfigurations = parseInt(countResult.rows[0].total) || 0;

      // Prepare recent configurations
      const recentConfigurations = userConfigsResult.rows.map((row: any) => ({
        name: row.config_name,
        focusArea: row.focus_area,
        createdAt: row.created_at,
        isActive: activeConfig?.configName === row.config_name
      }));

      // Prepare preset configurations with descriptions
      const presetConfigurations = [
        {
          name: 'balanced',
          focusArea: 'balanced',
          description: 'Equal weight to all analysis areas - good starting point'
        },
        {
          name: 'infrastructure_focus',
          focusArea: 'infrastructure',
          description: 'Emphasizes station capacity and facility upgrades'
        },
        {
          name: 'timetable_focus',
          focusArea: 'timetable',
          description: 'Prioritizes connection reliability and schedule optimization'
        },
        {
          name: 'population_focus',
          focusArea: 'population',
          description: 'Focuses on areas with high passenger impact'
        }
      ];

      return {
        activeConfiguration: {
          name: activeConfig?.configName || 'balanced',
          focusArea: activeConfig?.config.focusArea || 'balanced',
          lastUpdated: activeConfig?.lastUpdated || new Date().toISOString()
        },
        totalConfigurations,
        recentConfigurations,
        presetConfigurations
      };
    } catch (error) {
      this.logger.error(`Error getting configuration management summary for user ${userId}:`, error);
      throw new Error('Failed to get configuration management summary');
    }
  }

  /**
   * Validates and applies a configuration change with impact analysis
   */
  async validateAndApplyConfiguration(
    userId: string,
    configName: string,
    config: PriorityConfiguration,
    previewMode: boolean = false
  ): Promise<{
    isValid: boolean;
    validationErrors: string[];
    impactPreview?: {
      affectedStations: number;
      significantChanges: Array<{
        eva: number;
        name: string;
        oldPriority: number;
        newPriority: number;
        change: number;
      }>;
      focusAreaImpact: {
        infrastructure: number;
        timetable: number;
        populationRisk: number;
      };
    };
  }> {
    try {
      const validationErrors: string[] = [];

      // Validate configuration
      try {
        this.validateConfiguration(config);
      } catch (error) {
        validationErrors.push((error as Error).message);
      }

      // Additional business rule validations
      if (config.focusArea === 'infrastructure' && config.infrastructureWeight < 0.4) {
        validationErrors.push('Infrastructure focus requires infrastructure weight >= 0.4');
      }
      if (config.focusArea === 'timetable' && config.timetableWeight < 0.4) {
        validationErrors.push('Timetable focus requires timetable weight >= 0.4');
      }
      if (config.focusArea === 'population' && config.populationRiskWeight < 0.4) {
        validationErrors.push('Population focus requires population risk weight >= 0.4');
      }

      const isValid = validationErrors.length === 0;

      if (!isValid) {
        return { isValid, validationErrors };
      }

      // If valid and not preview mode, save and apply
      if (!previewMode) {
        await this.saveConfiguration(userId, configName, config);
        await this.setActiveConfiguration(userId, configName);
      }

      // Generate impact preview
      const impactPreview = await this.generateImpactPreview(userId, config);

      return {
        isValid,
        validationErrors,
        impactPreview
      };
    } catch (error) {
      this.logger.error(`Error validating and applying configuration:`, error);
      throw new Error('Failed to validate and apply configuration');
    }
  }

  /**
   * Maps database row to CorridorStation object
   */
  private mapRowToStation(row: any): CorridorStation {
    return {
      eva: row.eva,
      name: row.name,
      coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
      distanceFromBerlin: row.distance_from_berlin,
      category: row.category,
      platforms: row.platform_count,
      facilities: row.facilities || {},
      upgradePriority: 0, // Will be calculated separately
      isStrategicHub: row.is_strategic_hub
    };
  }

  /**
   * Generates impact preview for a configuration change
   */
  private async generateImpactPreview(
    userId: string,
    newConfig: PriorityConfiguration
  ): Promise<{
    affectedStations: number;
    significantChanges: Array<{
      eva: number;
      name: string;
      oldPriority: number;
      newPriority: number;
      change: number;
    }>;
    focusAreaImpact: {
      infrastructure: number;
      timetable: number;
      populationRisk: number;
    };
  }> {
    // This is a simplified implementation - in a real system you'd calculate actual impacts
    const mockStations = [
      { eva: 8000105, name: 'Berlin Hbf', oldPriority: 85 },
      { eva: 8000147, name: 'Hamburg Hbf', oldPriority: 82 },
      { eva: 8000244, name: 'Stendal', oldPriority: 45 },
      { eva: 8000320, name: 'Wittenberge', oldPriority: 38 }
    ];

    const significantChanges = mockStations.map(station => {
      // Simulate priority change based on configuration
      let newPriority = station.oldPriority;
      
      if (newConfig.focusArea === 'infrastructure') {
        newPriority = Math.min(100, station.oldPriority + 10);
      } else if (newConfig.focusArea === 'timetable') {
        newPriority = Math.min(100, station.oldPriority + 5);
      } else if (newConfig.focusArea === 'population') {
        newPriority = Math.min(100, station.oldPriority + 8);
      }

      return {
        eva: station.eva,
        name: station.name,
        oldPriority: station.oldPriority,
        newPriority,
        change: newPriority - station.oldPriority
      };
    }).filter(change => Math.abs(change.change) >= 3); // Only significant changes

    return {
      affectedStations: mockStations.length,
      significantChanges,
      focusAreaImpact: {
        infrastructure: Math.round(newConfig.infrastructureWeight * 100),
        timetable: Math.round(newConfig.timetableWeight * 100),
        populationRisk: Math.round(newConfig.populationRiskWeight * 100)
      }
    };
  }
}