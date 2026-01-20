import { useState, useEffect, useCallback } from 'react';
import { PriorityConfiguration } from '../shared/types';

interface UsePriorityConfigProps {
  initialConfig?: PriorityConfiguration;
  autoSave?: boolean;
  storageKey?: string;
}

interface SavedConfig {
  name: string;
  config: PriorityConfiguration;
  createdAt: Date;
}

/**
 * Custom hook for managing priority configuration state
 * Handles configuration persistence, validation, and real-time updates
 */
export const usePriorityConfig = ({
  initialConfig = {
    infrastructureWeight: 0.4,
    timetableWeight: 0.3,
    populationRiskWeight: 0.3,
    focusArea: 'balanced'
  },
  autoSave = true,
  storageKey = 'corridor-priority-config'
}: UsePriorityConfigProps = {}) => {
  const [currentConfig, setCurrentConfig] = useState<PriorityConfiguration>(initialConfig);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [activeConfigName, setActiveConfigName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validates that weights sum to 1.0 (within tolerance)
   */
  const validateConfig = useCallback((config: PriorityConfiguration): boolean => {
    const sum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
    const tolerance = 0.001;
    return Math.abs(sum - 1.0) <= tolerance;
  }, []);

  /**
   * Loads configuration from localStorage
   */
  const loadFromStorage = useCallback(() => {
    try {
      setIsLoading(true);
      
      // Load current config
      const storedConfig = localStorage.getItem(storageKey);
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        if (validateConfig(parsed)) {
          setCurrentConfig(parsed);
        }
      }

      // Load saved configs
      const storedSavedConfigs = localStorage.getItem(`${storageKey}-saved`);
      if (storedSavedConfigs) {
        const parsed = JSON.parse(storedSavedConfigs);
        setSavedConfigs(parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        })));
      }

      // Load active config name
      const storedActiveName = localStorage.getItem(`${storageKey}-active`);
      if (storedActiveName) {
        setActiveConfigName(storedActiveName);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load configuration from storage');
      console.error('Error loading priority config:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, validateConfig]);

  /**
   * Saves configuration to localStorage
   */
  const saveToStorage = useCallback((config: PriorityConfiguration) => {
    if (!autoSave) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      setError(null);
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Error saving priority config:', err);
    }
  }, [storageKey, autoSave]);

  /**
   * Updates the current configuration
   */
  const updateConfig = useCallback((newConfig: PriorityConfiguration) => {
    if (!validateConfig(newConfig)) {
      setError('Invalid configuration: weights must sum to 1.0');
      return false;
    }

    setCurrentConfig(newConfig);
    saveToStorage(newConfig);
    setError(null);
    return true;
  }, [validateConfig, saveToStorage]);

  /**
   * Saves a named configuration
   */
  const saveNamedConfig = useCallback((name: string, config: PriorityConfiguration) => {
    if (!validateConfig(config)) {
      setError('Cannot save invalid configuration');
      return false;
    }

    const newSavedConfig: SavedConfig = {
      name: name.trim(),
      config,
      createdAt: new Date()
    };

    const updatedSavedConfigs = [
      ...savedConfigs.filter(c => c.name !== name.trim()),
      newSavedConfig
    ].sort((a, b) => a.name.localeCompare(b.name));

    setSavedConfigs(updatedSavedConfigs);
    setActiveConfigName(name.trim());

    try {
      localStorage.setItem(`${storageKey}-saved`, JSON.stringify(updatedSavedConfigs));
      localStorage.setItem(`${storageKey}-active`, name.trim());
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to save named configuration');
      console.error('Error saving named config:', err);
      return false;
    }
  }, [savedConfigs, storageKey, validateConfig]);

  /**
   * Loads a named configuration
   */
  const loadNamedConfig = useCallback((name: string) => {
    const savedConfig = savedConfigs.find(c => c.name === name);
    if (!savedConfig) {
      setError(`Configuration "${name}" not found`);
      return false;
    }

    setCurrentConfig(savedConfig.config);
    setActiveConfigName(name);
    saveToStorage(savedConfig.config);

    try {
      localStorage.setItem(`${storageKey}-active`, name);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to set active configuration');
      console.error('Error setting active config:', err);
      return false;
    }
  }, [savedConfigs, storageKey, saveToStorage]);

  /**
   * Deletes a named configuration
   */
  const deleteNamedConfig = useCallback((name: string) => {
    const updatedSavedConfigs = savedConfigs.filter(c => c.name !== name);
    setSavedConfigs(updatedSavedConfigs);

    if (activeConfigName === name) {
      setActiveConfigName(null);
      localStorage.removeItem(`${storageKey}-active`);
    }

    try {
      localStorage.setItem(`${storageKey}-saved`, JSON.stringify(updatedSavedConfigs));
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to delete configuration');
      console.error('Error deleting config:', err);
      return false;
    }
  }, [savedConfigs, activeConfigName, storageKey]);

  /**
   * Resets to default balanced configuration
   */
  const resetToDefault = useCallback(() => {
    const defaultConfig: PriorityConfiguration = {
      infrastructureWeight: 0.4,
      timetableWeight: 0.3,
      populationRiskWeight: 0.3,
      focusArea: 'balanced'
    };

    setCurrentConfig(defaultConfig);
    setActiveConfigName(null);
    saveToStorage(defaultConfig);

    try {
      localStorage.removeItem(`${storageKey}-active`);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to reset configuration');
      console.error('Error resetting config:', err);
      return false;
    }
  }, [storageKey, saveToStorage]);

  /**
   * Gets preset configurations
   */
  const getPresetConfigs = useCallback((): Array<{ name: string; config: PriorityConfiguration }> => {
    return [
      {
        name: 'Balanced',
        config: {
          infrastructureWeight: 0.4,
          timetableWeight: 0.3,
          populationRiskWeight: 0.3,
          focusArea: 'balanced'
        }
      },
      {
        name: 'Infrastructure Focus',
        config: {
          infrastructureWeight: 0.6,
          timetableWeight: 0.2,
          populationRiskWeight: 0.2,
          focusArea: 'infrastructure'
        }
      },
      {
        name: 'Timetable Focus',
        config: {
          infrastructureWeight: 0.2,
          timetableWeight: 0.6,
          populationRiskWeight: 0.2,
          focusArea: 'timetable'
        }
      },
      {
        name: 'Population Risk Focus',
        config: {
          infrastructureWeight: 0.2,
          timetableWeight: 0.2,
          populationRiskWeight: 0.6,
          focusArea: 'population'
        }
      }
    ];
  }, []);

  /**
   * Loads a preset configuration
   */
  const loadPresetConfig = useCallback((presetName: string) => {
    const presets = getPresetConfigs();
    const preset = presets.find(p => p.name === presetName);
    
    if (!preset) {
      setError(`Preset "${presetName}" not found`);
      return false;
    }

    setCurrentConfig(preset.config);
    setActiveConfigName(null);
    saveToStorage(preset.config);

    try {
      localStorage.removeItem(`${storageKey}-active`);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to load preset configuration');
      console.error('Error loading preset:', err);
      return false;
    }
  }, [getPresetConfigs, storageKey, saveToStorage]);

  /**
   * Gets configuration summary for display
   */
  const getConfigSummary = useCallback(() => {
    const weights = {
      infrastructure: currentConfig.infrastructureWeight,
      timetable: currentConfig.timetableWeight,
      population: currentConfig.populationRiskWeight
    };

    const maxWeight = Math.max(...Object.values(weights));
    const dominantAreas = Object.entries(weights)
      .filter(([, weight]) => weight === maxWeight)
      .map(([area]) => area);

    return {
      isValid: validateConfig(currentConfig),
      focusArea: currentConfig.focusArea,
      dominantAreas,
      weightSum: Object.values(weights).reduce((sum, w) => sum + w, 0),
      activeConfigName
    };
  }, [currentConfig, validateConfig, activeConfigName]);

  // Load configuration on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return {
    // State
    currentConfig,
    savedConfigs: savedConfigs.map(c => ({ name: c.name, config: c.config })),
    activeConfigName,
    isLoading,
    error,

    // Actions
    updateConfig,
    saveNamedConfig,
    loadNamedConfig,
    deleteNamedConfig,
    resetToDefault,
    loadPresetConfig,

    // Utilities
    validateConfig,
    getPresetConfigs,
    getConfigSummary,

    // Manual storage operations
    loadFromStorage,
    saveToStorage: () => saveToStorage(currentConfig)
  };
};