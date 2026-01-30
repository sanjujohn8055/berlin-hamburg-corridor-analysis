import { useState, useEffect, useCallback } from 'react';
import { CorridorStation } from '../shared/types';
import { StationDataService } from '../services/StationDataService';

interface UseCorridorMapProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface CorridorMapState {
  stations: CorridorStation[];
  selectedStation: CorridorStation | null;
  loading: boolean;
  error: string | null;
  showPriorityColors: boolean;
  showRiskZones: boolean;
  lastUpdated: Date | null;
  dataSource: 'real-api' | 'enhanced-mock';
  apiStatus: {
    stada: boolean;
    timetables: boolean;
  };
}

/**
 * Custom hook for managing corridor map state and data
 */
export const useCorridorMap = ({
  autoRefresh = false,
  refreshInterval = 30000
}: UseCorridorMapProps = {}) => {
  const [state, setState] = useState<CorridorMapState>({
    stations: [],
    selectedStation: null,
    loading: true,
    error: null,
    showPriorityColors: true,
    showRiskZones: false,
    lastUpdated: null,
    dataSource: 'enhanced-mock',
    apiStatus: {
      stada: false,
      timetables: false
    }
  });

  const stationDataService = StationDataService.getInstance();

  /**
   * Fetches corridor station data from the API
   */
  const fetchStations = useCallback(async (isManualRefresh = false) => {
    try {
      // Only show loading spinner for initial load or manual refresh
      if (state.stations.length === 0 || isManualRefresh) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Use the station data service to get data with source information
      const result = await stationDataService.fetchStations();

      setState(prev => ({
        ...prev,
        stations: result.stations,
        dataSource: result.dataSource,
        apiStatus: result.apiStatus,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error fetching stations:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [stationDataService, state.stations.length]);

  /**
   * Selects a station
   */
  const selectStation = useCallback((station: CorridorStation | null) => {
    setState(prev => ({ ...prev, selectedStation: station }));
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
    return fetchStations(true); // Pass true to indicate manual refresh
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
    const avgPriority = Math.round(priorities.reduce((sum, p) => sum + p, 0) / priorities.length);

    return {
      totalStations: stations.length,
      corridorLength: 289,
      criticalStations: stations.filter(s => s.upgradePriority >= 80).length,
      highPriorityStations: stations.filter(s => s.upgradePriority >= 60).length,
      strategicHubs: stations.filter(s => s.isStrategicHub).length,
      averagePriority: avgPriority
    };
  }, [state.stations]);

  // Auto-refresh effect
  useEffect(() => {
    fetchStations(true); // Initial load with loading spinner

    if (autoRefresh) {
      const interval = setInterval(() => fetchStations(false), refreshInterval); // Auto-refresh without loading spinner
      return () => clearInterval(interval);
    }
    
    return undefined; // Explicit return for non-cleanup case
  }, [autoRefresh, refreshInterval]); // Removed fetchStations from dependencies to prevent recreation

  return {
    // State
    stations: state.stations,
    selectedStation: state.selectedStation,
    loading: state.loading,
    error: state.error,
    showPriorityColors: state.showPriorityColors,
    showRiskZones: state.showRiskZones,
    lastUpdated: state.lastUpdated,
    dataSource: state.dataSource,
    apiStatus: state.apiStatus,

    // Actions
    selectStation,
    togglePriorityColors,
    toggleRiskZones,
    refresh,

    // Computed values
    getStationsInRange,
    getStationsByPriority,
    getCorridorStats
  };
};