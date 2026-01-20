import { useState, useEffect, useCallback } from 'react';
import { CorridorStation } from '../shared/types';

interface UseCorridorMapProps {
  initialZoom?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface CorridorMapState {
  stations: CorridorStation[];
  selectedStation: CorridorStation | null;
  zoomLevel: number;
  loading: boolean;
  error: string | null;
  showPriorityColors: boolean;
  showRiskZones: boolean;
  lastUpdated: Date | null;
}

/**
 * Custom hook for managing corridor map state and data
 */
export const useCorridorMap = ({
  initialZoom = 1,
  autoRefresh = false,
  refreshInterval = 30000
}: UseCorridorMapProps = {}) => {
  const [state, setState] = useState<CorridorMapState>({
    stations: [],
    selectedStation: null,
    zoomLevel: initialZoom,
    loading: true,
    error: null,
    showPriorityColors: true,
    showRiskZones: false,
    lastUpdated: null
  });

  /**
   * Fetches corridor station data from the API
   */
  const fetchStations = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Mock API call - in real implementation, this would call the backend
      const mockStations: CorridorStation[] = [
        {
          eva: 8011160,
          name: 'Berlin Hbf',
          coordinates: [13.369545, 52.525589],
          distanceFromBerlin: 0,
          category: 1,
          platforms: 14,
          facilities: {
            hasWiFi: true,
            hasTravelCenter: true,
            hasDBLounge: true,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'yes',
            hasMobilityService: true
          },
          upgradePriority: 85,
          isStrategicHub: true
        },
        {
          eva: 8010404,
          name: 'Berlin-Spandau',
          coordinates: [13.197540, 52.534722],
          distanceFromBerlin: 15,
          category: 2,
          platforms: 6,
          facilities: {
            hasWiFi: true,
            hasTravelCenter: true,
            hasDBLounge: false,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'yes',
            hasMobilityService: true
          },
          upgradePriority: 45,
          isStrategicHub: false
        },
        {
          eva: 8010050,
          name: 'Brandenburg Hbf',
          coordinates: [12.5569, 52.4108],
          distanceFromBerlin: 70,
          category: 3,
          platforms: 4,
          facilities: {
            hasWiFi: false,
            hasTravelCenter: true,
            hasDBLounge: false,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'partial',
            hasMobilityService: false
          },
          upgradePriority: 62,
          isStrategicHub: false
        },
        {
          eva: 8010424,
          name: 'Wittenberge',
          coordinates: [11.7500, 52.9833],
          distanceFromBerlin: 120,
          category: 4,
          platforms: 3,
          facilities: {
            hasWiFi: false,
            hasTravelCenter: false,
            hasDBLounge: false,
            hasLocalPublicTransport: false,
            hasParking: true,
            steplessAccess: 'no',
            hasMobilityService: false
          },
          upgradePriority: 78,
          isStrategicHub: false
        },
        {
          eva: 8010334,
          name: 'Stendal',
          coordinates: [11.8583, 52.6167],
          distanceFromBerlin: 150,
          category: 3,
          platforms: 4,
          facilities: {
            hasWiFi: false,
            hasTravelCenter: true,
            hasDBLounge: false,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'partial',
            hasMobilityService: false
          },
          upgradePriority: 55,
          isStrategicHub: false
        },
        {
          eva: 8000390,
          name: 'Uelzen',
          coordinates: [10.5667, 52.9667],
          distanceFromBerlin: 200,
          category: 4,
          platforms: 3,
          facilities: {
            hasWiFi: false,
            hasTravelCenter: false,
            hasDBLounge: false,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'no',
            hasMobilityService: false
          },
          upgradePriority: 42,
          isStrategicHub: false
        },
        {
          eva: 8000152,
          name: 'Hagenow Land',
          coordinates: [11.187500, 53.425000],
          distanceFromBerlin: 180,
          category: 4,
          platforms: 2,
          facilities: {
            hasWiFi: false,
            hasTravelCenter: false,
            hasDBLounge: false,
            hasLocalPublicTransport: false,
            hasParking: true,
            steplessAccess: 'partial',
            hasMobilityService: false
          },
          upgradePriority: 35,
          isStrategicHub: false
        },
        {
          eva: 8002548,
          name: 'Hamburg Hbf',
          coordinates: [10.006389, 53.552778],
          distanceFromBerlin: 289,
          category: 1,
          platforms: 12,
          facilities: {
            hasWiFi: true,
            hasTravelCenter: true,
            hasDBLounge: true,
            hasLocalPublicTransport: true,
            hasParking: true,
            steplessAccess: 'yes',
            hasMobilityService: true
          },
          upgradePriority: 82,
          isStrategicHub: true
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        stations: mockStations,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch station data'
      }));
    }
  }, []);

  /**
   * Selects a station
   */
  const selectStation = useCallback((station: CorridorStation | null) => {
    setState(prev => ({ ...prev, selectedStation: station }));
  }, []);

  /**
   * Updates zoom level
   */
  const setZoomLevel = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoomLevel: Math.max(0.5, Math.min(3, zoom)) }));
  }, []);

  /**
   * Toggles priority color display
   */
  const togglePriorityColors = useCallback(() => {
    setState(prev => ({ ...prev, showPriorityColors: !prev.showPriorityColors }));
  }, []);

  /**
   * Toggles risk zone display
   */
  const toggleRiskZones = useCallback(() => {
    setState(prev => ({ ...prev, showRiskZones: !prev.showRiskZones }));
  }, []);

  /**
   * Refreshes station data
   */
  const refresh = useCallback(() => {
    fetchStations();
  }, [fetchStations]);

  /**
   * Gets stations within a distance range
   */
  const getStationsInRange = useCallback((startKm: number, endKm: number): CorridorStation[] => {
    return state.stations.filter(station => 
      station.distanceFromBerlin >= startKm && station.distanceFromBerlin <= endKm
    );
  }, [state.stations]);

  /**
   * Gets stations by priority level
   */
  const getStationsByPriority = useCallback((minPriority: number): CorridorStation[] => {
    return state.stations
      .filter(station => station.upgradePriority >= minPriority)
      .sort((a, b) => b.upgradePriority - a.upgradePriority);
  }, [state.stations]);

  /**
   * Gets corridor statistics
   */
  const getCorridorStats = useCallback(() => {
    const stations = state.stations;
    if (stations.length === 0) return null;

    const priorities = stations.map(s => s.upgradePriority);
    const avgPriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;
    const criticalStations = stations.filter(s => s.upgradePriority >= 80).length;
    const highPriorityStations = stations.filter(s => s.upgradePriority >= 60).length;
    const strategicHubs = stations.filter(s => s.isStrategicHub).length;

    return {
      totalStations: stations.length,
      averagePriority: Math.round(avgPriority * 100) / 100,
      criticalStations,
      highPriorityStations,
      strategicHubs,
      corridorLength: 289
    };
  }, [state.stations]);

  // Initial data fetch
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStations, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStations]);

  return {
    // State
    stations: state.stations,
    selectedStation: state.selectedStation,
    zoomLevel: state.zoomLevel,
    loading: state.loading,
    error: state.error,
    showPriorityColors: state.showPriorityColors,
    showRiskZones: state.showRiskZones,
    lastUpdated: state.lastUpdated,

    // Actions
    selectStation,
    setZoomLevel,
    togglePriorityColors,
    toggleRiskZones,
    refresh,

    // Computed values
    getStationsInRange,
    getStationsByPriority,
    getCorridorStats
  };
};