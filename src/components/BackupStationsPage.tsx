import React, { useState, useEffect } from 'react';

interface BackupStation {
  eva: number;
  name: string;
  coordinates: [number, number];
  distanceFromBerlin: number;
  category: number;
  platforms: number;
  facilities: {
    hasWiFi: boolean;
    hasTravelCenter: boolean;
    hasDBLounge: boolean;
    hasLocalPublicTransport: boolean;
    hasParking: boolean;
    steplessAccess: string;
    hasMobilityService: boolean;
  };
  upgradePriority: number;
  isStrategicHub: boolean;
  congestionReasons: string[];
  suggestions: string[];
  realTimeData?: {
    avgDelay: number;
    delayedTrains: number;
    cancelledTrains: number;
    platformChanges: number;
    totalDepartures: number;
    lastUpdated: string;
  };
  dataSource: string;
}

interface BackupStationsPageProps {
  onBack: () => void;
}

export const BackupStationsPage: React.FC<BackupStationsPageProps> = ({ onBack }) => {
  const [backupStations, setBackupStations] = useState<BackupStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<BackupStation | null>(null);

  useEffect(() => {
    fetchBackupStations();
  }, []);

  const fetchBackupStations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backup-stations');
      const data = await response.json();
      
      if (data.success) {
        setBackupStations(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch backup stations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getDelayClass = (delay: number) => {
    if (delay > 15) return 'critical';
    if (delay > 5) return 'moderate';
    return 'minimal';
  };

  const getPriorityClass = (priority: number) => {
    if (priority >= 80) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'medium';
    return 'low';
  };

  const getStationRole = (station: BackupStation) => {
    if (station.name.includes('Berlin') && station.name.includes('Hbf')) {
      return { role: 'Primary Hub', description: 'Main Berlin terminus' };
    } else if (station.name.includes('Hamburg') && station.name.includes('Hbf')) {
      return { role: 'Primary Hub', description: 'Main Hamburg terminus' };
    } else if (station.name.includes('Harburg')) {
      return { role: 'Construction Alternative', description: 'Primary alternative during 2026 construction' };
    } else if (station.name.includes('Lüneburg')) {
      return { role: 'New ICE Stop', description: 'Added during construction period' };
    } else if (station.name.includes('Südkreuz')) {
      return { role: 'Berlin Alternative', description: 'Major Berlin hub alternative' };
    } else if (station.name.includes('Altona')) {
      return { role: 'Hamburg Alternative', description: 'Western Hamburg terminus' };
    } else if (station.isStrategicHub) {
      return { role: 'Strategic Hub', description: 'Major regional connection point' };
    } else {
      return { role: 'Regional Backup', description: 'Regional alternative station' };
    }
  };

  if (loading) {
    return (
      <div className="backup-stations-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading backup stations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backup-stations-page error">
        <div className="error-message">
          <h3>Error Loading Backup Stations</h3>
          <p>{error}</p>
          <button onClick={fetchBackupStations} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="backup-stations-page">
      <header className="page-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>🏢 Backup Stations & Alternatives</h1>
        <p className="page-subtitle">Alternative stations for congestion relief and emergency routing</p>
      </header>

      <div className="stations-content">
        {/* Overview Section */}
        <div className="overview-section">
          <h2>📊 Backup Station Overview</h2>
          <div className="overview-stats">
            <div className="stat-card">
              <span className="stat-value">{backupStations.length}</span>
              <span className="stat-label">Backup Stations</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {backupStations.filter(s => s.isStrategicHub).length}
              </span>
              <span className="stat-label">Strategic Hubs</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {backupStations.filter(s => s.realTimeData && s.realTimeData.avgDelay < 10).length}
              </span>
              <span className="stat-label">Low Delay (&lt;10min)</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {backupStations.filter(s => s.facilities.steplessAccess === 'yes').length}
              </span>
              <span className="stat-label">Fully Accessible</span>
            </div>
          </div>
        </div>

        {/* Construction Impact Notice */}
        <div className="construction-notice">
          <div className="notice-icon">🚧</div>
          <div className="notice-content">
            <h3>2026 Construction Period Backup Strategy</h3>
            <p>During major construction (Aug 2025 - Apr 2026), these backup stations provide critical alternative routing:</p>
            <ul>
              <li><strong>Hamburg-Harburg:</strong> Primary Hamburg alternative with full ICE services</li>
              <li><strong>Lüneburg:</strong> New temporary ICE stop for construction routing</li>
              <li><strong>Berlin Südkreuz:</strong> Major Berlin hub for alternative departures</li>
              <li><strong>Regional stations:</strong> Bus replacement service connections</li>
            </ul>
          </div>
        </div>

        {/* Stations Grid */}
        <div className="stations-section">
          <h2>🚉 Backup Station Details</h2>
          <div className="stations-grid">
            {backupStations.map((station) => {
              const stationRole = getStationRole(station);
              return (
                <div 
                  key={station.eva} 
                  className={`station-card ${selectedStation?.eva === station.eva ? 'selected' : ''}`}
                  onClick={() => setSelectedStation(selectedStation?.eva === station.eva ? null : station)}
                >
                  <div className="station-header">
                    <div className="station-info">
                      <h3>{station.name}</h3>
                      <div className="station-badges">
                        <span className={`role-badge role-${stationRole.role.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stationRole.role}
                        </span>
                        {station.isStrategicHub && (
                          <span className="hub-badge">Strategic Hub</span>
                        )}
                      </div>
                    </div>
                    <div className="station-distance">
                      {station.distanceFromBerlin}km
                    </div>
                  </div>

                  <div className="station-description">
                    {stationRole.description}
                  </div>

                  {/* Real-time Status */}
                  {station.realTimeData && (
                    <div className="realtime-status">
                      <div className="status-row">
                        <span className="status-label">Current Delay:</span>
                        <span className={`status-value delay-${getDelayClass(station.realTimeData.avgDelay)}`}>
                          {station.realTimeData.avgDelay}min
                        </span>
                      </div>
                      <div className="status-row">
                        <span className="status-label">Affected Trains:</span>
                        <span className="status-value">{station.realTimeData.delayedTrains}</span>
                      </div>
                      {station.realTimeData.cancelledTrains > 0 && (
                        <div className="status-row">
                          <span className="status-label">Cancellations:</span>
                          <span className="status-value cancelled">{station.realTimeData.cancelledTrains}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Facilities Overview */}
                  <div className="facilities-overview">
                    <div className="facility-icons">
                      {station.facilities.hasWiFi && <span title="WiFi">📶</span>}
                      {station.facilities.hasTravelCenter && <span title="Travel Center">🎫</span>}
                      {station.facilities.hasDBLounge && <span title="DB Lounge">🛋️</span>}
                      {station.facilities.hasLocalPublicTransport && <span title="Local Transport">🚌</span>}
                      {station.facilities.hasParking && <span title="Parking">🅿️</span>}
                      {station.facilities.steplessAccess === 'yes' && <span title="Fully Accessible">♿</span>}
                    </div>
                    <div className="platform-info">
                      {station.platforms} platforms
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedStation?.eva === station.eva && (
                    <div className="expanded-details">
                      <div className="details-section">
                        <h4>🚉 Infrastructure Details</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span>Category:</span>
                            <span>{station.category === 1 ? 'Major Hub' : station.category === 2 ? 'Regional' : 'Local'}</span>
                          </div>
                          <div className="detail-item">
                            <span>Platforms:</span>
                            <span>{station.platforms}</span>
                          </div>
                          <div className="detail-item">
                            <span>Accessibility:</span>
                            <span className={`access-${station.facilities.steplessAccess}`}>
                              {station.facilities.steplessAccess === 'yes' ? 'Fully Accessible' : 
                               station.facilities.steplessAccess === 'partial' ? 'Partially Accessible' : 'Limited Access'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span>Upgrade Priority:</span>
                            <span className={`priority-${getPriorityClass(station.upgradePriority)}`}>
                              {station.upgradePriority}/100
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="details-section">
                        <h4>🔧 Available Facilities</h4>
                        <div className="facilities-grid">
                          <div className={`facility-item ${station.facilities.hasWiFi ? 'available' : 'unavailable'}`}>
                            <span>WiFi</span>
                            <span>{station.facilities.hasWiFi ? '✅' : '❌'}</span>
                          </div>
                          <div className={`facility-item ${station.facilities.hasTravelCenter ? 'available' : 'unavailable'}`}>
                            <span>Travel Center</span>
                            <span>{station.facilities.hasTravelCenter ? '✅' : '❌'}</span>
                          </div>
                          <div className={`facility-item ${station.facilities.hasDBLounge ? 'available' : 'unavailable'}`}>
                            <span>DB Lounge</span>
                            <span>{station.facilities.hasDBLounge ? '✅' : '❌'}</span>
                          </div>
                          <div className={`facility-item ${station.facilities.hasLocalPublicTransport ? 'available' : 'unavailable'}`}>
                            <span>Local Transport</span>
                            <span>{station.facilities.hasLocalPublicTransport ? '✅' : '❌'}</span>
                          </div>
                          <div className={`facility-item ${station.facilities.hasParking ? 'available' : 'unavailable'}`}>
                            <span>Parking</span>
                            <span>{station.facilities.hasParking ? '✅' : '❌'}</span>
                          </div>
                          <div className={`facility-item ${station.facilities.hasMobilityService ? 'available' : 'unavailable'}`}>
                            <span>Mobility Service</span>
                            <span>{station.facilities.hasMobilityService ? '✅' : '❌'}</span>
                          </div>
                        </div>
                      </div>

                      {station.congestionReasons && station.congestionReasons.length > 0 && (
                        <div className="details-section">
                          <h4>⚠️ Current Issues</h4>
                          <ul className="issues-list">
                            {station.congestionReasons.slice(0, 3).map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {station.suggestions && station.suggestions.length > 0 && (
                        <div className="details-section">
                          <h4>💡 Recommendations</h4>
                          <ul className="suggestions-list">
                            {station.suggestions.slice(0, 3).map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage Guidelines */}
        <div className="guidelines-section">
          <h2>📋 Backup Station Usage Guidelines</h2>
          <div className="guidelines-grid">
            <div className="guideline-card">
              <h3>🚨 When to Use Backup Stations</h3>
              <ul>
                <li>Main corridor delays &gt;20 minutes</li>
                <li>Multiple train cancellations</li>
                <li>Infrastructure failures or accidents</li>
                <li>Planned construction disruptions</li>
                <li>Severe weather conditions</li>
              </ul>
            </div>

            <div className="guideline-card">
              <h3>🎫 Ticketing & Reservations</h3>
              <ul>
                <li>Original tickets valid on backup routes</li>
                <li>No additional charges for disruption routing</li>
                <li>Seat reservations automatically cancelled</li>
                <li>Refunds available for delays &gt;60 minutes</li>
                <li>Flexible rebooking during disruptions</li>
              </ul>
            </div>

            <div className="guideline-card">
              <h3>🚌 Connection Services</h3>
              <ul>
                <li>Bus replacement services available</li>
                <li>Regional train connections maintained</li>
                <li>S-Bahn integration in Berlin/Hamburg</li>
                <li>Taxi vouchers for severe disruptions</li>
                <li>Hotel accommodation for overnight delays</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .backup-stations-page {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .backup-stations-page.loading,
        .backup-stations-page.error {
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

        .page-header {
          background: white;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-bottom: 1px solid #e0e0e0;
        }

        .back-button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .back-button:hover {
          background: #5a6268;
        }

        .page-header h1 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 2rem;
        }

        .page-subtitle {
          color: #666;
          margin: 0;
          font-size: 1.1rem;
        }

        .stations-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px;
        }

        .overview-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .overview-section h2 {
          margin: 0 0 25px 0;
          color: #333;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .overview-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
        }

        .stat-card {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #4A90E2;
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

        .construction-notice {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
          display: flex;
          gap: 20px;
        }

        .notice-icon {
          font-size: 2rem;
        }

        .notice-content h3 {
          margin: 0 0 10px 0;
          color: #856404;
        }

        .notice-content p {
          margin: 0 0 15px 0;
          color: #856404;
        }

        .notice-content ul {
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }

        .stations-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stations-section h2 {
          margin: 0 0 25px 0;
          color: #333;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .stations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .station-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .station-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .station-card.selected {
          border-color: #4A90E2;
          background: white;
        }

        .station-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .station-info h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1.2rem;
        }

        .station-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .role-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          color: white;
        }

        .role-badge.role-primary-hub {
          background: #28a745;
        }

        .role-badge.role-construction-alternative {
          background: #ffc107;
          color: #333;
        }

        .role-badge.role-new-ice-stop {
          background: #17a2b8;
        }

        .role-badge.role-berlin-alternative,
        .role-badge.role-hamburg-alternative {
          background: #6f42c1;
        }

        .role-badge.role-strategic-hub {
          background: #fd7e14;
        }

        .role-badge.role-regional-backup {
          background: #6c757d;
        }

        .hub-badge {
          background: #FFD700;
          color: #333;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .station-distance {
          background: #6c757d;
          color: white;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .station-description {
          color: #666;
          margin-bottom: 15px;
          font-style: italic;
        }

        .realtime-status {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-row:last-child {
          margin-bottom: 0;
        }

        .status-label {
          color: #666;
          font-size: 0.9rem;
        }

        .status-value {
          font-weight: bold;
        }

        .status-value.delay-minimal {
          color: #28a745;
        }

        .status-value.delay-moderate {
          color: #ffc107;
        }

        .status-value.delay-critical {
          color: #dc3545;
        }

        .status-value.cancelled {
          color: #dc3545;
        }

        .facilities-overview {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .facility-icons {
          display: flex;
          gap: 8px;
        }

        .facility-icons span {
          font-size: 1.2rem;
        }

        .platform-info {
          color: #666;
          font-size: 0.9rem;
        }

        .expanded-details {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #dee2e6;
        }

        .details-section {
          margin-bottom: 20px;
        }

        .details-section h4 {
          margin: 0 0 15px 0;
          color: #4A90E2;
          font-size: 1.1rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .facilities-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .facility-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .facility-item.available {
          color: #28a745;
        }

        .facility-item.unavailable {
          color: #dc3545;
        }

        .issues-list,
        .suggestions-list {
          margin: 0;
          padding-left: 20px;
        }

        .issues-list li {
          margin-bottom: 8px;
          color: #dc3545;
        }

        .suggestions-list li {
          margin-bottom: 8px;
          color: #28a745;
        }

        .priority-critical {
          color: #dc3545;
        }

        .priority-high {
          color: #ffc107;
        }

        .priority-medium {
          color: #fd7e14;
        }

        .priority-low {
          color: #28a745;
        }

        .access-yes {
          color: #28a745;
        }

        .access-partial {
          color: #ffc107;
        }

        .access-no {
          color: #dc3545;
        }

        .guidelines-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .guidelines-section h2 {
          margin: 0 0 25px 0;
          color: #333;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .guidelines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }

        .guideline-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          border-left: 4px solid #4A90E2;
        }

        .guideline-card h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .guideline-card ul {
          margin: 0;
          padding-left: 20px;
        }

        .guideline-card li {
          margin-bottom: 8px;
          line-height: 1.4;
          color: #666;
        }

        @media (max-width: 768px) {
          .overview-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .stations-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .guidelines-grid {
            grid-template-columns: 1fr;
          }

          .station-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};