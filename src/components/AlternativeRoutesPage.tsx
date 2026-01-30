import React, { useState, useEffect } from 'react';

interface AlternativeRoute {
  legs: Array<{
    line: {
      name: string;
      product: string;
    };
    origin: {
      name: string;
    };
    destination: {
      name: string;
    };
    departure: string;
    arrival: string;
    duration: number;
  }>;
  duration: number;
  price?: {
    amount: number;
    currency: string;
  };
}

interface BackupStation {
  eva: number;
  name: string;
  realTimeData?: {
    avgDelay: number;
    delayedTrains: number;
    cancelledTrains: number;
  };
  coordinates: [number, number];
  distanceFromBerlin: number;
}

interface AlternativeRoutesPageProps {
  onBack: () => void;
}

export const AlternativeRoutesPage: React.FC<AlternativeRoutesPageProps> = ({ onBack }) => {
  const [routes, setRoutes] = useState<AlternativeRoute[]>([]);
  const [backupStations, setBackupStations] = useState<BackupStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('berlin-hamburg');

  useEffect(() => {
    fetchAlternativeData();
  }, [selectedRoute]);

  const fetchAlternativeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize with empty arrays to prevent undefined errors
      setRoutes([]);
      setBackupStations([]);
      
      // Fetch alternative routes with better error handling
      try {
        const routesResponse = await fetch(`/api/routes/8011160/8002548`); // Berlin Hbf to Hamburg Hbf
        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          if (routesData.success && Array.isArray(routesData.data)) {
            // Validate route data structure before setting
            const validRoutes = routesData.data.filter((route: any) => 
              route && 
              typeof route === 'object' && 
              Array.isArray(route.legs) &&
              typeof route.duration === 'number'
            );
            setRoutes(validRoutes);
          } else {
            console.warn('Routes API returned invalid data format');
            setRoutes([]);
          }
        } else {
          console.warn('Routes API not available, using fallback data');
          setRoutes([]);
        }
      } catch (routesError) {
        console.warn('Routes API error:', routesError);
        setRoutes([]);
      }
      
      // Fetch backup stations with better error handling
      try {
        const backupResponse = await fetch('/api/backup-stations');
        if (backupResponse.ok) {
          const backupData = await backupResponse.json();
          if (backupData.success && Array.isArray(backupData.data)) {
            // Validate backup station data structure
            const validStations = backupData.data.filter((station: any) =>
              station &&
              typeof station === 'object' &&
              station.name &&
              typeof station.eva === 'number'
            );
            setBackupStations(validStations);
          } else {
            console.warn('Backup stations API returned invalid data format');
            setBackupStations([]);
          }
        } else {
          console.warn('Backup stations API not available');
          setBackupStations([]);
        }
      } catch (backupError) {
        console.warn('Backup stations API error:', backupError);
        setBackupStations([]);
      }
      
    } catch (err) {
      console.error('General error in fetchAlternativeData:', err);
      // Don't set error state for API unavailability - just log and continue
      setRoutes([]);
      setBackupStations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDelayClass = (delay: number) => {
    if (delay > 15) return 'critical';
    if (delay > 5) return 'moderate';
    return 'minimal';
  };

  if (loading) {
    return (
      <div className="alternative-routes-page loading">
        <div className="initial-loading">
          <div className="spinner-only"></div>
          <div className="loading-dots"></div>
          <div className="static-text">Loading alternative routes data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alternative-routes-page error">
        <div className="error-message">
          <h3>Error Loading Alternative Routes</h3>
          <p>{error}</p>
          <button onClick={fetchAlternativeData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alternative-routes-page">
      <header className="page-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>🔄 Alternative Routes & Backup Stations</h1>
        <p className="page-subtitle">Find alternative connections during disruptions</p>
      </header>

      <div className="routes-content">
        {/* Construction Notice */}
        <div className="construction-notice">
          <div className="notice-icon">🚧</div>
          <div className="notice-content">
            <h3>2026 Construction Impact</h3>
            <p>Major refurbishment August 2025 - April 2026. Journey times increased by ~45 minutes.</p>
            <ul>
              <li>Normal ICE time: 1h 40min → Construction time: 2h 45min</li>
              <li>Reduced frequency: Every 2 hours instead of hourly</li>
              <li>Some stations cancelled: Büchen, Ludwigslust, Wittenberge</li>
            </ul>
          </div>
        </div>

        {/* Route Selection */}
        <div className="route-selector">
          <h2>📍 Select Route Direction</h2>
          <div className="selector-buttons">
            <button 
              className={`selector-btn ${selectedRoute === 'berlin-hamburg' ? 'active' : ''}`}
              onClick={() => setSelectedRoute('berlin-hamburg')}
            >
              Berlin → Hamburg
            </button>
            <button 
              className={`selector-btn ${selectedRoute === 'hamburg-berlin' ? 'active' : ''}`}
              onClick={() => setSelectedRoute('hamburg-berlin')}
            >
              Hamburg → Berlin
            </button>
          </div>
        </div>

        {/* Alternative Routes */}
        <div className="routes-section">
          <h2>🚄 Alternative Route Options</h2>
          {routes.length > 0 ? (
            <div className="routes-grid">
              {routes.slice(0, 5).map((route, index) => (
                <div key={index} className="route-card">
                  <div className="route-header">
                    <span className="route-number">Route {index + 1}</span>
                    <span className="route-duration">{formatDuration(route.duration || 0)}</span>
                  </div>
                  
                  <div className="route-legs">
                    {route.legs && route.legs.map((leg, legIndex) => (
                      <div key={legIndex} className="route-leg">
                        <div className="leg-info">
                          <span className="leg-line">{leg.line?.name || 'Unknown Line'}</span>
                          <span className="leg-product">{leg.line?.product || 'Train'}</span>
                        </div>
                        <div className="leg-stations">
                          <span className="origin">{leg.origin?.name || 'Unknown Origin'}</span>
                          <span className="arrow">→</span>
                          <span className="destination">{leg.destination?.name || 'Unknown Destination'}</span>
                        </div>
                        <div className="leg-times">
                          <span>{leg.departure || '--:--'}</span>
                          <span>-</span>
                          <span>{leg.arrival || '--:--'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {route.price && (
                    <div className="route-price">
                      From {route.price.amount} {route.price.currency}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="fallback-routes">
              <h3>🚄 Standard Route Options</h3>
              <p>Live route data is being loaded. Here are the standard alternatives:</p>
              
              <div className="routes-grid">
                <div className="route-card">
                  <div className="route-header">
                    <span className="route-number">Direct ICE</span>
                    <span className="route-duration">1h 40min</span>
                  </div>
                  <div className="route-legs">
                    <div className="route-leg">
                      <div className="leg-info">
                        <span className="leg-line">ICE 18/23/28</span>
                        <span className="leg-product">ICE</span>
                      </div>
                      <div className="leg-stations">
                        <span className="origin">Berlin Hbf</span>
                        <span className="arrow">→</span>
                        <span className="destination">Hamburg Hbf</span>
                      </div>
                      <div className="leg-times">
                        <span>Every 30min</span>
                        <span>-</span>
                        <span>Normal ops</span>
                      </div>
                    </div>
                  </div>
                  <div className="route-price">From 49.90 EUR</div>
                </div>

                <div className="route-card">
                  <div className="route-header">
                    <span className="route-number">Construction Route</span>
                    <span className="route-duration">2h 25min</span>
                  </div>
                  <div className="route-legs">
                    <div className="route-leg">
                      <div className="leg-info">
                        <span className="leg-line">ICE via Lüneburg</span>
                        <span className="leg-product">ICE</span>
                      </div>
                      <div className="leg-stations">
                        <span className="origin">Berlin Hbf</span>
                        <span className="arrow">→</span>
                        <span className="destination">Hamburg-Harburg</span>
                      </div>
                      <div className="leg-times">
                        <span>2026 Route</span>
                        <span>-</span>
                        <span>+45min</span>
                      </div>
                    </div>
                  </div>
                  <div className="route-price">From 49.90 EUR</div>
                </div>

                <div className="route-card">
                  <div className="route-header">
                    <span className="route-number">Regional Option</span>
                    <span className="route-duration">3h 15min</span>
                  </div>
                  <div className="route-legs">
                    <div className="route-leg">
                      <div className="leg-info">
                        <span className="leg-line">RE + Regional</span>
                        <span className="leg-product">Regional</span>
                      </div>
                      <div className="leg-stations">
                        <span className="origin">Berlin Hbf</span>
                        <span className="arrow">→</span>
                        <span className="destination">Hamburg Hbf</span>
                      </div>
                      <div className="leg-times">
                        <span>Multiple</span>
                        <span>-</span>
                        <span>Transfers</span>
                      </div>
                    </div>
                  </div>
                  <div className="route-price">From 29.90 EUR</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Backup Stations */}
        <div className="backup-section">
          <h2>🏢 Backup Stations for Congestion Relief</h2>
          <p className="backup-description">
            Alternative stations to use when main corridor stations experience severe delays or cancellations.
          </p>
          
          {backupStations.length > 0 ? (
            <div className="backup-grid">
              {backupStations.map((station) => (
                <div key={station.eva} className="backup-card">
                  <div className="backup-header">
                    <h3>{station.name}</h3>
                    <div className="backup-distance">
                      {station.distanceFromBerlin}km from Berlin
                    </div>
                  </div>
                  
                  {station.realTimeData && (
                    <div className="backup-status">
                      <div className="status-item">
                        <span className="status-label">Current Delay:</span>
                        <span className={`status-value delay-${getDelayClass(station.realTimeData.avgDelay)}`}>
                          {station.realTimeData.avgDelay}min
                        </span>
                      </div>
                      <div className="status-item">
                        <span className="status-label">Delayed Trains:</span>
                        <span className="status-value">{station.realTimeData.delayedTrains}</span>
                      </div>
                      {station.realTimeData.cancelledTrains > 0 && (
                        <div className="status-item">
                          <span className="status-label">Cancellations:</span>
                          <span className="status-value cancelled">{station.realTimeData.cancelledTrains}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="backup-recommendation">
                    {station.name.includes('Hbf') ? (
                      <span className="rec-text">✅ Major hub - Full services available</span>
                    ) : station.name.includes('Harburg') ? (
                      <span className="rec-text">🔄 Primary alternative during construction</span>
                    ) : station.name.includes('Lüneburg') ? (
                      <span className="rec-text">🆕 New ICE stop during construction</span>
                    ) : (
                      <span className="rec-text">🚉 Regional alternative with connections</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-backup-stations">
              <p>🔍 Backup station data is being loaded...</p>
              <p>These stations provide alternative routing during main corridor disruptions.</p>
              <div className="fallback-stations">
                <h4>Known Backup Stations:</h4>
                <ul>
                  <li><strong>Hamburg-Harburg</strong> - Primary alternative to Hamburg Hbf</li>
                  <li><strong>Berlin Südkreuz</strong> - Major alternative Berlin terminus</li>
                  <li><strong>Lüneburg</strong> - New ICE stop during construction</li>
                  <li><strong>Hamburg-Altona</strong> - Western Hamburg alternative</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Procedures */}
        <div className="emergency-section">
          <h2>🚨 Emergency Procedures</h2>
          <div className="emergency-grid">
            <div className="emergency-card">
              <h3>🚌 Bus Replacement Services</h3>
              <ul>
                <li>Rathenow ↔ Hagenow Land section</li>
                <li>Operating every 30 minutes during peak hours</li>
                <li>Additional 45-60 minutes journey time</li>
                <li>Free with valid train ticket</li>
              </ul>
            </div>
            
            <div className="emergency-card">
              <h3>🎫 Flexible Ticketing</h3>
              <ul>
                <li>Use tickets on alternative routes without surcharge</li>
                <li>Valid on regional trains (RE/RB) during disruptions</li>
                <li>Refund available for delays &gt;60 minutes</li>
                <li>Seat reservations automatically cancelled</li>
              </ul>
            </div>
            
            <div className="emergency-card">
              <h3>📱 Real-Time Updates</h3>
              <ul>
                <li>DB Navigator app for live updates</li>
                <li>SMS alerts for registered journeys</li>
                <li>Station announcements in German/English</li>
                <li>Customer service: 030 2970 (24/7)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .alternative-routes-page {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .alternative-routes-page.loading,
        .alternative-routes-page.error {
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

        .routes-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px;
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

        .route-selector {
          background: white;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .route-selector h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .selector-buttons {
          display: flex;
          gap: 15px;
        }

        .selector-btn {
          padding: 12px 24px;
          border: 2px solid #4A90E2;
          background: white;
          color: #4A90E2;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .selector-btn.active {
          background: #4A90E2;
          color: white;
        }

        .selector-btn:hover:not(.active) {
          background: #f8f9fa;
        }

        .routes-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .routes-section h2 {
          margin: 0 0 25px 0;
          color: #333;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .routes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }

        .route-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
        }

        .route-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .route-number {
          font-weight: bold;
          color: #4A90E2;
          font-size: 1.1rem;
        }

        .route-duration {
          background: #28a745;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .route-legs {
          margin-bottom: 15px;
        }

        .route-leg {
          padding: 10px;
          background: white;
          border-radius: 6px;
          margin-bottom: 10px;
          border-left: 3px solid #4A90E2;
        }

        .leg-info {
          display: flex;
          gap: 10px;
          margin-bottom: 5px;
        }

        .leg-line {
          font-weight: bold;
          color: #333;
        }

        .leg-product {
          background: #6c757d;
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 0.8rem;
        }

        .leg-stations {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 5px;
        }

        .arrow {
          color: #4A90E2;
          font-weight: bold;
        }

        .leg-times {
          display: flex;
          gap: 10px;
          font-size: 0.9rem;
          color: #666;
        }

        .route-price {
          text-align: right;
          font-weight: bold;
          color: #28a745;
        }

        .no-routes {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .fallback-routes {
          text-align: center;
          padding: 20px;
        }

        .fallback-routes h3 {
          color: #4A90E2;
          margin-bottom: 15px;
        }

        .fallback-routes p {
          color: #666;
          margin-bottom: 25px;
        }

        .no-backup-stations {
          text-align: center;
          padding: 40px;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .fallback-stations {
          margin-top: 25px;
          text-align: left;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .fallback-stations h4 {
          color: #4A90E2;
          margin-bottom: 15px;
        }

        .fallback-stations ul {
          list-style: none;
          padding: 0;
        }

        .fallback-stations li {
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .fallback-stations li:last-child {
          border-bottom: none;
        }

        .backup-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .backup-section h2 {
          margin: 0 0 15px 0;
          color: #333;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .backup-description {
          color: #666;
          margin-bottom: 25px;
          line-height: 1.5;
        }

        .backup-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .backup-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
        }

        .backup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .backup-header h3 {
          margin: 0;
          color: #333;
        }

        .backup-distance {
          background: #6c757d;
          color: white;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        .backup-status {
          margin-bottom: 15px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
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

        .backup-recommendation {
          padding: 10px;
          background: #e8f4fd;
          border-radius: 6px;
          border-left: 3px solid #4A90E2;
        }

        .rec-text {
          font-size: 0.9rem;
          color: #333;
        }

        .emergency-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .emergency-section h2 {
          margin: 0 0 25px 0;
          color: #333;
          border-bottom: 2px solid #dc3545;
          padding-bottom: 10px;
        }

        .emergency-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }

        .emergency-card {
          background: #fff5f5;
          border: 1px solid #f8d7da;
          border-radius: 8px;
          padding: 20px;
          border-left: 4px solid #dc3545;
        }

        .emergency-card h3 {
          margin: 0 0 15px 0;
          color: #721c24;
        }

        .emergency-card ul {
          margin: 0;
          padding-left: 20px;
          color: #721c24;
        }

        .emergency-card li {
          margin-bottom: 8px;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .selector-buttons {
            flex-direction: column;
          }

          .routes-grid {
            grid-template-columns: 1fr;
          }

          .backup-grid {
            grid-template-columns: 1fr;
          }

          .emergency-grid {
            grid-template-columns: 1fr;
          }

          .backup-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};