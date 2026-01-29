import React, { useState, useEffect } from 'react';
import { Train, TrainStop } from '../shared/types';

interface DelayAnalysis {
  peakDelayTimes: Array<{
    hour: number;
    avgDelay: number;
    description: string;
  }>;
  delaysByTrainType: Array<{
    trainType: string;
    avgDelay: number;
    reliability: number;
  }>;
  delaysByStation: Array<{
    station: string;
    avgDelay: number;
    issues: string;
  }>;
  recommendations: string[];
}

export const TrainTimetables: React.FC = () => {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [delayAnalysis, setDelayAnalysis] = useState<DelayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    direction: 'all',
    trainType: 'all'
  });
  const [activeTab, setActiveTab] = useState<'timetables' | 'analysis' | 'details'>('timetables');

  // Fetch trains data
  const fetchTrains = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.direction !== 'all') params.append('direction', filters.direction);
      if (filters.trainType !== 'all') params.append('trainType', filters.trainType);
      
      const response = await fetch(`/api/trains?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTrains(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch trains');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch delay analysis
  const fetchDelayAnalysis = async () => {
    try {
      const response = await fetch('/api/delay-analysis');
      const data = await response.json();
      
      if (data.success) {
        setDelayAnalysis(data.data);
      }
    } catch (err) {
      console.error('Error fetching delay analysis:', err);
    }
  };

  // Fetch detailed train information
  const fetchTrainDetails = async (trainNumber: string) => {
    try {
      const response = await fetch(`/api/trains/${trainNumber}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedTrain(data.data);
        setActiveTab('details');
      }
    } catch (err) {
      console.error('Error fetching train details:', err);
    }
  };

  useEffect(() => {
    fetchTrains();
    fetchDelayAnalysis();
  }, [filters]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrains();
      if (selectedTrain) {
        fetchTrainDetails(selectedTrain.trainNumber);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTrain]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return '#28a745';
      case 'minor-delay': return '#ffc107';
      case 'delayed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-time': return '✅';
      case 'minor-delay': return '⚠️';
      case 'delayed': return '🚨';
      default: return '❓';
    }
  };

  if (loading && trains.length === 0) {
    return (
      <div className="train-timetables loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading train timetables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="train-timetables error">
        <div className="error-message">
          <h3>Error Loading Train Data</h3>
          <p>{error}</p>
          <button onClick={fetchTrains} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="train-timetables">
      <header className="timetables-header">
        <div className="header-content">
          <h1>🚄 Berlin-Hamburg Train Timetables (2026 Construction Period)</h1>
          <div className="construction-notice">
            <span className="construction-icon">🚧</span>
            <span className="construction-text">
              Major construction Aug 2025 - Apr 2026: Journey times +45min, reduced frequency
            </span>
          </div>
          <div className="header-controls">
            <div className="filters">
              <select 
                value={filters.direction} 
                onChange={(e) => setFilters({...filters, direction: e.target.value})}
              >
                <option value="all">All Directions</option>
                <option value="berlin-hamburg">Berlin → Hamburg</option>
                <option value="hamburg-berlin">Hamburg → Berlin</option>
              </select>
              
              <select 
                value={filters.trainType} 
                onChange={(e) => setFilters({...filters, trainType: e.target.value})}
              >
                <option value="all">All Train Types</option>
                <option value="ICE">ICE (High Speed)</option>
                <option value="RE">RE (Regional Express)</option>
              </select>
            </div>
            
            <button onClick={fetchTrains} className="refresh-button" disabled={loading}>
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="timetables-content">
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'timetables' ? 'active' : ''}`}
            onClick={() => setActiveTab('timetables')}
          >
            📋 Train List
          </button>
          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 Delay Analysis
          </button>
          {selectedTrain && (
            <button 
              className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              🔍 {selectedTrain.trainNumber} Details
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'timetables' && (
            <div className="trains-list">
              <div className="trains-summary">
                <div className="summary-stat">
                  <span className="stat-value">{trains.length}</span>
                  <span className="stat-label">Total Trains</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">
                    {trains.filter(t => t.realTimeStatus?.status === 'on-time').length}
                  </span>
                  <span className="stat-label">On Time</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">
                    {trains.filter(t => t.realTimeStatus?.status === 'delayed').length}
                  </span>
                  <span className="stat-label">Delayed</span>
                </div>
              </div>

              <div className="trains-grid">
                {trains.map((train) => (
                  <div 
                    key={train.trainNumber} 
                    className={`train-card ${selectedTrain?.trainNumber === train.trainNumber ? 'selected' : ''}`}
                    onClick={() => fetchTrainDetails(train.trainNumber)}
                  >
                    <div className="train-header">
                      <div className="train-info">
                        <span className="train-number">{train.trainNumber}</span>
                        <span className="train-type">{train.trainType}</span>
                        {train.line && <span className="train-line">Line {train.line}</span>}
                        {train.constructionImpact && <span className="construction-badge">🚧</span>}
                      </div>
                      <div className="train-status">
                        <span 
                          className="status-indicator"
                          style={{ color: getStatusColor(train.realTimeStatus?.status || 'unknown') }}
                        >
                          {getStatusIcon(train.realTimeStatus?.status || 'unknown')}
                        </span>
                        <span className="delay-info">
                          {train.realTimeStatus?.overallDelay || 0}min delay
                        </span>
                      </div>
                    </div>
                    
                    <div className="train-route">
                      <span className="route-text">{train.route}</span>
                      <span className="frequency">{train.frequency}</span>
                    </div>
                    
                    <div className="train-metrics">
                      <div className="metric">
                        <span className="metric-label">Reliability</span>
                        <span className="metric-value">{train.realTimeStatus?.reliability || 0}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Load</span>
                        <span className="metric-value">{train.realTimeStatus?.passengerLoad || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && delayAnalysis && (
            <div className="delay-analysis">
              <h2>📊 Delay Pattern Analysis</h2>
              
              <div className="analysis-section">
                <h3>🕐 Peak Delay Times</h3>
                <div className="peak-times-chart">
                  {delayAnalysis.peakDelayTimes.map((time) => (
                    <div key={time.hour} className="time-bar">
                      <div className="time-label">{time.hour}:00</div>
                      <div className="delay-bar">
                        <div 
                          className="delay-fill"
                          style={{ 
                            width: `${(time.avgDelay / 25) * 100}%`,
                            backgroundColor: time.avgDelay > 15 ? '#dc3545' : time.avgDelay > 8 ? '#ffc107' : '#28a745'
                          }}
                        ></div>
                      </div>
                      <div className="delay-value">{time.avgDelay}min</div>
                      <div className="delay-description">{time.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h3>🚂 Delays by Train Type</h3>
                <div className="train-type-analysis">
                  {delayAnalysis.delaysByTrainType.map((type) => (
                    <div key={type.trainType} className="type-card">
                      <div className="type-header">
                        <span className="type-name">{type.trainType}</span>
                        <span className="type-reliability">{type.reliability}% reliable</span>
                      </div>
                      <div className="type-delay">
                        Average delay: <strong>{type.avgDelay} minutes</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h3>🏢 Delays by Station</h3>
                <div className="station-delays">
                  {delayAnalysis.delaysByStation.map((station) => (
                    <div key={station.station} className="station-delay-item">
                      <div className="station-name">{station.station}</div>
                      <div className="station-delay">{station.avgDelay}min avg</div>
                      <div className="station-issues">{station.issues}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h3>💡 Key Observations & Recommendations</h3>
                <div className="recommendations">
                  {delayAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="rec-icon">💡</span>
                      <span className="rec-text">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && selectedTrain && (
            <div className="train-details">
              <div className="details-header">
                <h2>🔍 {selectedTrain.trainNumber} - Detailed Information</h2>
                <div className="train-status-large">
                  <span 
                    className="status-icon-large"
                    style={{ color: getStatusColor(selectedTrain.realTimeStatus?.status || 'unknown') }}
                  >
                    {getStatusIcon(selectedTrain.realTimeStatus?.status || 'unknown')}
                  </span>
                  <div className="status-info">
                    <div className="status-text">{selectedTrain.realTimeStatus?.status || 'Unknown'}</div>
                    <div className="delay-text">{selectedTrain.realTimeStatus?.overallDelay || 0} minutes delay</div>
                  </div>
                </div>
              </div>

              <div className="details-content">
                <div className="details-section">
                  <h3>🚉 Journey Details</h3>
                  <div className="journey-timeline">
                    {selectedTrain.realTimeStatus?.stops.map((stop, index) => (
                      <div key={index} className="timeline-stop">
                        <div className="stop-time">
                          <div className="scheduled-time">
                            {stop.scheduledArrival && (
                              <span>Arr: {stop.scheduledArrival}</span>
                            )}
                            {stop.scheduledDeparture && (
                              <span>Dep: {stop.scheduledDeparture}</span>
                            )}
                          </div>
                          {stop.delay && stop.delay > 0 && (
                            <div className="actual-time">
                              {stop.actualArrival && (
                                <span>Actual Arr: {stop.actualArrival}</span>
                              )}
                              {stop.actualDeparture && (
                                <span>Actual Dep: {stop.actualDeparture}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="stop-info">
                          <div className="stop-name">{stop.station}</div>
                          <div className="stop-platform">Platform {stop.platform}</div>
                          {stop.delay && stop.delay > 0 && (
                            <div className="stop-delay">+{stop.delay}min</div>
                          )}
                        </div>
                        <div 
                          className="stop-status"
                          style={{ color: getStatusColor(stop.status || 'unknown') }}
                        >
                          {getStatusIcon(stop.status || 'unknown')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTrain.delayHistory && (
                  <div className="details-section">
                    <h3>📈 7-Day Delay History</h3>
                    <div className="delay-history">
                      {selectedTrain.delayHistory.map((day) => (
                        <div key={day.date} className="history-day">
                          <div className="day-date">{day.date}</div>
                          <div className="day-delay">{day.avgDelay}min avg</div>
                          <div className="day-performance">{day.onTimePerformance}% on-time</div>
                          {day.cancellations > 0 && (
                            <div className="day-cancellations">{day.cancellations} cancelled</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrain.nextDepartures && (
                  <div className="details-section">
                    <h3>⏰ Next Departures</h3>
                    <div className="next-departures">
                      {selectedTrain.nextDepartures.map((departure, index) => (
                        <div key={index} className="departure-item">
                          <div className="departure-time">{departure.scheduledTime}</div>
                          <div className="departure-platform">Platform {departure.platform}</div>
                          <div className="departure-delay">
                            {departure.estimatedDelay > 0 ? `+${departure.estimatedDelay}min` : 'On time'}
                          </div>
                          <div 
                            className="departure-status"
                            style={{ color: getStatusColor(departure.status) }}
                          >
                            {getStatusIcon(departure.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .train-timetables {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .train-timetables.loading,
        .train-timetables.error {
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

        .timetables-header {
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

        .timetables-header h1 {
          margin: 0;
          color: #333;
          font-size: 1.8rem;
        }

        .construction-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 10px;
        }

        .construction-icon {
          font-size: 1.2rem;
        }

        .construction-text {
          color: #856404;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .filters {
          display: flex;
          gap: 10px;
        }

        .filters select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
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

        .refresh-button:hover:not(:disabled) {
          background: #357ABD;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .timetables-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .tab-navigation {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab-button {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .tab-button.active {
          background: #4A90E2;
          color: white;
          border-color: #4A90E2;
        }

        .tab-button:hover:not(.active) {
          background: #f5f5f5;
        }

        .trains-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .summary-stat {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: bold;
          color: #4A90E2;
          margin-bottom: 5px;
        }

        .stat-label {
          color: #666;
          font-size: 0.9rem;
        }

        .trains-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .train-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .train-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .train-card.selected {
          border: 2px solid #4A90E2;
        }

        .train-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .train-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .train-number {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
        }

        .train-type {
          background: #4A90E2;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .train-line {
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .construction-badge {
          font-size: 1.1rem;
          title: "Construction impact";
        }

        .train-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          font-size: 1.2rem;
        }

        .delay-info {
          font-size: 0.9rem;
          color: #666;
        }

        .train-route {
          margin-bottom: 15px;
        }

        .route-text {
          display: block;
          font-weight: 500;
          color: #333;
          margin-bottom: 5px;
        }

        .frequency {
          font-size: 0.9rem;
          color: #666;
        }

        .train-metrics {
          display: flex;
          justify-content: space-between;
        }

        .metric {
          text-align: center;
        }

        .metric-label {
          display: block;
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 3px;
        }

        .metric-value {
          font-weight: bold;
          color: #4A90E2;
        }

        /* Delay Analysis Styles */
        .delay-analysis {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .analysis-section {
          margin-bottom: 40px;
        }

        .analysis-section h3 {
          color: #333;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }

        .peak-times-chart {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .time-bar {
          display: grid;
          grid-template-columns: 60px 1fr 60px 200px;
          align-items: center;
          gap: 15px;
        }

        .time-label {
          font-weight: bold;
          color: #333;
        }

        .delay-bar {
          height: 20px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .delay-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .delay-value {
          font-weight: bold;
          text-align: center;
        }

        .delay-description {
          font-size: 0.9rem;
          color: #666;
        }

        .train-type-analysis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .type-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #4A90E2;
        }

        .type-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .type-name {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .type-reliability {
          color: #28a745;
          font-size: 0.9rem;
        }

        .station-delays {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }

        .station-delay-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .station-name {
          font-weight: bold;
          color: #333;
        }

        .station-delay {
          color: #dc3545;
          font-weight: bold;
        }

        .station-issues {
          font-size: 0.9rem;
          color: #666;
          font-style: italic;
        }

        .recommendations {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 15px;
          background: #e8f4fd;
          border-radius: 6px;
          border-left: 4px solid #4A90E2;
        }

        .rec-icon {
          font-size: 1.2rem;
        }

        .rec-text {
          color: #333;
          line-height: 1.4;
        }

        /* Train Details Styles */
        .train-details {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .train-status-large {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .status-icon-large {
          font-size: 2rem;
        }

        .status-info {
          text-align: right;
        }

        .status-text {
          font-size: 1.2rem;
          font-weight: bold;
          text-transform: capitalize;
        }

        .delay-text {
          color: #666;
          font-size: 0.9rem;
        }

        .details-section {
          margin-bottom: 40px;
        }

        .details-section h3 {
          color: #333;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }

        .journey-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .timeline-stop {
          display: grid;
          grid-template-columns: 200px 1fr 60px;
          align-items: center;
          gap: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .stop-time {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .scheduled-time {
          font-weight: bold;
          color: #333;
        }

        .actual-time {
          color: #dc3545;
          font-size: 0.9rem;
        }

        .stop-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stop-name {
          font-weight: bold;
          color: #333;
        }

        .stop-platform {
          color: #666;
          font-size: 0.9rem;
        }

        .stop-delay {
          color: #dc3545;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .stop-status {
          font-size: 1.5rem;
          text-align: center;
        }

        .delay-history {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .history-day {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
        }

        .day-date {
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }

        .day-delay {
          color: #dc3545;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .day-performance {
          color: #28a745;
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        .day-cancellations {
          color: #dc3545;
          font-size: 0.8rem;
        }

        .next-departures {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .departure-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
        }

        .departure-time {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }

        .departure-platform {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        .departure-delay {
          font-weight: bold;
          margin-bottom: 8px;
        }

        .departure-status {
          font-size: 1.2rem;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
          }

          .trains-grid {
            grid-template-columns: 1fr;
          }

          .time-bar {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .timeline-stop {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .details-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainTimetables;