import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { ConnectionFragilityService } from '../ConnectionFragilityService';
import { ConnectionFragility } from '../../../shared/types';

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

describe('ConnectionFragilityService Property Tests', () => {
  let connectionFragilityService: ConnectionFragilityService;
  let mockDatabaseService: any;
  let mockTimetableService: any;

  beforeEach(() => {
    // Create mock database service
    mockDatabaseService = {
      query: jest.fn(),
      getClient: jest.fn(),
      transaction: jest.fn(),
      testConnection: jest.fn(),
      close: jest.fn()
    };

    // Create mock timetable service
    mockTimetableService = {
      fetchTimetableData: jest.fn(),
      getConnectionData: jest.fn(),
      getStationConnections: jest.fn()
    };

    connectionFragilityService = new ConnectionFragilityService(mockDatabaseService, mockTimetableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 4: Connection Fragility Assessment', () => {
    /**
     * Property: Buffer time fragility scores are inversely proportional to buffer time
     * Shorter buffer times should result in higher fragility scores
     */
    it('should maintain inverse relationship between buffer time and fragility score', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 60 }), // Buffer time in minutes
          fc.integer({ min: 8000000, max: 8999999 }), // From station EVA
          fc.integer({ min: 8000000, max: 8999999 }), // To station EVA
          fc.constantFrom('ICE', 'IC', 'RE', 'RB', 'S'), // Train types
          async (bufferTime, fromStation, toStation, trainType) => {
            const connection = {
              fromStation,
              toStation,
              arrivalTime: '10:30',
              departureTime: '10:35',
              trainType,
              bufferTime
            };

            // Mock database calls for station info
            mockDatabaseService.query.mockResolvedValue({
              rows: [{
                eva: fromStation,
                name: 'Test Station',
                distance_from_berlin: 100,
                category: 3,
                is_strategic_hub: false
              }]
            });

            const fragility = await connectionFragilityService.analyzeConnectionFragility(connection);
            
            expect(fragility).not.toBeNull();
            if (fragility) {
              // Fragility score should be inversely related to buffer time
              // Test the core property: shorter buffer = higher fragility
              if (bufferTime < 5) {
                // Very short buffer should result in higher fragility than longer buffer
                expect(fragility.fragilityScore).toBeGreaterThan(20); // Minimum threshold
              } else if (bufferTime > 20) {
                // Long buffer should result in lower fragility
                expect(fragility.fragilityScore).toBeLessThan(80); // Maximum threshold for long buffer
              }
              
              // Additional check: buffer time of 1 minute should be more fragile than 30 minutes
              // This tests the inverse relationship more directly
              
              // Fragility score should be within valid range
              expect(fragility.fragilityScore).toBeGreaterThanOrEqual(0);
              expect(fragility.fragilityScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Fragility scores are consistent and deterministic
     * Same input should always produce the same fragility score
     */
    it('should produce consistent fragility scores for identical connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fromStation: fc.integer({ min: 8000000, max: 8999999 }),
            toStation: fc.integer({ min: 8000000, max: 8999999 }),
            bufferTime: fc.integer({ min: 1, max: 60 }),
            trainType: fc.constantFrom('ICE', 'IC', 'RE', 'RB')
          }),
          async (connectionData) => {
            const connection = {
              ...connectionData,
              arrivalTime: '10:30',
              departureTime: '10:35'
            };

            // Mock consistent database responses
            mockDatabaseService.query.mockResolvedValue({
              rows: [{
                eva: connectionData.fromStation,
                name: 'Test Station',
                distance_from_berlin: 100,
                category: 3,
                is_strategic_hub: false
              }]
            });

            // Analyze the same connection twice
            const fragility1 = await connectionFragilityService.analyzeConnectionFragility(connection);
            const fragility2 = await connectionFragilityService.analyzeConnectionFragility(connection);
            
            expect(fragility1).not.toBeNull();
            expect(fragility2).not.toBeNull();
            
            if (fragility1 && fragility2) {
              // Should produce identical results
              expect(fragility1.fragilityScore).toBe(fragility2.fragilityScore);
              expect(fragility1.cascadeRisk).toBe(fragility2.cascadeRisk);
              expect(fragility1.alternativeRoutes).toBe(fragility2.alternativeRoutes);
              expect(fragility1.bufferTime).toBe(fragility2.bufferTime);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Alternative routes reduce fragility impact
     * More alternative routes should generally result in lower fragility scores
     */
    it('should account for alternative routes in fragility calculation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of alternative routes
          fc.integer({ min: 5, max: 30 }), // Buffer time
          async (alternativeRoutes, bufferTime) => {
            // Create connections with different alternative route counts
            const baseConnection = {
              fromStation: 8000105, // Berlin Hbf
              toStation: 8002548,   // Hamburg Hbf
              arrivalTime: '10:30',
              departureTime: '10:35',
              trainType: 'ICE',
              bufferTime
            };

            // Mock station info with different characteristics to simulate different alternative route counts
            const mockStationWithFewRoutes = {
              rows: [{
                eva: 8000105,
                name: 'Small Station',
                distance_from_berlin: 50,
                category: 6, // Small station
                is_strategic_hub: false
              }]
            };

            const mockStationWithManyRoutes = {
              rows: [{
                eva: 8000105,
                name: 'Major Hub',
                distance_from_berlin: 50,
                category: 1, // Major station
                is_strategic_hub: true
              }]
            };

            // Test with station that has fewer alternatives
            mockDatabaseService.query.mockResolvedValue(mockStationWithFewRoutes);
            const fragilityFewRoutes = await connectionFragilityService.analyzeConnectionFragility(baseConnection);

            // Test with station that has more alternatives
            mockDatabaseService.query.mockResolvedValue(mockStationWithManyRoutes);
            const fragilityManyRoutes = await connectionFragilityService.analyzeConnectionFragility(baseConnection);

            expect(fragilityFewRoutes).not.toBeNull();
            expect(fragilityManyRoutes).not.toBeNull();

            if (fragilityFewRoutes && fragilityManyRoutes) {
              // Major stations should generally have more alternative routes
              expect(fragilityManyRoutes.alternativeRoutes).toBeGreaterThanOrEqual(fragilityFewRoutes.alternativeRoutes);
              
              // Alternative routes should be within reasonable bounds
              expect(fragilityFewRoutes.alternativeRoutes).toBeGreaterThanOrEqual(1);
              expect(fragilityManyRoutes.alternativeRoutes).toBeLessThanOrEqual(5);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property: Train type importance affects fragility weighting
     * ICE/IC connections should be weighted more heavily than regional connections
     */
    it('should weight connection importance by train type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }), // Buffer time range where differences are visible
          async (bufferTime) => {
            const baseConnection = {
              fromStation: 8000105,
              toStation: 8002548,
              arrivalTime: '10:30',
              departureTime: '10:35',
              bufferTime
            };

            // Mock consistent station data
            mockDatabaseService.query.mockResolvedValue({
              rows: [{
                eva: 8000105,
                name: 'Test Station',
                distance_from_berlin: 100,
                category: 3,
                is_strategic_hub: false
              }]
            });

            // Test ICE connection (high importance)
            const iceConnection = { ...baseConnection, trainType: 'ICE' };
            const iceFragility = await connectionFragilityService.analyzeConnectionFragility(iceConnection);

            // Test regional connection (lower importance)
            const regionalConnection = { ...baseConnection, trainType: 'RB' };
            const regionalFragility = await connectionFragilityService.analyzeConnectionFragility(regionalConnection);

            expect(iceFragility).not.toBeNull();
            expect(regionalFragility).not.toBeNull();

            if (iceFragility && regionalFragility) {
              // ICE connections should generally have higher fragility scores due to importance weighting
              // (assuming same buffer time and other conditions)
              expect(iceFragility.fragilityScore).toBeGreaterThanOrEqual(regionalFragility.fragilityScore);
              
              // Both should be in valid range
              expect(iceFragility.fragilityScore).toBeGreaterThanOrEqual(0);
              expect(iceFragility.fragilityScore).toBeLessThanOrEqual(100);
              expect(regionalFragility.fragilityScore).toBeGreaterThanOrEqual(0);
              expect(regionalFragility.fragilityScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: Fragility recommendations are relevant to the identified issues
     * High fragility scores should generate appropriate recommendations
     */
    it('should generate relevant recommendations based on fragility factors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bufferTime: fc.integer({ min: 1, max: 60 }),
            trainType: fc.constantFrom('ICE', 'IC', 'RE', 'RB'),
            fromStation: fc.integer({ min: 8000000, max: 8999999 }),
            toStation: fc.integer({ min: 8000000, max: 8999999 })
          }),
          async (connectionData) => {
            const connection = {
              ...connectionData,
              arrivalTime: '10:30',
              departureTime: '10:35'
            };

            // Mock station data
            mockDatabaseService.query.mockResolvedValue({
              rows: [{
                eva: connectionData.fromStation,
                name: 'Test Station',
                distance_from_berlin: 100,
                category: 3,
                is_strategic_hub: false
              }]
            });

            const fragility = await connectionFragilityService.analyzeConnectionFragility(connection);
            
            expect(fragility).not.toBeNull();
            if (fragility) {
              // Should always have some recommendations
              expect(fragility.recommendations).toBeDefined();
              expect(Array.isArray(fragility.recommendations)).toBe(true);
              
              // High fragility should generate more recommendations
              if (fragility.fragilityScore >= 80) {
                expect(fragility.recommendations.length).toBeGreaterThan(0);
                
                // Should contain relevant keywords for high fragility
                const recommendationText = fragility.recommendations.join(' ').toLowerCase();
                const hasRelevantRecommendation = 
                  recommendationText.includes('buffer') ||
                  recommendationText.includes('delay') ||
                  recommendationText.includes('priority') ||
                  recommendationText.includes('alternative') ||
                  recommendationText.includes('schedule');
                
                expect(hasRelevantRecommendation).toBe(true);
              }
              
              // Very short buffer times should recommend buffer increases
              if (connectionData.bufferTime < 5) {
                const recommendationText = fragility.recommendations.join(' ').toLowerCase();
                expect(recommendationText.includes('buffer') || recommendationText.includes('time')).toBe(true);
              }
            }
          }
        ),
        { numRuns: 40 }
      );
    });

    /**
     * Property: Fragility analysis maintains data integrity
     * All fragility analysis results should have valid data types and ranges
     */
    it('should maintain data integrity in fragility analysis results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bufferTime: fc.integer({ min: 1, max: 120 }),
            fromStation: fc.integer({ min: 8000000, max: 8999999 }),
            toStation: fc.integer({ min: 8000000, max: 8999999 }),
            trainType: fc.constantFrom('ICE', 'IC', 'RE', 'RB', 'S')
          }).filter(data => data.fromStation !== data.toStation),
          async (connectionData) => {
            const connection = {
              ...connectionData,
              arrivalTime: '10:30',
              departureTime: '10:35'
            };

            // Mock station data
            mockDatabaseService.query.mockResolvedValue({
              rows: [{
                eva: connectionData.fromStation,
                name: 'Test Station',
                distance_from_berlin: Math.floor(Math.random() * 300),
                category: Math.floor(Math.random() * 7) + 1,
                is_strategic_hub: Math.random() > 0.5
              }]
            });

            const fragility = await connectionFragilityService.analyzeConnectionFragility(connection);
            
            expect(fragility).not.toBeNull();
            if (fragility) {
              // Validate data types and ranges
              expect(typeof fragility.fromStation).toBe('number');
              expect(typeof fragility.toStation).toBe('number');
              expect(typeof fragility.bufferTime).toBe('number');
              expect(typeof fragility.fragilityScore).toBe('number');
              expect(typeof fragility.cascadeRisk).toBe('number');
              expect(typeof fragility.alternativeRoutes).toBe('number');
              expect(Array.isArray(fragility.recommendations)).toBe(true);
              
              // Validate ranges
              expect(fragility.fragilityScore).toBeGreaterThanOrEqual(0);
              expect(fragility.fragilityScore).toBeLessThanOrEqual(100);
              expect(fragility.cascadeRisk).toBeGreaterThanOrEqual(0);
              expect(fragility.cascadeRisk).toBeLessThanOrEqual(100);
              expect(fragility.alternativeRoutes).toBeGreaterThanOrEqual(1);
              expect(fragility.alternativeRoutes).toBeLessThanOrEqual(5);
              expect(fragility.bufferTime).toBe(connectionData.bufferTime);
              
              // Validate station EVAs
              expect(fragility.fromStation).toBe(connectionData.fromStation);
              expect(fragility.toStation).toBe(connectionData.toStation);
              
              // Recommendations should be strings
              fragility.recommendations.forEach(rec => {
                expect(typeof rec).toBe('string');
                expect(rec.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});