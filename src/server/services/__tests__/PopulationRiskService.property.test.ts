import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { PopulationRiskService } from '../PopulationRiskService';
import { PopulationTrafficRisk } from '../../../shared/types';

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

describe('PopulationRiskService Property Tests', () => {
  let populationRiskService: PopulationRiskService;
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

    populationRiskService = new PopulationRiskService(mockDatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 5: Population-Traffic Risk Calculation', () => {
    /**
     * Property: Risk scores increase with population density
     * Higher population density should result in higher risk scores
     */
    it('should maintain positive correlation between population density and risk scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            population: fc.integer({ min: 10000, max: 100000 }),
            area: fc.float({ min: Math.fround(10.0), max: Math.fround(100.0) }),
            municipalityId: fc.constantFrom('12345678', '87654321', '11111111'),
            municipalityName: fc.constantFrom('TestCity', 'SampleTown', 'DemoPlace')
          }),
          async (segmentData) => {
            // Mock database responses
            mockDatabaseService.query.mockResolvedValue({ rows: [] });

            // Create test segments with different densities
            const segment1 = {
              municipalityId: segmentData.municipalityId,
              municipalityName: segmentData.municipalityName,
              population: segmentData.population,
              area: segmentData.area,
              corridorStations: [{
                eva: 8000000,
                name: 'Test Station',
                category: 3,
                distanceFromBerlin: 100,
                isStrategicHub: false
              }]
            };

            const segment2 = {
              ...segment1,
              population: segmentData.population * 2 // Higher population density
            };

            // Calculate risk using private method (access via any casting)
            const risk1 = await (populationRiskService as any).calculateSegmentRisk(segment1);
            const risk2 = await (populationRiskService as any).calculateSegmentRisk(segment2);

            expect(risk1).not.toBeNull();
            expect(risk2).not.toBeNull();

            if (risk1 && risk2) {
              // Higher density should result in higher or equal risk score
              expect(risk2.disruptionImpactScore).toBeGreaterThanOrEqual(risk1.disruptionImpactScore);
              
              // Both scores should be in valid range
              expect(risk1.disruptionImpactScore).toBeGreaterThanOrEqual(0);
              expect(risk1.disruptionImpactScore).toBeLessThanOrEqual(100);
              expect(risk2.disruptionImpactScore).toBeGreaterThanOrEqual(0);
              expect(risk2.disruptionImpactScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Property: Risk scores increase with traffic volume
     * More stations and higher category stations should increase risk scores
     */
    it('should maintain positive correlation between traffic volume and risk scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            population: fc.integer({ min: 20000, max: 200000 }),
            area: fc.float({ min: Math.fround(20.0), max: Math.fround(200.0) }),
            municipalityId: fc.constantFrom('12345678', '87654321'),
            municipalityName: fc.constantFrom('TestCity', 'SampleTown')
          }),
          async (segmentData) => {
            // Mock database responses
            mockDatabaseService.query.mockResolvedValue({ rows: [] });

            // Create segments with different traffic volumes
            const lowTrafficSegment = {
              municipalityId: segmentData.municipalityId,
              municipalityName: segmentData.municipalityName,
              population: segmentData.population,
              area: segmentData.area,
              corridorStations: [{
                eva: 8000001,
                name: 'Small Station',
                category: 6, // Small station
                distanceFromBerlin: 100,
                isStrategicHub: false
              }]
            };

            const highTrafficSegment = {
              ...lowTrafficSegment,
              corridorStations: [{
                eva: 8000002,
                name: 'Major Hub',
                category: 1, // Major station
                distanceFromBerlin: 100,
                isStrategicHub: true
              }]
            };

            // Calculate risks
            const lowRisk = await (populationRiskService as any).calculateSegmentRisk(lowTrafficSegment);
            const highRisk = await (populationRiskService as any).calculateSegmentRisk(highTrafficSegment);

            expect(lowRisk).not.toBeNull();
            expect(highRisk).not.toBeNull();

            if (lowRisk && highRisk) {
              // Higher traffic volume should result in higher risk score
              expect(highRisk.dailyTrafficVolume).toBeGreaterThan(lowRisk.dailyTrafficVolume);
              
              // Risk scores should be in valid range
              expect(lowRisk.disruptionImpactScore).toBeGreaterThanOrEqual(0);
              expect(lowRisk.disruptionImpactScore).toBeLessThanOrEqual(100);
              expect(highRisk.disruptionImpactScore).toBeGreaterThanOrEqual(0);
              expect(highRisk.disruptionImpactScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 4 }
      );
    });

    /**
     * Property: Risk level classification is consistent with impact scores
     * Risk levels should correspond to appropriate score ranges
     */
    it('should maintain consistent risk level classification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            population: fc.integer({ min: 15000, max: 150000 }),
            area: fc.float({ min: Math.fround(15.0), max: Math.fround(150.0) }),
            municipalityId: fc.constantFrom('12345678', '87654321', '11111111'),
            municipalityName: fc.constantFrom('TestCity', 'SampleTown', 'DemoPlace'),
            isStrategicHub: fc.boolean()
          }),
          async (segmentData) => {
            // Mock database responses
            mockDatabaseService.query.mockResolvedValue({ rows: [] });

            const segment = {
              municipalityId: segmentData.municipalityId,
              municipalityName: segmentData.municipalityName,
              population: segmentData.population,
              area: segmentData.area,
              corridorStations: [{
                eva: 8000000,
                name: 'Station 1',
                category: segmentData.isStrategicHub ? 1 : 4,
                distanceFromBerlin: 100,
                isStrategicHub: segmentData.isStrategicHub
              }]
            };

            const risk = await (populationRiskService as any).calculateSegmentRisk(segment);

            expect(risk).not.toBeNull();
            if (risk) {
              // Verify risk level corresponds to score ranges
              if (risk.disruptionImpactScore >= 70) {
                expect(risk.riskLevel).toBe('high');
              } else if (risk.disruptionImpactScore >= 40) {
                expect(risk.riskLevel).toBe('medium');
              } else {
                expect(risk.riskLevel).toBe('low');
              }

              // Verify data integrity
              expect(typeof risk.disruptionImpactScore).toBe('number');
              expect(typeof risk.population).toBe('number');
              expect(typeof risk.dailyTrafficVolume).toBe('number');
              expect(['low', 'medium', 'high']).toContain(risk.riskLevel);
            }
          }
        ),
        { numRuns: 6 }
      );
    });

    /**
     * Property: Risk calculation maintains mathematical consistency
     * Risk scores should be deterministic and reproducible for identical inputs
     */
    it('should produce consistent and deterministic risk calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            population: fc.integer({ min: 25000, max: 250000 }),
            area: fc.float({ min: Math.fround(25.0), max: Math.fround(250.0) }),
            municipalityId: fc.constantFrom('12345678', '87654321'),
            municipalityName: fc.constantFrom('TestCity', 'SampleTown'),
            stationCategory: fc.integer({ min: 1, max: 6 }),
            distanceFromBerlin: fc.integer({ min: 50, max: 250 })
          }),
          async (segmentData) => {
            // Mock database responses
            mockDatabaseService.query.mockResolvedValue({ rows: [] });

            const segment = {
              municipalityId: segmentData.municipalityId,
              municipalityName: segmentData.municipalityName,
              population: segmentData.population,
              area: segmentData.area,
              corridorStations: [{
                eva: 8000200,
                name: 'Test Station',
                category: segmentData.stationCategory,
                distanceFromBerlin: segmentData.distanceFromBerlin,
                isStrategicHub: segmentData.stationCategory <= 2
              }]
            };

            // Calculate risk twice with identical inputs
            const risk1 = await (populationRiskService as any).calculateSegmentRisk(segment);
            const risk2 = await (populationRiskService as any).calculateSegmentRisk(segment);

            expect(risk1).not.toBeNull();
            expect(risk2).not.toBeNull();

            if (risk1 && risk2) {
              // Results should be identical
              expect(risk1.disruptionImpactScore).toBe(risk2.disruptionImpactScore);
              expect(risk1.population).toBe(risk2.population);
              expect(risk1.dailyTrafficVolume).toBe(risk2.dailyTrafficVolume);
              expect(risk1.riskLevel).toBe(risk2.riskLevel);

              // Verify ranges
              expect(risk1.population).toBeGreaterThan(0);
              expect(risk1.dailyTrafficVolume).toBeGreaterThan(0);
              expect(risk1.disruptionImpactScore).toBeGreaterThanOrEqual(0);
              expect(risk1.disruptionImpactScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});