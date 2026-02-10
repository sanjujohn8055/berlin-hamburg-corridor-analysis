import '@testing-library/jest-dom';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCorridorMap } from '../src/hooks/useCorridorMap';
import { StationDataService } from '../src/services/StationDataService';

jest.mock('../src/services/StationDataService');

describe('useCorridorMap', () => {
  const mockStations = [
    {
      eva: 8011160,
      name: 'Berlin Hbf',
      coordinates: [13.369545, 52.525589] as [number, number],
      distanceFromBerlin: 0,
      category: 1,
      platforms: 14,
      facilities: {
        hasWiFi: true,
        hasTravelCenter: true,
        hasDBLounge: true,
        hasLocalPublicTransport: true,
        hasParking: true,
        steplessAccess: 'yes' as const,
        hasMobilityService: true,
      },
      upgradePriority: 85,
      isStrategicHub: true,
      congestionReasons: [],
      suggestions: [],
      realTimeData: {
        avgDelay: 10,
        delayedTrains: 5,
        cancelledTrains: 0,
        platformChanges: 2,
        totalDepartures: 50,
        lastUpdated: new Date().toISOString(),
      },
      dataSource: 'real-api' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const mockService = {
      fetchStations: jest.fn().mockResolvedValue({
        stations: mockStations,
        dataSource: 'real-api',
        apiStatus: { stada: true, timetables: true },
      }),
      fetchAlternativeRoutes: jest.fn().mockResolvedValue([]),
      fetchBackupStations: jest.fn().mockResolvedValue([]),
      getApiStatus: jest.fn().mockResolvedValue({
        stada: { available: true, lastCheck: new Date().toISOString() },
        timetables: { available: true, lastCheck: new Date().toISOString() },
        message: 'Real API mode',
      }),
    };
    (StationDataService.getInstance as jest.Mock).mockReturnValue(mockService);
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useCorridorMap());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.stations).toEqual([]);
  });

  it('should load stations successfully', async () => {
    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stations).toEqual(mockStations);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const mockService = {
      fetchStations: jest.fn().mockRejectedValue(new Error('API Error')),
      fetchAlternativeRoutes: jest.fn(),
      fetchBackupStations: jest.fn(),
      getApiStatus: jest.fn(),
    };
    (StationDataService.getInstance as jest.Mock).mockReturnValue(mockService);

    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should allow station selection', async () => {
    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.selectStation(mockStations[0]);
    });
    
    expect(result.current.selectedStation).toEqual(mockStations[0]);
  });

  it('should toggle priority colors', async () => {
    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialState = result.current.showPriorityColors;
    
    act(() => {
      result.current.togglePriorityColors();
    });
    
    expect(result.current.showPriorityColors).toBe(!initialState);
  });

  it('should calculate corridor stats correctly', async () => {
    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const stats = result.current.getCorridorStats();
    
    expect(stats).toBeTruthy();
    expect(stats?.totalStations).toBe(1);
    expect(stats?.strategicHubs).toBe(1);
  });

  it('should filter stations by priority', async () => {
    const { result } = renderHook(() => useCorridorMap());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const highPriority = result.current.getStationsByPriority(80);
    
    expect(highPriority).toHaveLength(1);
    expect(highPriority[0].upgradePriority).toBeGreaterThanOrEqual(80);
  });
});
