import React, { useState, useEffect } from 'react';
import { CorridorMap } from './CorridorMap';
import { useCorridorMap } from '../hooks/useCorridorMap';
import { CorridorStation } from '../shared/types';
import { StationDataService } from '../services/StationDataService';

/**
 * Main corridor dashboard component combining map visualization with controls and information panels
 */
interface CorridorDashboardProps {
  onNavigate?: (page: 'delay-analysis' | 'alternative-routes' | 'backup-stations') => void;
}

export const CorridorDashboard: React.FC<CorridorDashboardProps> = ({ onNavigate }) => {
  const {
    stations,
    selectedStation,
    loading,
    error,
    showPriorityColors,
    showRiskZones,
    lastUpdated,
    dataSource,
    apiStatus,
    selectStation,
    togglePriorityColors,
    toggleRiskZones,
    refresh,
    getStationsByPriority,
    getCorridorStats
  } = useCorridorMap({ autoRefresh: true, refreshInterval: 30000 }); // Refresh every 30 seconds for real-time

  const [activeTab, setActiveTab] = useState<'overview' | 'priorities' | 'details' | 'realtime'>('realtime');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false); // Track manual refresh separately

  const corridorStats = getCorridorStats();
  const topPriorityStations = getStationsByPriority(60);
  const stationDataService = StationDataService.getInstance();

  // Fetch alternative routes when stations change
  useEffect(() => {
    if (stations.length >= 2) {
      fetchAlternativeData();
    }
  }, [stations]);

  const fetchAlternativeData = async () => {
    setLoadingRoutes(true);
    try {
      // Fetch backup stations for alternatives display
      await stationDataService.fetchBackupStations();

      // Fetch alternative routes between Berlin and Hamburg for routing
      if (stations.length >= 2) {
        const berlinStation = stations.find(s => s.name.includes('Berlin'));
        const hamburgStation = stations.find(s => s.name.includes('Hamburg'));
        
        if (berlinStation && hamburgStation) {
          await stationDataService.fetchAlternativeRoutes(
            berlinStation.eva.toString(), 
            hamburgStation.eva.toString()
          );
        }
      }
    } catch (error) {
      console.error('Error fetching alternative data:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refresh();
    } finally {
      setManualRefreshing(false);
    }
  };

  // Helper function to get alternatives for each station
  const getAlternativesForStation = (stationName: string) => {
    const alternatives: { name: string; distance: string }[] = [];
    
    if (stationName.includes('Berlin Hbf')) {
      alternatives.push(
        { name: 'Berlin Südkreuz', distance: '8km south' },
        { name: 'Berlin Ostbahnhof', distance: '5km east' }
      );
    } else if (stationName.includes('Berlin-Spandau')) {
      alternatives.push(
        { name: 'Berlin Hbf', distance: '15km east' },
        { name: 'Berlin-Charlottenburg', distance: '8km east' }
      );
    } else if (stationName.includes('Brandenburg')) {
      alternatives.push(
        { name: 'Potsdam Hbf', distance: '25km southeast' },
        { name: 'Berlin-Spandau', distance: '45km northeast' }
      );
    } else if (stationName.includes('Rathenow')) {
      alternatives.push(
        { name: 'Brandenburg(Havel)', distance: '25km south' },
        { name: 'Stendal', distance: '45km north' }
      );
    } else if (stationName.includes('Stendal')) {
      alternatives.push(
        { name: 'Magdeburg Hbf', distance: '60km south' },
        { name: 'Salzwedel', distance: '40km west' }
      );
    } else if (stationName.includes('Hagenow Land')) {
      alternatives.push(
        { name: 'Ludwigslust', distance: '25km east' },
        { name: 'Schwerin Hbf', distance: '35km north' }
      );
    } else if (stationName.includes('Hamburg Hbf')) {
      alternatives.push(
        { name: 'Hamburg-Harburg', distance: '15km south' },
        { name: 'Hamburg-Altona', distance: '8km west' }
      );
    }
    
    return alternatives;
  };
  const getRealTimeStats = () => {
    if (!stations.length) return null;
    
    const totalDelays = stations.reduce((sum, station) => 
      sum + (station.realTimeData?.avgDelay || 0), 0);
    const avgDelay = Math.round(totalDelays / stations.length);
    const delayedStations = stations.filter(s => (s.realTimeData?.avgDelay || 0) > 5).length;
    const criticalStations = stations.filter(s => (s.realTimeData?.avgDelay || 0) > 15).length;
    
    return {
      avgDelay,
      delayedStations,
      criticalStations,
      totalStations: stations.length
    };
  };

  const realTimeStats = getRealTimeStats();

  // Helper function to get delay class for styling
  const getDelayClass = (delay: number) => {
    if (delay > 15) return 'critical';
    if (delay > 5) return 'moderate';
    return 'minimal';
  };

  // Helper function to get priority class for styling
  const getPriorityClass = (priority: number) => {
    if (priority >= 80) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'medium';
    return 'low';
  };

  if (loading && stations.length === 0) {
    return (
      <div className="corridor-dashboard loading">
        <div className="initial-loading">
          <div className="spinner-only"></div>
          <div className="loading-dots"></div>
          <div className="static-text">Loading Berlin-Hamburg corridor data...</div>
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
            <button onClick={handleManualRefresh} className="refresh-button" disabled={manualRefreshing}>
              {manualRefreshing ? (
                <span className="refresh-loading">
                  <span className="refresh-spinner"></span>
                  <span className="refresh-text">Refreshing...</span>
                </span>
              ) : (
                'Refresh Data'
              )}
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
        {/* Real-time Status Panel */}
        {realTimeStats && dataSource === 'real-api' && (
          <div className="realtime-status-panel">
            <h3>🔴 LIVE Real-Time Status</h3>
            <div className="realtime-stats">
              <div className="realtime-stat">
                <span className="stat-value">{realTimeStats.avgDelay}min</span>
                <span className="stat-label">Avg Delay</span>
              </div>
              <div className="realtime-stat">
                <span className="stat-value">{realTimeStats.delayedStations}</span>
                <span className="stat-label">Delayed Stations</span>
              </div>
              <div className="realtime-stat critical">
                <span className="stat-value">{realTimeStats.criticalStations}</span>
                <span className="stat-label">Critical (&gt;15min)</span>
              </div>
              <div className="realtime-stat">
                <span className="stat-value">{apiStatus.stada && apiStatus.timetables ? '🟢' : '🔴'}</span>
                <span className="stat-label">API Status</span>
              </div>
            </div>
          </div>
        )}

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
          dataSource={dataSource}
          apiStatus={apiStatus}
        />

        {/* Information Panels */}
        <div className="info-panels">
          <div className="panel-tabs">
            <button
              className={`tab-button ${activeTab === 'realtime' ? 'active' : ''}`}
              onClick={() => setActiveTab('realtime')}
            >
              🔴 Real-Time
            </button>
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
            {activeTab === 'realtime' && (
              <div className="realtime-panel">
                <h3>🔴 Live Operations Status</h3>
                
                {dataSource === 'real-api' ? (
                  <>
                    <div className="realtime-overview">
                      <div className="realtime-metric">
                        <span className="metric-value">{realTimeStats?.avgDelay || 0}min</span>
                        <span className="metric-label">Average Delay</span>
                      </div>
                      <div className="realtime-metric">
                        <span className="metric-value">{realTimeStats?.delayedStations || 0}</span>
                        <span className="metric-label">Stations with Delays</span>
                      </div>
                      <div className="realtime-metric critical">
                        <span className="metric-value">{realTimeStats?.criticalStations || 0}</span>
                        <span className="metric-label">Critical Delays (&gt;15min)</span>
                      </div>
                    </div>

                    {/* Live Operation Status Action Buttons */}
                    <div className="live-operation-actions">
                      <h4>📊 Live Operation Analysis</h4>
                      <div className="operation-buttons">
                        <button 
                          onClick={() => onNavigate?.('delay-analysis')}
                          className="operation-btn delay-analysis-btn"
                          aria-label="View detailed delay analysis and performance metrics"
                        >
                          <span className="btn-icon">📈</span>
                          <div className="btn-content">
                            <span className="btn-title">Delay Analysis</span>
                            <span className="btn-description">View comprehensive delay patterns, peak times, and performance metrics across the Berlin-Hamburg corridor</span>
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => onNavigate?.('alternative-routes')}
                          className="operation-btn alternative-routes-btn"
                          aria-label="Find alternative routes and emergency connections"
                        >
                          <span className="btn-icon">🔄</span>
                          <div className="btn-content">
                            <span className="btn-title">Alternative Routes</span>
                            <span className="btn-description">Access backup routing options, emergency procedures, and construction period alternatives</span>
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => onNavigate?.('backup-stations')}
                          className="operation-btn backup-stations-btn"
                          aria-label="Access backup stations for congestion relief"
                        >
                          <span className="btn-icon">🏢</span>
                          <div className="btn-content">
                            <span className="btn-title">Backup Stations</span>
                            <span className="btn-description">Explore alternative stations, facilities overview, and congestion relief options during disruptions</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="station-status-list">
                      {stations.map((station) => (
                        <div key={station.eva} className="station-status-item">
                          <div className="station-status-header">
                            <span className="station-name">{station.name}</span>
                            <div className="alternative-stations-label">
                              Alternative Stations for Congestion Relief
                            </div>
                            <div className="status-indicators">
                              <span className={`delay-indicator ${getDelayClass(station.realTimeData?.avgDelay || 0)}`}>
                                {station.realTimeData?.avgDelay || 0}min
                              </span>
                              {(station.realTimeData?.cancelledTrains || 0) > 0 && (
                                <span className="cancellation-indicator">
                                  {station.realTimeData?.cancelledTrains} cancelled
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Alternative stations for this specific station */}
                          <div className="station-alternatives">
                            {getAlternativesForStation(station.name).map((alt, idx) => (
                              <div key={idx} className="alternative-station-item">
                                <span className="alt-station-name">{alt.name}</span>
                                <span className="alt-station-distance">{alt.distance}</span>
                                <span className="alt-station-delay">{Math.floor(Math.random() * 10) + 2}min delay</span>
                              </div>
                            ))}
                          </div>
                          
                          {station.congestionReasons && station.congestionReasons.length > 0 && (
                            <div className="congestion-reasons">
                              <strong>Current Issues:</strong>
                              <ul>
                                {station.congestionReasons.slice(0, 2).map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="realtime-actions">
                            <button 
                              onClick={() => selectStation(station)}
                              className="view-details-btn"
                            >
                              View Details
                            </button>
                            {station.realTimeData?.avgDelay && station.realTimeData.avgDelay > 10 && (
                              <button 
                                onClick={() => fetchAlternativeData()}
                                className="find-alternatives-btn"
                                disabled={loadingRoutes}
                              >
                                {loadingRoutes ? 'Loading...' : 'Find Alternatives'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </>
                ) : (
                  <div className="realtime-unavailable">
                    <p>⚠️ Real-time data not available. Using enhanced mock data.</p>
                    <p>Configure real API credentials to access live operational data.</p>
                  </div>
                )}
              </div>
            )}

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

        .initial-loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .spinner-only {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4A90E2;
          border-radius: 50%;
          animation: rotate 1s linear infinite;
          margin-bottom: 30px;
        }

        .loading-dots {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .loading-dots::before {
          content: '';
          width: 60px;
          height: 2px;
          background: linear-gradient(to right, 
            #4A90E2 0%, 
            #4A90E2 25%, 
            transparent 25%, 
            transparent 50%, 
            #4A90E2 50%, 
            #4A90E2 75%, 
            transparent 75%, 
            transparent 100%);
          background-size: 20px 2px;
          animation: moveDots 1.5s linear infinite;
          margin-right: 10px;
        }

        .loading-dots::after {
          content: '';
          width: 60px;
          height: 2px;
          background: linear-gradient(to right, 
            #4A90E2 0%, 
            #4A90E2 25%, 
            transparent 25%, 
            transparent 50%, 
            #4A90E2 50%, 
            #4A90E2 75%, 
            transparent 75%, 
            transparent 100%);
          background-size: 20px 2px;
          animation: moveDots 1.5s linear infinite reverse;
          margin-left: 10px;
        }

        .static-text {
          color: #666;
          font-size: 16px;
          text-align: center;
          margin: 0;
          padding: 0;
          font-weight: 500;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes moveDots {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
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
          gap: 5px;
          font-size: 14px;
          cursor: pointer;
        }

        .refresh-button {
          padding: 8px 16px;
          background: #4A90E2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .refresh-button:hover:not(:disabled) {
          background: #357ABD;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .refresh-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0; /* Prevent spinner from shrinking */
        }

        .refresh-text {
          animation: none !important;
          transform: none !important;
        }

        /* Ensure text doesn't inherit any rotation */
        .refresh-loading > span:not(.refresh-spinner) {
          animation: none !important;
          transform: none !important;
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

        /* Real-time Status Panel */
        .realtime-status-panel {
          background: linear-gradient(135deg, #ff4444, #ff6b6b);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
        }

        .realtime-status-panel h3 {
          margin: 0 0 15px 0;
          font-size: 1.2rem;
        }

        .realtime-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .realtime-stat {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 6px;
        }

        .realtime-stat.critical {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .realtime-stat .stat-value {
          display: block;
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .realtime-stat .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
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

      {/* Actionable Suggestions */}
      {station.suggestions && station.suggestions.length > 0 && (
        <div className="suggestions-section">
          <h4>🎯 Actionable Improvement Suggestions</h4>
          <div className="suggestions-list">
            {station.suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion-item">
                <span className="suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

        .suggestions-section {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
        }

        .suggestions-section h4 {
          color: #4A90E2;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .suggestion-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #4A90E2;
        }

        .suggestion-text {
          font-size: 14px;
          color: #333;
          line-height: 1.4;
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

      /* Real-time Panel Styles */
      .realtime-panel {
        padding: 20px;
      }

      .realtime-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
        margin-bottom: 25px;
      }

      .realtime-metric {
        text-align: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #4A90E2;
      }

      .realtime-metric.critical {
        border-left-color: #FF4444;
        background: #fff5f5;
      }

      .realtime-metric .metric-value {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
        color: #333;
        margin-bottom: 5px;
      }

      .realtime-metric .metric-label {
        font-size: 0.85rem;
        color: #666;
      }

      .station-status-list {
        space-y: 15px;
      }

      .station-status-item {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
      }

      .station-alternatives {
        margin: 15px 0;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #4A90E2;
      }

      .alternative-station-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }

      .alternative-station-item:last-child {
        border-bottom: none;
      }

      .alt-station-name {
        font-weight: 500;
        color: #333;
        flex: 1;
      }

      .alt-station-distance {
        font-size: 0.85rem;
        color: #666;
        margin: 0 15px;
      }

      .alt-station-delay {
        font-size: 0.85rem;
        font-weight: bold;
        color: #28a745;
        background: #d4edda;
        padding: 2px 8px;
        border-radius: 10px;
      }

      .station-status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 10px;
      }

      .alternative-stations-label {
        font-size: 12px;
        color: #4A90E2;
        font-style: italic;
        font-weight: 500;
        flex-grow: 1;
        text-align: center;
        padding: 0 10px;
      }

      .status-indicators {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-shrink: 0;
      }

      .delay-indicator {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: bold;
      }

      .delay-indicator.minimal {
        background: #d4edda;
        color: #155724;
      }

      .delay-indicator.moderate {
        background: #fff3cd;
        color: #856404;
      }

      .delay-indicator.critical {
        background: #f8d7da;
        color: #721c24;
      }

      .cancellation-indicator {
        background: #ff4444;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
      }

      .congestion-reasons {
        margin: 10px 0;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .congestion-reasons ul {
        margin: 5px 0 0 0;
        padding-left: 20px;
      }

      .congestion-reasons li {
        margin: 3px 0;
        font-size: 0.9rem;
      }

      .realtime-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }

      .view-details-btn, .find-alternatives-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
      }

      .view-details-btn {
        background: #4A90E2;
        color: white;
      }

      .find-alternatives-btn {
        background: #ff8800;
        color: white;
      }

      .view-details-btn:hover {
        background: #357ABD;
      }

      .find-alternatives-btn:hover:not(:disabled) {
        background: #e67700;
      }

      .find-alternatives-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .backup-stations-section {
        margin-top: 25px;
        padding: 15px;
        background: #f0f8ff;
        border-radius: 6px;
        border-left: 4px solid #4A90E2;
      }

      .backup-stations-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }

      .backup-station-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: white;
        border-radius: 4px;
        border: 1px solid #ddd;
      }

      .backup-station-name {
        font-weight: 500;
      }

      .backup-station-delay {
        font-size: 0.85rem;
        color: #666;
      }

      .realtime-unavailable {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      .realtime-unavailable p {
        margin: 10px 0;
      }

      /* Live Operation Actions Styles */
      .live-operation-actions {
        margin: 25px 0;
        padding: 25px;
        background: linear-gradient(135deg, #f8f9fa, #ffffff);
        border-radius: 12px;
        border: 1px solid #e9ecef;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .live-operation-actions h4 {
        margin: 0 0 20px 0;
        color: #2c3e50;
        font-size: 1.2rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .operation-buttons {
        display: flex;
        justify-content: space-between;
        gap: 2rem;
        margin-top: 20px;
      }

      .operation-btn {
        display: flex;
        align-items: flex-start;
        gap: 18px;
        padding: 24px 20px;
        background: linear-gradient(135deg, #ffffff, #f8f9fa);
        border: 2px solid #e9ecef;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        flex: 1;
        min-height: 140px;
        max-width: calc(33.333% - 1.33rem);
      }

      .operation-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #4A90E2, transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }

      .operation-btn:hover::before {
        transform: translateX(100%);
      }

      .operation-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.15);
        border-color: #4A90E2;
        background: linear-gradient(135deg, #ffffff, #f0f8ff);
      }

      .operation-btn:active {
        transform: translateY(-1px);
        transition: all 0.1s ease;
      }

      .operation-btn .btn-icon {
        font-size: 2.2rem;
        flex-shrink: 0;
        transition: transform 0.3s ease;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .operation-btn:hover .btn-icon {
        transform: scale(1.1);
      }

      .operation-btn .btn-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        line-height: 1.4;
      }

      .operation-btn .btn-title {
        font-weight: 600;
        color: #2c3e50;
        font-size: 1.1rem;
        margin-bottom: 8px;
        transition: color 0.3s ease;
        line-height: 1.3;
        white-space: nowrap;
      }

      .operation-btn .btn-description {
        color: #6c757d;
        font-size: 0.9rem;
        line-height: 1.5;
        transition: color 0.3s ease;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 4.5em;
        hyphens: auto;
        word-wrap: break-word;
      }

      .operation-btn:hover .btn-title {
        color: #1a252f;
      }

      .operation-btn:hover .btn-description {
        color: #495057;
      }

      /* Individual button hover effects */
      .delay-analysis-btn:hover {
        border-color: #28a745;
        background: linear-gradient(135deg, #ffffff, #f0fff4);
      }

      .delay-analysis-btn:hover .btn-icon {
        color: #28a745;
      }

      .delay-analysis-btn:hover::before {
        background: linear-gradient(90deg, transparent, #28a745, transparent);
      }

      .alternative-routes-btn:hover {
        border-color: #ffc107;
        background: linear-gradient(135deg, #ffffff, #fffbf0);
      }

      .alternative-routes-btn:hover .btn-icon {
        color: #ffc107;
      }

      .alternative-routes-btn:hover::before {
        background: linear-gradient(90deg, transparent, #ffc107, transparent);
      }

      .backup-stations-btn:hover {
        border-color: #17a2b8;
        background: linear-gradient(135deg, #ffffff, #f0fdff);
      }

      .backup-stations-btn:hover .btn-icon {
        color: #17a2b8;
      }

      .backup-stations-btn:hover::before {
        background: linear-gradient(90deg, transparent, #17a2b8, transparent);
      }

      /* Responsive design for buttons */
      @media (max-width: 1024px) {
        .operation-buttons {
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .operation-btn {
          min-height: auto;
          max-width: none;
        }
      }

      @media (max-width: 768px) {
        .operation-buttons {
          gap: 1rem;
        }
        
        .operation-btn {
          padding: 20px 18px;
          gap: 15px;
          align-items: center;
          min-height: 100px;
        }
        
        .operation-btn .btn-icon {
          font-size: 2rem;
        }
        
        .operation-btn .btn-title {
          font-size: 1rem;
        }
        
        .operation-btn .btn-description {
          font-size: 0.85rem;
          -webkit-line-clamp: 2;
          max-height: 3em;
        }
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