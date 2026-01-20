import React, { useState, useEffect } from 'react';
import { PriorityConfiguration } from '../shared/types';

interface PriorityConfigInterfaceProps {
  currentConfig?: PriorityConfiguration;
  onConfigChange?: (config: PriorityConfiguration) => void;
  onSaveConfig?: (configName: string, config: PriorityConfiguration) => void;
  onLoadConfig?: (configName: string) => void;
  savedConfigs?: Array<{ name: string; config: PriorityConfiguration }>;
  disabled?: boolean;
}

/**
 * Priority configuration interface component
 * Task 8.4: Implement priority configuration interface
 * Provides user controls for adjusting analysis priorities with real-time updates
 */
export const PriorityConfigInterface: React.FC<PriorityConfigInterfaceProps> = ({
  currentConfig = {
    infrastructureWeight: 0.4,
    timetableWeight: 0.3,
    populationRiskWeight: 0.3,
    focusArea: 'balanced'
  },
  onConfigChange,
  onSaveConfig,
  onLoadConfig,
  savedConfigs = [],
  disabled = false
}) => {
  const [config, setConfig] = useState<PriorityConfiguration>(currentConfig);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Preset configurations
  const presetConfigs: Array<{ name: string; config: PriorityConfiguration }> = [
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

  /**
   * Validates that weights sum to 1.0 (within tolerance)
   */
  const validateWeights = (weights: Pick<PriorityConfiguration, 'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight'>): boolean => {
    const sum = weights.infrastructureWeight + weights.timetableWeight + weights.populationRiskWeight;
    const tolerance = 0.001;
    return Math.abs(sum - 1.0) <= tolerance;
  };

  /**
   * Updates a specific weight and adjusts others proportionally
   */
  const updateWeight = (
    weightType: 'infrastructureWeight' | 'timetableWeight' | 'populationRiskWeight',
    newValue: number
  ) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    const otherWeights = (['infrastructureWeight', 'timetableWeight', 'populationRiskWeight'] as const).filter(
      key => key !== weightType
    );

    // Calculate remaining weight to distribute
    const remainingWeight = 1 - clampedValue;
    const currentOtherSum = otherWeights.reduce((sum, key) => sum + config[key], 0);

    const newConfig = { ...config };
    newConfig[weightType] = clampedValue;

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
    
    if (focusAreas.length === 1) {
      newConfig.focusArea = focusAreas[0][0] as PriorityConfiguration['focusArea'];
    } else {
      newConfig.focusArea = 'balanced';
    }

    setConfig(newConfig);
    
    // Validate and notify parent
    if (validateWeights(newConfig)) {
      setValidationError(null);
      onConfigChange?.(newConfig);
    } else {
      setValidationError('Weights must sum to 1.0');
    }
  };

  /**
   * Loads a preset configuration
   */
  const loadPreset = (presetConfig: PriorityConfiguration) => {
    setConfig(presetConfig);
    setValidationError(null);
    onConfigChange?.(presetConfig);
  };

  /**
   * Loads a saved configuration
   */
  const loadSavedConfig = (configName: string) => {
    const savedConfig = savedConfigs.find(c => c.name === configName);
    if (savedConfig) {
      setConfig(savedConfig.config);
      setValidationError(null);
      onConfigChange?.(savedConfig.config);
      onLoadConfig?.(configName);
    }
  };

  /**
   * Saves the current configuration
   */
  const saveCurrentConfig = () => {
    if (!configName.trim()) {
      setValidationError('Please enter a configuration name');
      return;
    }

    if (!validateWeights(config)) {
      setValidationError('Cannot save invalid configuration');
      return;
    }

    onSaveConfig?.(configName.trim(), config);
    setConfigName('');
    setSaveDialogOpen(false);
    setValidationError(null);
  };

  /**
   * Resets to balanced configuration
   */
  const resetToBalanced = () => {
    const balancedConfig = presetConfigs[0].config;
    setConfig(balancedConfig);
    setValidationError(null);
    onConfigChange?.(balancedConfig);
  };

  // Update internal state when external config changes
  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const weightSum = config.infrastructureWeight + config.timetableWeight + config.populationRiskWeight;
  const isValid = validateWeights(config);

  return (
    <div className="priority-config-interface">
      <div className="config-header">
        <h3>Priority Configuration</h3>
        <div className="config-status">
          <span className={`status-indicator ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? '✓' : '⚠'}
          </span>
          <span className="weight-sum">
            Sum: {weightSum.toFixed(3)} {!isValid && '(must equal 1.0)'}
          </span>
        </div>
      </div>

      {validationError && (
        <div className="validation-error">
          {validationError}
        </div>
      )}

      {/* Weight Sliders */}
      <div className="weight-controls">
        <div className="weight-control">
          <label htmlFor="infrastructure-weight">
            Infrastructure Priority
            <span className="weight-value">{(config.infrastructureWeight * 100).toFixed(1)}%</span>
          </label>
          <input
            id="infrastructure-weight"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.infrastructureWeight}
            onChange={(e) => updateWeight('infrastructureWeight', parseFloat(e.target.value))}
            disabled={disabled}
            className="weight-slider infrastructure"
          />
          <div className="weight-description">
            Focus on station upgrades, platform capacity, and facility improvements
          </div>
        </div>

        <div className="weight-control">
          <label htmlFor="timetable-weight">
            Timetable Priority
            <span className="weight-value">{(config.timetableWeight * 100).toFixed(1)}%</span>
          </label>
          <input
            id="timetable-weight"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.timetableWeight}
            onChange={(e) => updateWeight('timetableWeight', parseFloat(e.target.value))}
            disabled={disabled}
            className="weight-slider timetable"
          />
          <div className="weight-description">
            Focus on connection reliability, buffer times, and schedule optimization
          </div>
        </div>

        <div className="weight-control">
          <label htmlFor="population-weight">
            Population Risk Priority
            <span className="weight-value">{(config.populationRiskWeight * 100).toFixed(1)}%</span>
          </label>
          <input
            id="population-weight"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.populationRiskWeight}
            onChange={(e) => updateWeight('populationRiskWeight', parseFloat(e.target.value))}
            disabled={disabled}
            className="weight-slider population"
          />
          <div className="weight-description">
            Focus on high-traffic areas and population density impact zones
          </div>
        </div>
      </div>

      {/* Focus Area Display */}
      <div className="focus-area-display">
        <h4>Current Focus Area</h4>
        <div className={`focus-badge focus-${config.focusArea}`}>
          {config.focusArea.charAt(0).toUpperCase() + config.focusArea.slice(1)}
        </div>
      </div>

      {/* Preset Configurations */}
      <div className="preset-configs">
        <h4>Preset Configurations</h4>
        <div className="preset-buttons">
          {presetConfigs.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.config)}
              disabled={disabled}
              className="preset-button"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Configurations */}
      {savedConfigs.length > 0 && (
        <div className="saved-configs">
          <h4>Saved Configurations</h4>
          <div className="saved-config-list">
            {savedConfigs.map((saved) => (
              <div key={saved.name} className="saved-config-item">
                <span className="config-name">{saved.name}</span>
                <button
                  onClick={() => loadSavedConfig(saved.name)}
                  disabled={disabled}
                  className="load-button"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={() => setSaveDialogOpen(true)}
          disabled={disabled || !isValid}
          className="save-button"
        >
          Save Configuration
        </button>
        <button
          onClick={resetToBalanced}
          disabled={disabled}
          className="reset-button"
        >
          Reset to Balanced
        </button>
      </div>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h4>Save Configuration</h4>
            <input
              type="text"
              placeholder="Enter configuration name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="config-name-input"
              autoFocus
            />
            <div className="dialog-buttons">
              <button onClick={saveCurrentConfig} className="confirm-button">
                Save
              </button>
              <button 
                onClick={() => {
                  setSaveDialogOpen(false);
                  setConfigName('');
                  setValidationError(null);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .priority-config-interface {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-width: 600px;
        }

        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .config-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.4rem;
        }

        .config-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .status-indicator {
          font-weight: bold;
          font-size: 16px;
        }

        .status-indicator.valid {
          color: #44AA44;
        }

        .status-indicator.invalid {
          color: #FF4444;
        }

        .weight-sum {
          color: #666;
          font-family: monospace;
        }

        .validation-error {
          background: #FFE6E6;
          color: #CC0000;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 14px;
          border: 1px solid #FFCCCC;
        }

        .weight-controls {
          margin-bottom: 30px;
        }

        .weight-control {
          margin-bottom: 25px;
        }

        .weight-control label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .weight-value {
          font-family: monospace;
          background: #f5f5f5;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .weight-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          outline: none;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .weight-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .weight-slider.infrastructure {
          background: linear-gradient(to right, #e3f2fd, #1976d2);
        }

        .weight-slider.timetable {
          background: linear-gradient(to right, #fff3e0, #f57c00);
        }

        .weight-slider.population {
          background: linear-gradient(to right, #fce4ec, #c2185b);
        }

        .weight-description {
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .focus-area-display {
          margin-bottom: 25px;
          text-align: center;
        }

        .focus-area-display h4 {
          margin-bottom: 10px;
          color: #333;
        }

        .focus-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .focus-badge.focus-balanced {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .focus-badge.focus-infrastructure {
          background: #e3f2fd;
          color: #1976d2;
        }

        .focus-badge.focus-timetable {
          background: #fff3e0;
          color: #f57c00;
        }

        .focus-badge.focus-population {
          background: #fce4ec;
          color: #c2185b;
        }

        .preset-configs, .saved-configs {
          margin-bottom: 25px;
        }

        .preset-configs h4, .saved-configs h4 {
          margin-bottom: 12px;
          color: #333;
          font-size: 1.1rem;
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }

        .preset-button {
          padding: 10px 15px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .preset-button:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #4A90E2;
        }

        .preset-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .saved-config-list {
          max-height: 150px;
          overflow-y: auto;
        }

        .saved-config-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          margin-bottom: 6px;
          background: #fafafa;
        }

        .config-name {
          font-weight: 500;
          color: #333;
        }

        .load-button {
          padding: 4px 12px;
          background: #4A90E2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .load-button:hover:not(:disabled) {
          background: #357abd;
        }

        .load-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .save-button, .reset-button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .save-button {
          background: #44AA44;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          background: #369936;
        }

        .save-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .reset-button {
          background: #f5f5f5;
          color: #333;
          border: 1px solid #ddd;
        }

        .reset-button:hover:not(:disabled) {
          background: #e8e8e8;
        }

        .reset-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .save-dialog {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          min-width: 300px;
        }

        .save-dialog h4 {
          margin-top: 0;
          margin-bottom: 16px;
          color: #333;
        }

        .config-name-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .config-name-input:focus {
          outline: none;
          border-color: #4A90E2;
        }

        .dialog-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .confirm-button, .cancel-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .confirm-button {
          background: #4A90E2;
          color: white;
        }

        .confirm-button:hover {
          background: #357abd;
        }

        .cancel-button {
          background: #f5f5f5;
          color: #333;
          border: 1px solid #ddd;
        }

        .cancel-button:hover {
          background: #e8e8e8;
        }

        @media (max-width: 768px) {
          .priority-config-interface {
            padding: 16px;
          }

          .config-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }

          .preset-buttons {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default PriorityConfigInterface;