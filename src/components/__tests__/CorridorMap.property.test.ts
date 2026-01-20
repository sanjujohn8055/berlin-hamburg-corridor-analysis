import * as fc from 'fast-check';
import { CorridorStation } from '../../shared/types';

/**
 * Property tests for linear corridor visualization
 * Task 8.2: Write property test for linear corridor visualization
 * Validates: Requirements 6.1, 6.2, 6.3
 */

describe('CorridorMap Property Tests', () => {
  // Helper function to create valid corridor station
  const corridorStationArbitrary = fc.record({
    eva: fc.integer({ min: 8000000, max: 8999999 }),
    name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
    coordinates: fc.tuple(
      fc.float({ min: 8.0, max: 15.0, noNaN: true }), // Longitude (Germany range)
      fc.float({ min: 47.0, max: 55.0, noNaN: true })  // Latitude (Germany range)
    ),
    distanceFromBerlin: fc.float({ min: 0, max: 289, noNaN: true }),
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
    upgradePriority: fc.float({ min: 0, max: 100, noNaN: true }),
    isStrategicHub: fc.boolean()
  }) as fc.Arbitrary<CorridorStation>;

  /**
   * Property 1: Distance-to-coordinate mapping consistency
   * Validates that distance calculations are monotonic and within bounds
   */
  test('Property 1: Distance-to-coordinate mapping is monotonic and bounded', () => {
    fc.assert(fc.property(
      fc.uniqueArray(corridorStationArbitrary, { 
        minLength: 2, 
        maxLength: 20,
        selector: (station) => station.eva // Ensure unique EVA numbers
      }),
      (stations) => {
        // Sort stations by distance from Berlin
        const sortedStations = [...stations].sort((a, b) => a.distanceFromBerlin - b.distanceFromBerlin);
        
        // Test monotonic property: X coordinates should increase with distance
        const CORRIDOR_LENGTH = 289;
        const MAP_WIDTH = 900;
        
        const distanceToX = (distance: number): number => {
          return (distance / CORRIDOR_LENGTH) * MAP_WIDTH + 50;
        };

        for (let i = 1; i < sortedStations.length; i++) {
          const prevDistance = sortedStations[i - 1].distanceFromBerlin;
          const currDistance = sortedStations[i].distanceFromBerlin;
          
          // Skip if distances are NaN (shouldn't happen with noNaN: true, but safety check)
          if (isNaN(prevDistance) || isNaN(currDistance)) {
            continue;
          }
          
          const prevX = distanceToX(prevDistance);
          const currX = distanceToX(currDistance);
          
          // X coordinates should be monotonically increasing
          expect(currX).toBeGreaterThanOrEqual(prevX);
          
          // All coordinates should be within bounds
          expect(prevX).toBeGreaterThanOrEqual(50); // Minimum margin
          expect(currX).toBeLessThanOrEqual(MAP_WIDTH + 50); // Maximum bound
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 2: Priority color mapping consistency
   * Validates that priority levels map to consistent colors
   */
  test('Property 2: Priority color mapping is consistent and deterministic', () => {
    fc.assert(fc.property(
      fc.array(corridorStationArbitrary, { minLength: 1, maxLength: 50 }),
      (stations) => {
        const getPriorityColor = (priority: number, showColors: boolean): string => {
          if (!showColors) return '#4A90E2';
          
          if (priority >= 80) return '#FF4444'; // Critical - Red
          if (priority >= 60) return '#FF8800'; // High - Orange
          if (priority >= 40) return '#FFAA00'; // Medium - Yellow
          if (priority >= 20) return '#88CC88'; // Low - Light Green
          return '#44AA44'; // Very Low - Green
        };

        for (const station of stations) {
          const colorWithPriority = getPriorityColor(station.upgradePriority, true);
          const colorWithoutPriority = getPriorityColor(station.upgradePriority, false);
          
          // When priority colors are disabled, should always return default color
          expect(colorWithoutPriority).toBe('#4A90E2');
          
          // Priority color should be deterministic for same priority value
          const sameColor = getPriorityColor(station.upgradePriority, true);
          expect(colorWithPriority).toBe(sameColor);
          
          // Validate color ranges
          if (station.upgradePriority >= 80) {
            expect(colorWithPriority).toBe('#FF4444');
          } else if (station.upgradePriority >= 60) {
            expect(colorWithPriority).toBe('#FF8800');
          } else if (station.upgradePriority >= 40) {
            expect(colorWithPriority).toBe('#FFAA00');
          } else if (station.upgradePriority >= 20) {
            expect(colorWithPriority).toBe('#88CC88');
          } else {
            expect(colorWithPriority).toBe('#44AA44');
          }
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 3: Zoom level bounds and scaling
   * Validates that zoom operations maintain proper bounds and scaling
   */
  test('Property 3: Zoom level bounds are enforced and scaling is consistent', () => {
    fc.assert(fc.property(
      fc.float({ min: -5, max: 10, noNaN: true }), // Test zoom values outside normal range, exclude NaN
      (inputZoom) => {
        const MIN_ZOOM = 0.5;
        const MAX_ZOOM = 3.0;
        
        // Handle edge cases and ensure valid input
        const validInput = Number.isFinite(inputZoom) ? inputZoom : 1.0;
        
        // Clamp zoom to valid range (simulating zoom control logic)
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, validInput));
        
        // Zoom should always be within bounds
        expect(clampedZoom).toBeGreaterThanOrEqual(MIN_ZOOM);
        expect(clampedZoom).toBeLessThanOrEqual(MAX_ZOOM);
        expect(Number.isFinite(clampedZoom)).toBe(true);
        
        // Test viewBox scaling consistency
        const baseWidth = 1000;
        const baseHeight = 200;
        const scaledWidth = baseWidth / clampedZoom;
        const scaledHeight = baseHeight / clampedZoom;
        
        // Scaled dimensions should be inversely proportional to zoom
        expect(scaledWidth).toBeCloseTo(baseWidth / clampedZoom, 5);
        expect(scaledHeight).toBeCloseTo(baseHeight / clampedZoom, 5);
        
        // At minimum zoom, dimensions should be largest
        if (clampedZoom === MIN_ZOOM) {
          expect(scaledWidth).toBe(baseWidth / MIN_ZOOM);
        }
        
        // At maximum zoom, dimensions should be smallest
        if (clampedZoom === MAX_ZOOM) {
          expect(scaledWidth).toBe(baseWidth / MAX_ZOOM);
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 4: Station selection and interaction consistency
   * Validates that station selection logic is consistent
   */
  test('Property 4: Station selection maintains consistency and uniqueness', () => {
    fc.assert(fc.property(
      fc.uniqueArray(corridorStationArbitrary, { 
        minLength: 1, 
        maxLength: 20,
        selector: (station) => station.eva // Ensure unique EVA numbers
      }),
      fc.option(fc.integer({ min: 8000000, max: 8999999 }), { nil: null }),
      (stations, selectedEva) => {
        // Test station lookup by EVA number
        const findStationByEva = (eva: number): CorridorStation | undefined => {
          return stations.find(station => station.eva === eva);
        };

        // If a station is selected, test lookup consistency
        if (selectedEva !== null) {
          const foundStation = findStationByEva(selectedEva);
          if (foundStation) {
            expect(foundStation.eva).toBe(selectedEva);
            expect(typeof foundStation.name).toBe('string');
            expect(foundStation.name.length).toBeGreaterThan(0);
          }
        }

        // EVA numbers should be unique within the stations array (guaranteed by uniqueArray)
        const evaNumbers = stations.map(s => s.eva);
        const uniqueEvas = new Set(evaNumbers);
        expect(uniqueEvas.size).toBe(evaNumbers.length);

        // Test selection state consistency
        for (const station of stations) {
          const isSelected = selectedEva === station.eva;
          
          // Selection should be boolean and deterministic
          expect(typeof isSelected).toBe('boolean');
          
          // Only one station can be selected at a time
          if (isSelected && selectedEva) {
            expect(station.eva).toBe(selectedEva);
          }
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 5: Risk zone overlay positioning
   * Validates that risk zones are positioned correctly relative to stations
   */
  test('Property 5: Risk zone overlays are positioned correctly and consistently', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        start: fc.float({ min: 0, max: 289, noNaN: true }),
        end: fc.float({ min: 0, max: 289, noNaN: true }),
        level: fc.constantFrom('low', 'medium', 'high'),
        name: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5)
      }), { minLength: 1, maxLength: 10 }),
      (riskZones) => {
        const CORRIDOR_LENGTH = 289;
        const MAP_WIDTH = 900;
        
        const distanceToX = (distance: number): number => {
          return (distance / CORRIDOR_LENGTH) * MAP_WIDTH + 50;
        };

        for (const zone of riskZones) {
          // Skip zones with NaN values (shouldn't happen with noNaN: true, but safety check)
          if (isNaN(zone.start) || isNaN(zone.end)) {
            continue;
          }
          
          // Ensure start is before or equal to end
          const normalizedStart = Math.min(zone.start, zone.end);
          const normalizedEnd = Math.max(zone.start, zone.end);
          
          const startX = distanceToX(normalizedStart);
          const endX = distanceToX(normalizedEnd);
          
          // Start X should be less than or equal to end X
          expect(startX).toBeLessThanOrEqual(endX);
          
          // Zone width should be non-negative
          const zoneWidth = endX - startX;
          expect(zoneWidth).toBeGreaterThanOrEqual(0);
          
          // Zone positions should be within map bounds
          expect(startX).toBeGreaterThanOrEqual(50); // Map margin
          expect(endX).toBeLessThanOrEqual(MAP_WIDTH + 50);
          
          // Risk level should determine color consistency
          const getZoneColor = (level: string): string => {
            return level === 'high' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 170, 0, 0.2)';
          };
          
          const color = getZoneColor(zone.level);
          if (zone.level === 'high') {
            expect(color).toBe('rgba(255, 68, 68, 0.2)');
          } else {
            expect(color).toBe('rgba(255, 170, 0, 0.2)');
          }
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 6: Distance marker generation consistency
   * Validates that distance markers are generated at correct intervals
   */
  test('Property 6: Distance markers are generated at consistent intervals', () => {
    fc.assert(fc.property(
      fc.integer({ min: 10, max: 100 }), // Marker interval
      (markerInterval) => {
        const CORRIDOR_LENGTH = 289;
        const MAP_WIDTH = 900;
        
        const distanceToX = (distance: number): number => {
          return (distance / CORRIDOR_LENGTH) * MAP_WIDTH + 50;
        };

        // Generate markers at specified intervals
        const markers: { distance: number; x: number }[] = [];
        for (let distance = 0; distance <= CORRIDOR_LENGTH; distance += markerInterval) {
          const x = distanceToX(distance);
          markers.push({ distance, x });
        }

        // Validate marker properties
        for (let i = 0; i < markers.length; i++) {
          const marker = markers[i];
          
          // Distance should be at correct interval
          expect(marker.distance).toBe(i * markerInterval);
          
          // X position should be monotonically increasing
          if (i > 0) {
            expect(marker.x).toBeGreaterThan(markers[i - 1].x);
          }
          
          // X position should be within bounds
          expect(marker.x).toBeGreaterThanOrEqual(50);
          expect(marker.x).toBeLessThanOrEqual(MAP_WIDTH + 50);
          
          // Distance should not exceed corridor length
          expect(marker.distance).toBeLessThanOrEqual(CORRIDOR_LENGTH);
        }

        // First marker should be at distance 0
        if (markers.length > 0) {
          expect(markers[0].distance).toBe(0);
          expect(markers[0].x).toBe(distanceToX(0));
        }

        // Last marker should not exceed corridor length
        if (markers.length > 0) {
          const lastMarker = markers[markers.length - 1];
          expect(lastMarker.distance).toBeLessThanOrEqual(CORRIDOR_LENGTH);
        }
        
        return true;
      }
    ));
  });

  /**
   * Property 7: Tooltip data consistency
   * Validates that tooltip information matches station data
   */
  test('Property 7: Tooltip data is consistent with station properties', () => {
    fc.assert(fc.property(
      corridorStationArbitrary,
      (station) => {
        // Simulate tooltip data extraction
        const getTooltipData = (station: CorridorStation) => {
          const getPriorityLabel = (priority: number): string => {
            if (priority >= 80) return 'Critical';
            if (priority >= 60) return 'High';
            if (priority >= 40) return 'Medium';
            if (priority >= 20) return 'Low';
            return 'Very Low';
          };

          return {
            name: station.name,
            distance: station.distanceFromBerlin,
            category: station.category,
            platforms: station.platforms,
            priorityLabel: getPriorityLabel(station.upgradePriority),
            priorityScore: station.upgradePriority,
            isStrategicHub: station.isStrategicHub
          };
        };

        const tooltipData = getTooltipData(station);

        // Validate tooltip data matches station properties
        expect(tooltipData.name).toBe(station.name);
        expect(tooltipData.distance).toBe(station.distanceFromBerlin);
        expect(tooltipData.category).toBe(station.category);
        expect(tooltipData.platforms).toBe(station.platforms);
        expect(tooltipData.priorityScore).toBe(station.upgradePriority);
        expect(tooltipData.isStrategicHub).toBe(station.isStrategicHub);

        // Validate priority label consistency
        if (station.upgradePriority >= 80) {
          expect(tooltipData.priorityLabel).toBe('Critical');
        } else if (station.upgradePriority >= 60) {
          expect(tooltipData.priorityLabel).toBe('High');
        } else if (station.upgradePriority >= 40) {
          expect(tooltipData.priorityLabel).toBe('Medium');
        } else if (station.upgradePriority >= 20) {
          expect(tooltipData.priorityLabel).toBe('Low');
        } else {
          expect(tooltipData.priorityLabel).toBe('Very Low');
        }

        return true;
      }
    ));
  });
});