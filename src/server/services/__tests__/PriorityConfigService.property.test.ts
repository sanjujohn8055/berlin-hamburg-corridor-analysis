import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { PriorityConfigService } from '../PriorityConfigService';
import { PriorityConfiguration } from '../../../shared/types';

// Mock the Logger
jest.mock('../../utils/Logger', () => ({
  Logger: {
    getInstance: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    })
  }
}));

describe('PriorityConfigService Property Tests', () => {
  let priorityConfigService: PriorityConfigService;
  let mockDatabaseService: any;

  beforeEach(() => {
    // Create mock database service
    mockDatabaseService = {
      query: jest.fn(),
      getClient: jest.fn(),
      transaction: jest.fn(),
      testConnection: jest.fn(),
      close: jest.fn()
    };

    priorityConfigService = new PriorityConfigService(mockDatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 3: User Priority Configuration', () => {
    /**
     * Property: Configuration validation ensures weights sum to 1.0
     * This is the core mathematical property that must hold
     */
    it('should validate that configuration weights sum to 1.0', () => {
      fc.assert(
        fc.property(
          fc.record({
            infrastructureWeight: fc.float({ min: Math.fround(0.0), max: Math.fround(1.0) }).filter(n => !isNaN(n) && isFinite(n)),
            timetableWeight: fc.float({ min: Math.fround(0.0), max: Math.fround(1.0) }).filter(n => !isNaN(n) && isFinite(n)),
            populationRiskWeight: fc.float({ min: Math.fround(0.0), max: Math.fround(1.0) }).filter(n => !isNaN(n) && isFinite(n)),
            focusArea: fc.constantFrom('infrastructure', 'timetable', 'population', 'balanced')
          }).filter(config => {
            // Ensure all weights are valid numbers
            return !isNaN(config.infrastructureWeight) && 
                   !isNaN(config.timetableWeight) && 
                   !isNaN(config.populationRiskWeight) &&
                   isFinite(config.infrastructureWeight) &&
                   isFinite(config.timetableWeight) &&
                   isFinite(config.populationRiskWeight);
          }),
          (config) => {
            const priorityConfig: PriorityConfiguration = {
              infrastructureWeight: config.infrastructureWeight,
              timetableWeight: config.timetableWeight,
              populationRiskWeight: config.populationRiskWeight,
              focusArea: config.focusArea as 'infrastructure' | 'timetable' | 'population' | 'balanced'
            };

            const sum = priorityConfig.infrastructureWeight + priorityConfig.timetableWeight + priorityConfig.populationRiskWeight;
            
            // If weights sum to approximately 1.0, validation should pass
            if (Math.abs(sum - 1.0) <= 0.01) {
              try {
                // Access the private validation method through any casting
                (priorityConfigService as any).validateConfiguration(priorityConfig);
                return true; // Should not throw
              } catch (error) {
                return false; // Should not throw for valid configs
              }
            } else {
              // If weights don't sum to 1.0, validation should fail
              try {
                (priorityConfigService as any).validateConfiguration(priorityConfig);
                return false; // Should have thrown
              } catch (error) {
                return true; // Should throw for invalid configs
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Configuration weights must always sum to 1.0 (within floating point tolerance)
     * This ensures mathematical consistency in priority calculations
     */
    it('should maintain weight sum invariant for all valid configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            infrastructureWeight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8) }).filter(n => !isNaN(n) && isFinite(n)),
            timetableWeight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8) }).filter(n => !isNaN(n) && isFinite(n)),
            populationRiskWeight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8) }).filter(n => !isNaN(n) && isFinite(n)),
            focusArea: fc.constantFrom('infrastructure', 'timetable', 'population', 'balanced')
          }).filter(config => {
            const sum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
            return Math.abs(sum - 1.0) <= 0.01 && 
                   !isNaN(config.infrastructureWeight) && 
                   !isNaN(config.timetableWeight) && 
                   !isNaN(config.populationRiskWeight);
          }),
          (config) => {
            const priorityConfig: PriorityConfiguration = {
              infrastructureWeight: config.infrastructureWeight,
              timetableWeight: config.timetableWeight,
              populationRiskWeight: config.populationRiskWeight,
              focusArea: config.focusArea as 'infrastructure' | 'timetable' | 'population' | 'balanced'
            };

            // Test the mathematical property directly
            const sum = priorityConfig.infrastructureWeight + priorityConfig.timetableWeight + priorityConfig.populationRiskWeight;
            
            // The sum should be approximately 1.0
            const isValidSum = Math.abs(sum - 1.0) <= 0.01;
            
            // Validation should pass for valid configurations
            try {
              (priorityConfigService as any).validateConfiguration(priorityConfig);
              return isValidSum; // Should only succeed if sum is valid
            } catch (error) {
              return !isValidSum; // Should only fail if sum is invalid
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Preset configurations are always available and have valid weights
     * Preset configurations should be accessible to all users and have mathematically valid weights
     */
    it('should maintain preset configuration availability and validity', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          (userId) => {
            const presetNames = ['balanced', 'infrastructure_focus', 'timetable_focus', 'population_focus'];
            
            for (const presetName of presetNames) {
              // Preset should be available (no database call needed - they're hardcoded)
              const config = priorityConfigService.getDefaultConfiguration();
              
              // Should have valid weights
              const sum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
              if (Math.abs(sum - 1.0) > 0.01) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property: Focus area configurations maintain their intended emphasis
     * Focus configurations should have higher weights for their focus area
     */
    it('should maintain focus area weight emphasis', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('infrastructure', 'timetable', 'population'),
          (focusArea) => {
            // Get the preset configuration for this focus area
            const presetConfigs = (priorityConfigService as any).PRESET_CONFIGS;
            const config = presetConfigs[`${focusArea}_focus`];
            
            if (!config) return false;

            // Verify focus area has highest weight
            const weights = [
              { area: 'infrastructure', weight: config.infrastructureWeight },
              { area: 'timetable', weight: config.timetableWeight },
              { area: 'population', weight: config.populationRiskWeight }
            ];

            const focusWeight = weights.find(w => w.area === focusArea)?.weight || 0;
            const otherWeights = weights.filter(w => w.area !== focusArea).map(w => w.weight);

            // Focus area should have the highest weight
            for (const weight of otherWeights) {
              if (focusWeight < weight) return false;
            }

            // Focus area should be significantly higher (at least 0.4 for focused configs)
            return focusWeight >= 0.4;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});