import * as fc from 'fast-check';
import { UpgradePriorityService } from '../UpgradePriorityService';
import { DatabaseService } from '../DatabaseService';
import { TimetableApiService } from '../TimetableApiService';
import { CorridorStation, PriorityConfiguration, StationFacilities } from '../../../shared/types';

/**
 * Property-based tests for UpgradePriorityService
 * Feature: critical-nodes-analysis, Property 2: Upgrade Priority Consistency
 * Validates: Requirements 2.1, 2.2, 2.3
 */

// Mock services for testing
class MockDatabaseService extends DatabaseService {
  constructor() {
    super();
  }

  async query(text: string, params?: any[]) {
    return { rows: [], rowCount: 0 } as any;
  }
}

class MockTimetableApiService extends TimetableApiService {
  private mockTrafficVolumes = new Map<number, number>();

  constructor() {
    super({} as any);
  }

  async getDailyTrafficVolume(eva: number, date: string): Promise<number> {
    return this.mockTrafficVolumes.get(eva) || 100;
  }

  setMockTrafficVolume(eva: number, volume: number) {
    this.mockTrafficVolumes.set(eva, volume);
  }
}

describe('UpgradePriorityService Property Tests', () => {
  let priorityService: UpgradePriorityService;
  let mockDb: MockDatabaseService;
  let mockTimetable: MockTimetableApiService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockTimetable = new MockTimetableApiService();
    priorityService = new UpgradePriorityService(mockDb, mockTimetable);
  });

  /**
   * Property 2: Upgrade Priority Consistency
   * For any corridor station with valid infrastructure and traffic data, 
   * the upgrade priority calculator should produce a score between 0-100 
   * that correctly incorporates traffic volume, capacity constraints, 
   * strategic importance, and facility deficits
   */
  describe('Property 2: Upgrade Priority Consistency', () => {
    test('should always produce scores between 0-100 for any valid station data', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          eva: fc.integer({ min: 8000000, max: 8999999 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          coordinates: fc.tuple(
            fc.float({ min: 8.0, max: 15.0 }),
            fc.float({ min: 50.0, max: 55.0 })
          ),
          distanceFromBerlin: fc.integer({ min: 0, max: 300 }),
          category: fc.integer({ min: 1, max: 7 }),
          platforms: fc.integer({ min: 1, max: 20 }),
          facilities: fc.record({
            hasWiFi: fc.boolean(),
            hasTravelCenter: fc.boolean(),
            hasDBLounge: fc.boolean(),
            hasLocalPublicTransport: fc.boolean(),
            hasParking: fc.boolean(),
            steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
            hasMobilityService: fc.boolean()
          }),
          upgradePriority: fc.constant(0),
          isStrategicHub: fc.boolean()
        }),
        async (stationData) => {
          // Create a properly typed station
          const station: CorridorStation = {
            ...stationData,
            facilities: {
              ...stationData.facilities,
              steplessAccess: stationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };

          const metrics = await priorityService.calculateStationPriority(station);

          // Property: All individual scores should be between 0-100
          expect(metrics.trafficVolume).toBeGreaterThanOrEqual(0);
          expect(metrics.trafficVolume).toBeLessThanOrEqual(100);
          expect(metrics.capacityConstraints).toBeGreaterThanOrEqual(0);
          expect(metrics.capacityConstraints).toBeLessThanOrEqual(100);
          expect(metrics.strategicImportance).toBeGreaterThanOrEqual(0);
          expect(metrics.strategicImportance).toBeLessThanOrEqual(100);
          expect(metrics.facilityDeficits).toBeGreaterThanOrEqual(0);
          expect(metrics.facilityDeficits).toBeLessThanOrEqual(100);

          // Property: Composite score should be between 0-100
          expect(metrics.compositeScore).toBeGreaterThanOrEqual(0);
          expect(metrics.compositeScore).toBeLessThanOrEqual(100);

          // Property: All scores should be integers (rounded)
          expect(Number.isInteger(metrics.trafficVolume)).toBe(true);
          expect(Number.isInteger(metrics.capacityConstraints)).toBe(true);
          expect(Number.isInteger(metrics.strategicImportance)).toBe(true);
          expect(Number.isInteger(metrics.facilityDeficits)).toBe(true);
          expect(Number.isInteger(metrics.compositeScore)).toBe(true);
        }
      ), { numRuns: 10 });
    });

    test('should produce higher strategic importance for lower category stations', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          eva: fc.integer({ min: 8000000, max: 8999999 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          coordinates: fc.tuple(fc.float({ min: 8.0, max: 15.0 }), fc.float({ min: 50.0, max: 55.0 })),
          distanceFromBerlin: fc.integer({ min: 0, max: 300 }),
          platforms: fc.integer({ min: 1, max: 20 }),
          facilities: fc.record({
            hasWiFi: fc.boolean(),
            hasTravelCenter: fc.boolean(),
            hasDBLounge: fc.boolean(),
            hasLocalPublicTransport: fc.boolean(),
            hasParking: fc.boolean(),
            steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
            hasMobilityService: fc.boolean()
          }),
          upgradePriority: fc.constant(0),
          isStrategicHub: fc.boolean()
        }),
        fc.integer({ min: 1, max: 6 }), // category1
        fc.integer({ min: 2, max: 7 }), // category2
        async (baseStationData, category1, category2) => {
          // Ensure category1 < category2 (lower number = higher importance)
          const [lowerCat, higherCat] = category1 < category2 ? [category1, category2] : [category2, category1];
          
          const station1: CorridorStation = {
            ...baseStationData,
            category: lowerCat,
            facilities: {
              ...baseStationData.facilities,
              steplessAccess: baseStationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };
          
          const station2: CorridorStation = {
            ...baseStationData,
            category: higherCat,
            eva: baseStationData.eva + 1,
            facilities: {
              ...baseStationData.facilities,
              steplessAccess: baseStationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };

          const metrics1 = await priorityService.calculateStationPriority(station1);
          const metrics2 = await priorityService.calculateStationPriority(station2);

          // Property: Lower category number should have higher strategic importance
          if (lowerCat < higherCat) {
            expect(metrics1.strategicImportance).toBeGreaterThanOrEqual(metrics2.strategicImportance);
          }
        }
      ), { numRuns: 8 });
    });

    test('should produce higher capacity constraint scores for stations with fewer platforms', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          eva: fc.integer({ min: 8000000, max: 8999999 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          coordinates: fc.tuple(fc.float({ min: 8.0, max: 15.0 }), fc.float({ min: 50.0, max: 55.0 })),
          distanceFromBerlin: fc.integer({ min: 0, max: 300 }),
          category: fc.integer({ min: 1, max: 7 }),
          facilities: fc.record({
            hasWiFi: fc.boolean(),
            hasTravelCenter: fc.boolean(),
            hasDBLounge: fc.boolean(),
            hasLocalPublicTransport: fc.boolean(),
            hasParking: fc.boolean(),
            steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
            hasMobilityService: fc.boolean()
          }),
          upgradePriority: fc.constant(0),
          isStrategicHub: fc.boolean()
        }),
        fc.integer({ min: 1, max: 5 }), // platforms1
        fc.integer({ min: 6, max: 15 }), // platforms2
        async (baseStationData, platforms1, platforms2) => {
          const station1: CorridorStation = {
            ...baseStationData,
            platforms: platforms1,
            facilities: {
              ...baseStationData.facilities,
              steplessAccess: baseStationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };
          
          const station2: CorridorStation = {
            ...baseStationData,
            platforms: platforms2,
            eva: baseStationData.eva + 1,
            facilities: {
              ...baseStationData.facilities,
              steplessAccess: baseStationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };

          const metrics1 = await priorityService.calculateStationPriority(station1);
          const metrics2 = await priorityService.calculateStationPriority(station2);

          // Property: Station with fewer platforms should have higher capacity constraints
          expect(metrics1.capacityConstraints).toBeGreaterThanOrEqual(metrics2.capacityConstraints);
        }
      ), { numRuns: 8 });
    });

    test('should produce higher facility deficit scores for stations with fewer facilities', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          eva: fc.integer({ min: 8000000, max: 8999999 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          coordinates: fc.tuple(fc.float({ min: 8.0, max: 15.0 }), fc.float({ min: 50.0, max: 55.0 })),
          distanceFromBerlin: fc.integer({ min: 0, max: 300 }),
          category: fc.integer({ min: 1, max: 3 }), // Focus on major stations
          platforms: fc.integer({ min: 5, max: 15 }),
          upgradePriority: fc.constant(0),
          isStrategicHub: fc.boolean()
        }),
        async (baseStationData) => {
          // Station with minimal facilities
          const minimalStation: CorridorStation = {
            ...baseStationData,
            facilities: {
              hasWiFi: false,
              hasTravelCenter: false,
              hasDBLounge: false,
              hasLocalPublicTransport: false,
              hasParking: false,
              steplessAccess: 'no',
              hasMobilityService: false
            }
          };

          // Station with comprehensive facilities
          const comprehensiveStation: CorridorStation = {
            ...baseStationData,
            eva: baseStationData.eva + 1,
            facilities: {
              hasWiFi: true,
              hasTravelCenter: true,
              hasDBLounge: true,
              hasLocalPublicTransport: true,
              hasParking: true,
              steplessAccess: 'yes',
              hasMobilityService: true
            }
          };

          const minimalMetrics = await priorityService.calculateStationPriority(minimalStation);
          const comprehensiveMetrics = await priorityService.calculateStationPriority(comprehensiveStation);

          // Property: Station with fewer facilities should have higher facility deficits
          expect(minimalMetrics.facilityDeficits).toBeGreaterThan(comprehensiveMetrics.facilityDeficits);
        }
      ), { numRuns: 6 });
    });

    test('should produce consistent results for identical station data', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          eva: fc.integer({ min: 8000000, max: 8999999 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          coordinates: fc.tuple(fc.float({ min: 8.0, max: 15.0 }), fc.float({ min: 50.0, max: 55.0 })),
          distanceFromBerlin: fc.integer({ min: 0, max: 300 }),
          category: fc.integer({ min: 1, max: 7 }),
          platforms: fc.integer({ min: 1, max: 20 }),
          facilities: fc.record({
            hasWiFi: fc.boolean(),
            hasTravelCenter: fc.boolean(),
            hasDBLounge: fc.boolean(),
            hasLocalPublicTransport: fc.boolean(),
            hasParking: fc.boolean(),
            steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
            hasMobilityService: fc.boolean()
          }),
          upgradePriority: fc.constant(0),
          isStrategicHub: fc.boolean()
        }),
        async (stationData) => {
          const station: CorridorStation = {
            ...stationData,
            facilities: {
              ...stationData.facilities,
              steplessAccess: stationData.facilities.steplessAccess as 'yes' | 'no' | 'partial'
            }
          };

          // Calculate metrics twice
          const metrics1 = await priorityService.calculateStationPriority(station);
          const metrics2 = await priorityService.calculateStationPriority(station);

          // Property: Results should be identical for identical inputs
          expect(metrics1.trafficVolume).toBe(metrics2.trafficVolume);
          expect(metrics1.capacityConstraints).toBe(metrics2.capacityConstraints);
          expect(metrics1.strategicImportance).toBe(metrics2.strategicImportance);
          expect(metrics1.facilityDeficits).toBe(metrics2.facilityDeficits);
          expect(metrics1.compositeScore).toBe(metrics2.compositeScore);
        }
      ), { numRuns: 8 });
    });
  });
});