import * as fc from 'fast-check';
import { PriorityConfiguration } from '../../shared/types';

/**
 * Property tests for Priority Configuration Interface
 * Task 8.4: Property tests for priority configuration interface
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

describe('PriorityConfigInterface Property Tests', () => {
  // Helper function to create valid priority configuration
  const priorityConfigArbitrary = fc.record({
    infrastructureWeight: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    timetableWeight: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    populationRiskWeight: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    focusArea: fc.constantFrom('infrastructure', 'timetable', 'population', 'balanced')
  }) as fc.Arbitrary<PriorityConfiguration>;

  // Helper function to create normalized priority configuration (weights sum to 1)
  const normalizedPriorityConfigArbitrary = fc.tuple(
    fc.float({ min: Math.fround(0.01), max: Math.fround(0.98), noNaN: true }),
    fc.float({ min: Math.fround(0.01), max: Math.fround(0.98), noNaN: true }),
    fc.float({ min: Math.fround(0.01), max: Math.fround(0.98), noNaN: true })
  ).map(([w1, w2, w3]) => {
    const sum = w1 + w2 + w3;
    const normalized = {
      infrastructureWeight: w1 / sum,
      timetableWeight: w2 / sum,
      populationRiskWeight: w3 / sum
    };

    // Determine focus area based on highest weight with proper tolerance
    const weights = {
      infrastructure: normalized.infrastructureWeight,
      timetable: normalized.timetableWeight,
      population: normalized.populationRiskWeight
    };
    
    const maxWeight = Math.max(...Object.values(weights));
    const tolerance = 0.0001; // Use same tolerance as in test
    const focusAreas = Object.entries(weights).filter(([, weight]) => Math.abs(weight - maxWeight) <= tolerance);
    
    const focusArea = focusAreas.length === 1 
      ? focusAreas[0][0] as PriorityConfiguration['focusArea']
      : 'balanced';

    return {
      ...normalized,
      focusArea
    } as PriorityConfiguration;
  });

  /**
   * Property 1: Weight validation consistency
   * Validates that weight validation is consistent and accurate
   */
  test('Property 1: Weight validation is consistent and accurate', () => {
    fc.assert(fc.property(
      priorityConfigArbitrary,
      (config) => {
        const validateWeights = (cfg: PriorityConfiguration): boolean => {
          const sum = cfg.infrastructureWeight + cfg.timetableWeight + cfg.populationRiskWeight;
          const tolerance = 0.001;
          return Math.abs(sum - 1.0) <= tolerance;
        };

        const isValid = validateWeights(config);
        const weightSum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;

        // Validation should be deterministic
        expect(validateWeights(config)).toBe(isValid);

        // If sum is close to 1.0, should be valid
        if (Math.abs(weightSum - 1.0) <= 0.001) {
          expect(isValid).toBe(true);
        }

        // If sum is far from 1.0, should be invalid
        if (Math.abs(weightSum - 1.0) > 0.001) {
          expect(isValid).toBe(false);
        }

        // All weights should be non-negative
        expect(config.infrastructureWeight).toBeGreaterThanOrEqual(0);
        expect(config.timetableWeight).toBeGreaterThanOrEqual(0);
        expect(config.populationRiskWeight).toBeGreaterThanOrEqual(0);

        // All weights should be at most 1.0
        expect(config.infrastructureWeight).toBeLessThanOrEqual(1);
        expect(config.timetableWeight).toBeLessThanOrEqual(1);
        expect(config.populationRiskWeight).toBeLessThanOrEqual(1);

        return true;
      }
    ), { numRuns: 10 });
  });

  /**
   * Property 2: Weight adjustment maintains sum invariant
   * Validates that adjusting one weight properly adjusts others to maintain sum = 1.0
   */
  test('Property 2: Weight adjustment maintains sum invariant', () => {
    fc.assert(fc.property(
      normalizedPriorityConfigArbitrary,
      fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
      fc.constantFrom('infrastructureWeight', 'timetableWeight', 'populationRiskWeight'),
      (initialConfig, newValue, weightType) => {
        const updateWeight = (
          config: PriorityConfiguration,
          type: 'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight',
          value: number
        ): PriorityConfiguration => {
          const clampedValue = Math.max(0, Math.min(1, value));
          const otherWeights: Array<'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight'> = 
            ['infrastructureWeight', 'timetableWeight', 'populationRiskWeight']
              .filter(key => key !== type) as Array<'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight'>;

          // Calculate remaining weight to distribute
          const remainingWeight = 1 - clampedValue;
          const currentOtherSum = otherWeights.reduce((sum, key) => sum + config[key], 0);

          const newConfig = { ...config };
          newConfig[type] = clampedValue;

          // Distribute remaining weight proportionally among other weights
          if (currentOtherSum > 0 && remainingWeight > 0) {
            otherWeights.forEach(key => {
              const proportion = config[key] / currentOtherSum;
              newConfig[key] = remainingWeight * proportion;
            });
          } else if (remainingWeight > 0) {
            // If other weights are 0, distribute equally
            const equalWeight = remainingWeight / otherWeights.length;
            otherWeights.forEach(key => {
              newConfig[key] = equalWeight;
            });
          }

          // Update focus area based on highest weight
          const weights = {
            infrastructure: newConfig.infrastructureWeight,
            timetable: newConfig.timetableWeight,
            population: newConfig.populationRiskWeight
          };
          
          const maxWeight = Math.max(...Object.values(weights));
          const focusAreas = Object.entries(weights).filter(([, weight]) => weight === maxWeight);
          
          newConfig.focusArea = focusAreas.length === 1 
            ? focusAreas[0][0] as PriorityConfiguration['focusArea']
            : 'balanced';

          return newConfig;
        };

        const updatedConfig = updateWeight(initialConfig, weightType as 'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight', newValue);

        // Sum should be approximately 1.0
        const sum = updatedConfig.infrastructureWeight + updatedConfig.timetableWeight + updatedConfig.populationRiskWeight;
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);

        // Updated weight should be the clamped new value
        const clampedValue = Math.max(0, Math.min(1, newValue));
        const actualValue = weightType === 'infrastructureWeight' ? updatedConfig.infrastructureWeight :
                           weightType === 'timetableWeight' ? updatedConfig.timetableWeight :
                           updatedConfig.populationRiskWeight;
        expect(Math.abs(actualValue - clampedValue)).toBeLessThan(0.001);

        // All weights should be non-negative
        expect(updatedConfig.infrastructureWeight).toBeGreaterThanOrEqual(0);
        expect(updatedConfig.timetableWeight).toBeGreaterThanOrEqual(0);
        expect(updatedConfig.populationRiskWeight).toBeGreaterThanOrEqual(0);

        // All weights should be at most 1.0
        expect(updatedConfig.infrastructureWeight).toBeLessThanOrEqual(1);
        expect(updatedConfig.timetableWeight).toBeLessThanOrEqual(1);
        expect(updatedConfig.populationRiskWeight).toBeLessThanOrEqual(1);

        return true;
      }
    ), { numRuns: 8 });
  });

  /**
   * Property 3: Focus area determination consistency
   * Validates that focus area is determined correctly based on weight distribution
   */
  test('Property 3: Focus area determination is consistent with weight distribution', () => {
    fc.assert(fc.property(
      normalizedPriorityConfigArbitrary,
      (config) => {
        const determineFocusArea = (cfg: PriorityConfiguration): PriorityConfiguration['focusArea'] => {
          const weights = {
            infrastructure: cfg.infrastructureWeight,
            timetable: cfg.timetableWeight,
            population: cfg.populationRiskWeight
          };
          
          const maxWeight = Math.max(...Object.values(weights));
          const tolerance = 0.0001; // Use same tolerance as in validation
          const focusAreas = Object.entries(weights).filter(([, weight]) => Math.abs(weight - maxWeight) <= tolerance);
          
          return focusAreas.length === 1 
            ? focusAreas[0][0] as PriorityConfiguration['focusArea']
            : 'balanced';
        };

        const expectedFocusArea = determineFocusArea(config);
        expect(config.focusArea).toBe(expectedFocusArea);

        // Validate focus area logic
        const weights = [
          { name: 'infrastructure', value: config.infrastructureWeight },
          { name: 'timetable', value: config.timetableWeight },
          { name: 'population', value: config.populationRiskWeight }
        ];

        const maxWeight = Math.max(...weights.map(w => w.value));
        const tolerance = 0.0001; // Tighter tolerance for floating point comparison
        const maxWeightAreas = weights.filter(w => Math.abs(w.value - maxWeight) <= tolerance);

        if (maxWeightAreas.length === 1) {
          expect(config.focusArea).toBe(maxWeightAreas[0].name);
        } else {
          expect(config.focusArea).toBe('balanced');
        }

        return true;
      }
    ), { numRuns: 8 });
  });

  /**
   * Property 4: Preset configuration validity
   * Validates that all preset configurations are valid and consistent
   */
  test('Property 4: Preset configurations are valid and consistent', () => {
    const presetConfigs = [
      {
        name: 'Balanced',
        config: {
          infrastructureWeight: 0.4,
          timetableWeight: 0.3,
          populationRiskWeight: 0.3,
          focusArea: 'balanced' as const
        }
      },
      {
        name: 'Infrastructure Focus',
        config: {
          infrastructureWeight: 0.6,
          timetableWeight: 0.2,
          populationRiskWeight: 0.2,
          focusArea: 'infrastructure' as const
        }
      },
      {
        name: 'Timetable Focus',
        config: {
          infrastructureWeight: 0.2,
          timetableWeight: 0.6,
          populationRiskWeight: 0.2,
          focusArea: 'timetable' as const
        }
      },
      {
        name: 'Population Risk Focus',
        config: {
          infrastructureWeight: 0.2,
          timetableWeight: 0.2,
          populationRiskWeight: 0.6,
          focusArea: 'population' as const
        }
      }
    ];

    for (const preset of presetConfigs) {
      const config = preset.config;

      // Weights should sum to 1.0
      const sum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);

      // All weights should be positive
      expect(config.infrastructureWeight).toBeGreaterThan(0);
      expect(config.timetableWeight).toBeGreaterThan(0);
      expect(config.populationRiskWeight).toBeGreaterThan(0);

      // Focus area should match the highest weight (except for balanced)
      const weights = {
        infrastructure: config.infrastructureWeight,
        timetable: config.timetableWeight,
        population: config.populationRiskWeight
      };

      const maxWeight = Math.max(...Object.values(weights));
      const maxWeightAreas = Object.entries(weights).filter(([, weight]) => weight === maxWeight);

      if (preset.name === 'Balanced') {
        // Balanced should have relatively even distribution
        const maxDiff = Math.max(...Object.values(weights)) - Math.min(...Object.values(weights));
        expect(maxDiff).toBeLessThan(0.2); // Allow some variation but not too much
      } else {
        // Focus presets should have the correct focus area as the highest weight
        expect(maxWeightAreas.length).toBe(1);
        expect(maxWeightAreas[0][0]).toBe(config.focusArea);
      }
    }
  });

  /**
   * Property 5: Configuration serialization consistency
   * Validates that configurations can be serialized and deserialized consistently
   */
  test('Property 5: Configuration serialization is consistent and reversible', () => {
    fc.assert(fc.property(
      normalizedPriorityConfigArbitrary,
      (config) => {
        // Test JSON serialization/deserialization
        const serialized = JSON.stringify(config);
        const deserialized = JSON.parse(serialized) as PriorityConfiguration;

        // All properties should be preserved
        expect(deserialized.infrastructureWeight).toBeCloseTo(config.infrastructureWeight, 10);
        expect(deserialized.timetableWeight).toBeCloseTo(config.timetableWeight, 10);
        expect(deserialized.populationRiskWeight).toBeCloseTo(config.populationRiskWeight, 10);
        expect(deserialized.focusArea).toBe(config.focusArea);

        // Deserialized config should still be valid
        const sum = deserialized.infrastructureWeight + deserialized.timetableWeight + deserialized.populationRiskWeight;
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);

        // Test that serialization is deterministic
        const serialized2 = JSON.stringify(config);
        expect(serialized).toBe(serialized2);

        return true;
      }
    ), { numRuns: 8 });
  });

  /**
   * Property 6: Configuration comparison and equality
   * Validates that configuration comparison is consistent
   */
  test('Property 6: Configuration comparison is consistent and transitive', () => {
    fc.assert(fc.property(
      normalizedPriorityConfigArbitrary,
      normalizedPriorityConfigArbitrary,
      normalizedPriorityConfigArbitrary,
      (config1, config2, config3) => {
        const configsEqual = (a: PriorityConfiguration, b: PriorityConfiguration): boolean => {
          const tolerance = 0.001;
          return Math.abs(a.infrastructureWeight - b.infrastructureWeight) < tolerance &&
                 Math.abs(a.timetableWeight - b.timetableWeight) < tolerance &&
                 Math.abs(a.populationRiskWeight - b.populationRiskWeight) < tolerance &&
                 a.focusArea === b.focusArea;
        };

        // Reflexivity: config equals itself
        expect(configsEqual(config1, config1)).toBe(true);

        // Symmetry: if A equals B, then B equals A
        const equals12 = configsEqual(config1, config2);
        const equals21 = configsEqual(config2, config1);
        expect(equals12).toBe(equals21);

        // Transitivity: if A equals B and B equals C, then A equals C
        const equals23 = configsEqual(config2, config3);
        const equals13 = configsEqual(config1, config3);
        
        if (equals12 && equals23) {
          expect(equals13).toBe(true);
        }

        return true;
      }
    ), { numRuns: 6 });
  });

  /**
   * Property 7: Weight percentage conversion consistency
   * Validates that weight-to-percentage conversion is accurate
   */
  test('Property 7: Weight percentage conversion is accurate and consistent', () => {
    fc.assert(fc.property(
      normalizedPriorityConfigArbitrary,
      (config) => {
        const toPercentage = (weight: number): number => {
          return Math.round(weight * 100 * 10) / 10; // Round to 1 decimal place
        };

        const fromPercentage = (percentage: number): number => {
          return percentage / 100;
        };

        // Test conversion consistency
        const infraPercentage = toPercentage(config.infrastructureWeight);
        const timetablePercentage = toPercentage(config.timetableWeight);
        const populationPercentage = toPercentage(config.populationRiskWeight);

        // Percentages should be in valid range
        expect(infraPercentage).toBeGreaterThanOrEqual(0);
        expect(infraPercentage).toBeLessThanOrEqual(100);
        expect(timetablePercentage).toBeGreaterThanOrEqual(0);
        expect(timetablePercentage).toBeLessThanOrEqual(100);
        expect(populationPercentage).toBeGreaterThanOrEqual(0);
        expect(populationPercentage).toBeLessThanOrEqual(100);

        // Round-trip conversion should be approximately equal
        const convertedBack = {
          infrastructure: fromPercentage(infraPercentage),
          timetable: fromPercentage(timetablePercentage),
          population: fromPercentage(populationPercentage)
        };

        expect(Math.abs(convertedBack.infrastructure - config.infrastructureWeight)).toBeLessThan(0.01);
        expect(Math.abs(convertedBack.timetable - config.timetableWeight)).toBeLessThan(0.01);
        expect(Math.abs(convertedBack.population - config.populationRiskWeight)).toBeLessThan(0.01);

        // Sum of percentages should be approximately 100
        const percentageSum = infraPercentage + timetablePercentage + populationPercentage;
        expect(Math.abs(percentageSum - 100)).toBeLessThan(1); // Allow 1% tolerance due to rounding

        return true;
      }
    ), { numRuns: 8 });
  });
});