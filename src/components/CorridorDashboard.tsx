import React, { useState } from 'react';
import { CorridorMap } from './CorridorMap';
import { useCorridorMap } from '../hooks/useCorridorMap';
import { CorridorStation } from '../shared/types';

/**
 * Main corridor dashboard component combining map visualization with controls and information panels
 */
export const CorridorDashboard: React.FC = () => {
  const {
    stations,
    selectedStation,
    zoomLevel,
    loading,
    error,
    showPriorityColors,
    showRiskZones,
    lastUpdated,
    selectStation,
    setZoomLevel,
    togglePriorityColors,
    toggleRiskZones,
    refresh,
    getStationsByPriority,
    getCorridorStats
  } = useCorridorMap({ autoRefresh: true, refreshInterval: 60000 });

  const [activeTab, setActiveTab] = useState<'overview' | 'priorities' | 'details'>('overview');

  const corridorStats = getCorridorStats();
  const topPriorityStations = getStationsByPriority(60);

  if (loading && stations.length === 0) {
    return (
      <div className="corridor-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Berlin-Hamburg corridor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="corridor-dashboard error">
        <div className="error-message">
          <h3>Error Loading Corridor Data</h3>
          <p>{error}</p>
          <button onClick={refresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="corridor-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Berlin-Hamburg Corridor Analysis</h1>
          <div className="header-controls">
            <div className="view-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showPriorityColors}
                  onChange={togglePriorityColors}
                />
                <span>Priority Colors</span>
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showRiskZones}
                  onChange={toggleRiskZones}
                />
                <span>Risk Zones</span>
              </label>
            </div>
            <button onClick={refresh} className="refresh-button" disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </header>

      <div className="dashboard-content">
        {/* Corridor Statistics */}
        {corridorStats && (
          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-value">{corridorStats.totalStations}</span>
              <span className="stat-label">Total Stations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corridorStats.corridorLength}km</span>
              <span className="stat-label">Corridor Length</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corridorStats.criticalStations}</span>
              <span className="stat-label">Critical Priority</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corridorStats.highPriorityStations}</span>
              <span className="stat-label">High Priority</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corridorStats.strategicHubs}</span>
              <span className="stat-label">Strategic Hubs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corridorStats.averagePriority}</span>
              <span className="stat-label">Avg Priority</span>
            </div>
          </div>
        )}

        {/* Main Map */}
        <CorridorMap
          stations={stations}
          selectedStation={selectedStation}
          onStationClick={selectStation}
          showPriorityColors={showPriorityColors}
          showRiskZones={showRiskZones}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
        />

        {/* Information Panels */}
        <div className="info-panels">
          <div className="panel-tabs">
            <button
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-button ${activeTab === 'priorities' ? 'active' : ''}`}
              onClick={() => setActiveTab('priorities')}
            >
              Priority Stations
            </button>
            <button
              className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Station Details
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'overview' && (
              <div className="overview-panel">
                <h3>Corridor Overview</h3>
                <p>
                  The Berlin-Hamburg corridor is a critical 289km railway route connecting 
                  Germany's capital with its second-largest city. This analysis system 
                  evaluates station upgrade priorities, connection fragility, and 
                  population-traffic risk zones.
                </p>
                
                <div className="overview-metrics">
                  <div className="metric-group">
                    <h4>Infrastructure Status</h4>
                    <ul>
                      <li>Strategic hubs: {corridorStats?.strategicHubs} major stations</li>
                      <li>Critical upgrades needed: {corridorStats?.criticalStations} stations</li>
                      <li>Average priority score: {corridorStats?.averagePriority}/100</li>
                    </ul>
                  </div>
                  
                  <div className="metric-group">
                    <h4>Key Characteristics</h4>
                    <ul>
                      <li>Total distance: 289 kilometers</li>
                      <li>Major endpoints: Berlin Hbf, Hamburg Hbf</li>
                      <li>Intermediate hubs: Brandenburg, Stendal, Uelzen</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'priorities' && (
              <div className="priorities-panel">
                <h3>High Priority Stations</h3>
                <div className="priority-list">
                  {topPriorityStations.map((station) => (
                    <div
                      key={station.eva}
                      className={`priority-item ${selectedStation?.eva === station.eva ? 'selected' : ''}`}
                      onClick={() => selectStation(station)}
                    >
                      <div className="priority-header">
                        <span className="station-name">{station.name}</span>
                        <span className={`priority-badge priority-${getPriorityClass(station.upgradePriority)}`}>
                          {station.upgradePriority}
                        </span>
                      </div>
                      <div className="priority-details">
                        <span>Distance: {station.distanceFromBerlin}km</span>
                        <span>Category: {station.category}</span>
                        <span>Platforms: {station.platforms}</span>
                        {station.isStrategicHub && <span className="hub-indicator">Strategic Hub</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="details-panel">
                {selectedStation ? (
                  <StationDetailsPanel station={selectedStation} />
                ) : (
                  <div className="no-selection">
                    <p>Click on a station in the map to view detailed information.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .corridor-dashboard {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .corridor-dashboard.loading,
        .corridor-dashboard.error {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4A90E2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .retry-button {
          padding: 10px 20px;
          background: #4A90E2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 15px;
        }

        .dashboard-header {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-bottom: 1px solid #e0e0e0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header h1 {
          margin: 0;
          color: #333;
          font-size: 1.8rem;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .view-toggles {
          display: flex;
          gap: 15px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-button {
          padding: 8px 16px;
          background: #4A90E2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .last-updated {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 10px;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .stats-panel {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .stat-item {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
          min-width: 120px;
          flex: 1;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: bold;
          color: #4A90E2;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-panels {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
        }

        .panel-tabs {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab-button {
          padding: 15px 25px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .tab-button.active {
          color: #4A90E2;
          border-bottom-color: #4A90E2;
        }

        .tab-button:hover {
          background: #f8f9fa;
        }

        .panel-content {
          padding: 25px;
        }

        .overview-panel h3,
        .priorities-panel h3,
        .details-panel h3 {
          margin-top: 0;
          color: #333;
        }

        .overview-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 20px;
        }

        .metric-group h4 {
          color: #4A90E2;
          margin-bottom: 10px;
        }

        .metric-group ul {
          list-style: none;
          padding: 0;
        }

        .metric-group li {
          padding: 5px 0;
          color: #666;
        }

        .priority-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .priority-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .priority-item:hover {
          background: #f8f9fa;
          border-color: #4A90E2;
        }

        .priority-item.selected {
          background: #e3f2fd;
          border-color: #4A90E2;
        }

        .priority-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .station-name {
          font-weight: bold;
          color: #333;
        }

        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        .priority-badge.priority-critical {
          background: #FF4444;
        }

        .priority-badge.priority-high {
          background: #FF8800;
        }

        .priority-badge.priority-medium {
          background: #FFAA00;
        }

        .priority-details {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #666;
          flex-wrap: wrap;
        }

        .hub-indicator {
          background: #FFD700;
          color: #333;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
        }

        .no-selection {
          text-align: center;
          color: #666;
          padding: 40px;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
          }

          .stats-panel {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          }

          .overview-metrics {
            grid-template-columns: 1fr;
          }

          .priority-details {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Station details panel component
 */
const StationDetailsPanel: React.FC<{ station: CorridorStation }> = ({ station }) => {
  return (
    <div className="station-details">
      <div className="details-header">
        <h3>{station.name}</h3>
        {station.isStrategicHub && <span className="hub-badge">Strategic Hub</span>}
      </div>

      <div className="details-grid">
        <div className="detail-section">
          <h4>Location</h4>
          <div className="detail-item">
            <span className="label">Distance from Berlin:</span>
            <span className="value">{station.distanceFromBerlin} km</span>
          </div>
          <div className="detail-item">
            <span className="label">Coordinates:</span>
            <span className="value">
              {station.coordinates[1].toFixed(4)}°N, {station.coordinates[0].toFixed(4)}°E
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Infrastructure</h4>
          <div className="detail-item">
            <span className="label">Category:</span>
            <span className="value">{station.category}</span>
          </div>
          <div className="detail-item">
            <span className="label">Platforms:</span>
            <span className="value">{station.platforms}</span>
          </div>
          <div className="detail-item">
            <span className="label">Upgrade Priority:</span>
            <span className={`value priority-${getPriorityClass(station.upgradePriority)}`}>
              {station.upgradePriority}/100
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Facilities</h4>
          <div className="facilities-grid">
            <FacilityItem label="WiFi" available={station.facilities.hasWiFi} />
            <FacilityItem label="Travel Center" available={station.facilities.hasTravelCenter} />
            <FacilityItem label="DB Lounge" available={station.facilities.hasDBLounge} />
            <FacilityItem label="Local Transport" available={station.facilities.hasLocalPublicTransport} />
            <FacilityItem label="Parking" available={station.facilities.hasParking} />
            <FacilityItem label="Mobility Service" available={station.facilities.hasMobilityService} />
          </div>
          <div className="detail-item">
            <span className="label">Stepless Access:</span>
            <span className={`value access-${station.facilities.steplessAccess}`}>
              {station.facilities.steplessAccess}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .station-details {
          max-width: 600px;
        }

        .details-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .details-header h3 {
          margin: 0;
          color: #333;
        }

        .hub-badge {
          background: #FFD700;
          color: #333;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
        }

        .details-grid {
          display: grid;
          gap: 25px;
        }

        .detail-section h4 {
          color: #4A90E2;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .label {
          color: #666;
          font-weight: 500;
        }

        .value {
          font-weight: bold;
          color: #333;
        }

        .value.priority-critical {
          color: #FF4444;
        }

        .value.priority-high {
          color: #FF8800;
        }

        .value.priority-medium {
          color: #FFAA00;
        }

        .value.access-yes {
          color: #44AA44;
        }

        .value.access-partial {
          color: #FFAA00;
        }

        .value.access-no {
          color: #FF4444;
        }

        .facilities-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
};

/**
 * Facility item component
 */
const FacilityItem: React.FC<{ label: string; available: boolean }> = ({ label, available }) => (
  <div className="facility-item">
    <span className="facility-label">{label}:</span>
    <span className={`facility-status ${available ? 'available' : 'unavailable'}`}>
      {available ? '✓' : '✗'}
    </span>
    <style>{`
      .facility-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
      }

      .facility-label {
        font-size: 13px;
        color: #666;
      }

      .facility-status {
        font-weight: bold;
        font-size: 14px;
      }

      .facility-status.available {
        color: #44AA44;
      }

      .facility-status.unavailable {
        color: #FF4444;
      }
    `}</style>
  </div>
);

/**
 * Helper function to get priority CSS class
 */
const getPriorityClass = (priority: number): string => {
  if (priority >= 80) return 'critical';
  if (priority >= 60) return 'high';
  if (priority >= 40) return 'medium';
  return 'low';
};

export default CorridorDashboard;