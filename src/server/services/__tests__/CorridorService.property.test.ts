import * as fc from 'fast-check';
import { CorridorService } from '../CorridorService';
import { DatabaseService } from '../DatabaseService';

/**
 * Property-based tests for CorridorService
 * Feature: critical-nodes-analysis, Property 1: Corridor Data Integrity
 * Validates: Requirements 1.1, 1.2, 1.3
 */

// Mock DatabaseService for testing
class MockDatabaseService extends DatabaseService {
  private mockStations: any[] = [];
  private callCount = 0;

  constructor() {
    super();
  }

  async query(text: string, params?: any[]) {
    // Prevent infinite loops by limiting calls
    this.callCount++;
    if (this.callCount > 100) {
      throw new Error('Too many database calls - possible infinite loop');
    }

    if (text.includes('SELECT') && text.includes('corridor_stations')) {
      // Sort mock stations by distance for consistent ordering
      const sortedStations = [...this.mockStations].sort((a, b) => a.distance_from_berlin - b.distance_from_berlin);
      return {
        rows: sortedStations,
        rowCount: sortedStations.length
      } as any;
    }
    return { rows: [], rowCount: 0 } as any;
  }

  setMockStations(stations: any[]) {
    this.mockStations = stations;
    this.callCount = 0; // Reset call count when setting new data
  }
}

describe('CorridorService Property Tests', () => {
  let corridorService: CorridorService;
  let mockDb: MockDatabaseService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    corridorService = new CorridorService(mockDb);
  });

  /**
   * Property 1: Corridor Data Integrity
   * For any station identified as part of the Berlin-Hamburg corridor, 
   * the system should successfully load infrastructure and timetable data 
   * and position it correctly along the linear corridor route
   */
  describe('Property 1: Corridor Data Integrity', () => {
    test('should maintain corridor station ordering by distance from Berlin', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            eva: fc.integer({ min: 8000000, max: 8999999 }),
            name: fc.string({ minLength: 5, maxLength: 50 }),
            longitude: fc.float({ min: 8.0, max: 15.0, noNaN: true }),
            latitude: fc.float({ min: 50.0, max: 55.0, noNaN: true }),
            distance_from_berlin: fc.integer({ min: 1, max: 300 }),
            category: fc.integer({ min: 1, max: 7 }),
            platform_count: fc.integer({ min: 1, max: 20 }),
            facilities: fc.record({
              hasWiFi: fc.boolean(),
              hasTravelCenter: fc.boolean(),
              hasDBLounge: fc.boolean(),
              hasLocalPublicTransport: fc.boolean(),
              hasParking: fc.boolean(),
              steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
              hasMobilityService: fc.boolean()
            }),
            is_strategic_hub: fc.boolean()
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (mockStations) => {
          // Create stations with guaranteed unique distances by using index multiplier
          const uniqueStations = mockStations.map((station, index) => ({
            ...station,
            distance_from_berlin: (index + 1) * 10, // Guaranteed unique: 10, 20, 30, etc.
            eva: station.eva + index // Ensure unique EVAs
          }));

          // Set up mock data
          mockDb.setMockStations(uniqueStations);

          // Get corridor stations
          const stations = await corridorService.getCorridorStations();

          // Property: Stations should be ordered by distance from Berlin (strictly increasing)
          for (let i = 1; i < stations.length; i++) {
            expect(stations[i].distanceFromBerlin).toBeGreaterThan(
              stations[i - 1].distanceFromBerlin
            );
          }

          // Property: All stations should have valid coordinates
          stations.forEach(station => {
            expect(station.coordinates).toHaveLength(2);
            expect(station.coordinates[0]).toBeGreaterThan(-180);
            expect(station.coordinates[0]).toBeLessThan(180);
            expect(station.coordinates[1]).toBeGreaterThan(-90);
            expect(station.coordinates[1]).toBeLessThan(90);
          });

          // Property: Distance from Berlin should be positive
          stations.forEach(station => {
            expect(station.distanceFromBerlin).toBeGreaterThan(0);
          });
        }
      ), { numRuns: 10 });
    });

    test('should correctly calculate distance from Berlin for valid coordinates', () => {
      fc.assert(fc.property(
        fc.tuple(
          fc.float({ min: 8.0, max: 15.0, noNaN: true }), // longitude
          fc.float({ min: 50.0, max: 55.0, noNaN: true })  // latitude
        ),
        (coordinates) => {
          const distance = corridorService.calculateDistanceFromBerlin(coordinates);
          
          // Property: Distance should always be non-negative and finite
          expect(distance).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(distance)).toBe(true);
          expect(Number.isNaN(distance)).toBe(false);
          
          // Property: Distance should be reasonable for German geography
          expect(distance).toBeLessThan(1000); // Max 1000km within Germany
        }
      ), { numRuns: 15 });
    });

    test('should validate corridor position calculation', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 500 }),
        (distanceFromBerlin) => {
          const position = corridorService.getCorridorPosition(distanceFromBerlin);
          
          // Property: Position should be between 0 and 1
          expect(position).toBeGreaterThanOrEqual(0);
          expect(position).toBeLessThanOrEqual(1);
          expect(Number.isFinite(position)).toBe(true);
          
          // Property: Distance 0 should give position 0
          expect(corridorService.getCorridorPosition(0)).toBe(0);
          
          // Property: Distance >= total corridor length should give position 1
          expect(corridorService.getCorridorPosition(289)).toBe(1);
          expect(corridorService.getCorridorPosition(500)).toBe(1);
        }
      ), { numRuns: 15 });
    });

    test('should correctly identify corridor stations', () => {
      fc.assert(fc.property(
        fc.integer({ min: 8000000, max: 8999999 }),
        (eva) => {
          const isCorridorStation = corridorService.isCorridorStation(eva);
          
          // Property: Result should be boolean
          expect(typeof isCorridorStation).toBe('boolean');
          
          // Property: Known corridor stations should return true
          expect(corridorService.isCorridorStation(8011160)).toBe(true); // Berlin Hbf
          expect(corridorService.isCorridorStation(8002548)).toBe(true); // Hamburg Hbf
          
          // Property: Invalid EVA numbers should return false
          expect(corridorService.isCorridorStation(0)).toBe(false);
          expect(corridorService.isCorridorStation(-1)).toBe(false);
        }
      ), { numRuns: 10 });
    });

    test('should handle station range queries correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 10, max: 150 }),
          fc.integer({ min: 150, max: 280 })
        ),
        fc.array(
          fc.record({
            eva: fc.integer({ min: 8000000, max: 8999999 }),
            name: fc.string({ minLength: 5, maxLength: 50 }),
            longitude: fc.float({ min: 8.0, max: 15.0, noNaN: true }),
            latitude: fc.float({ min: 50.0, max: 55.0, noNaN: true }),
            distance_from_berlin: fc.integer({ min: 5, max: 300 }),
            category: fc.integer({ min: 1, max: 7 }),
            platform_count: fc.integer({ min: 1, max: 20 }),
            facilities: fc.record({
              hasWiFi: fc.boolean(),
              hasTravelCenter: fc.boolean(),
              hasDBLounge: fc.boolean(),
              hasLocalPublicTransport: fc.boolean(),
              hasParking: fc.boolean(),
              steplessAccess: fc.constantFrom('yes', 'no', 'partial'),
              hasMobilityService: fc.boolean()
            }),
            is_strategic_hub: fc.boolean()
          }),
          { minLength: 0, maxLength: 6 }
        ),
        async ([minDistance, maxDistance], mockStations) => {
          // Ensure min <= max
          const [min, max] = minDistance <= maxDistance ? [minDistance, maxDistance] : [maxDistance, minDistance];
          
          // Create stations with guaranteed unique distances within the range
          const stationsInRange = mockStations.slice(0, Math.min(mockStations.length, 5)); // Limit to 5 stations
          const uniqueStations = stationsInRange.map((station, index) => {
            const baseDistance = min + Math.floor((max - min) / (stationsInRange.length + 1)) * (index + 1);
            return {
              ...station,
              distance_from_berlin: baseDistance,
              eva: station.eva + index
            };
          });

          mockDb.setMockStations(uniqueStations);

          const stations = await corridorService.getStationsInRange(min, max);

          // Property: All returned stations should be within the specified range
          stations.forEach(station => {
            expect(station.distanceFromBerlin).toBeGreaterThanOrEqual(min);
            expect(station.distanceFromBerlin).toBeLessThanOrEqual(max);
          });

          // Property: Stations should be ordered by distance (strictly increasing due to unique distances)
          for (let i = 1; i < stations.length; i++) {
            expect(stations[i].distanceFromBerlin).toBeGreaterThan(
              stations[i - 1].distanceFromBerlin
            );
          }

          // Property: Number of returned stations should match expected count
          expect(stations.length).toBe(uniqueStations.length);
        }
      ), { numRuns: 8 });
    });

    test('should handle Berlin coordinates correctly', () => {
      // Test Berlin Hbf coordinates specifically
      const berlinCoords: [number, number] = [13.369545, 52.525589];
      const distance = corridorService.calculateDistanceFromBerlin(berlinCoords);
      
      // Property: Berlin coordinates should return very small distance (allowing for rounding)
      expect(distance).toBeLessThanOrEqual(1);
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    test('should handle edge cases in distance calculation', () => {
      // Test edge cases that might produce NaN or invalid results
      const testCases = [
        [8.0, 50.0],   // Min valid coordinates
        [15.0, 55.0],  // Max valid coordinates
        [13.369545, 52.525589], // Berlin Hbf
        [9.993682, 53.551086],  // Hamburg Hbf
      ];

      testCases.forEach(coords => {
        const distance = corridorService.calculateDistanceFromBerlin(coords as [number, number]);
        expect(Number.isFinite(distance)).toBe(true);
        expect(Number.isNaN(distance)).toBe(false);
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });
});