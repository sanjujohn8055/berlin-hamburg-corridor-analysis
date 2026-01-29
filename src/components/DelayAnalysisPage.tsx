import React, { useState, useEffect } from 'react';

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

interface DelayAnalysisPageProps {
  onBack: () => void;
}

export const DelayAnalysisPage: React.FC<DelayAnalysisPageProps> = ({ onBack }) => {
  const [delayAnalysis, setDelayAnalysis] = useState<DelayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDelayAnalysis();
  }, []);

  const fetchDelayAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/delay-analysis');
      const data = await response.json();
      
      if (data.success) {
        setDelayAnalysis(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch delay analysis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="delay-analysis-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading delay analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="delay-analysis-page error">
        <div className="error-message">
          <h3>Error Loading Delay Analysis</h3>
          <p>{error}</p>
          <button onClick={fetchDelayAnalysis} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="delay-analysis-page">
      <header className="page-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>📊 Corridor Delay Analysis</h1>
        <p className="page-subtitle">Real-time delay patterns and performance metrics</p>
      </header>

      {delayAnalysis && (
        <div className="analysis-content">
          {/* Peak Delay Times */}
          <div className="analysis-section">
            <h2>🕐 Peak Delay Times</h2>
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

          {/* Delays by Train Type */}
          <div className="analysis-section">
            <h2>🚂 Performance by Train Type</h2>
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
                  <div className="performance-bar">
                    <div 
                      className="performance-fill"
                      style={{ 
                        width: `${type.reliability}%`,
                        backgroundColor: type.reliability > 90 ? '#28a745' : type.reliability > 80 ? '#ffc107' : '#dc3545'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delays by Station */}
          <div className="analysis-section">
            <h2>🏢 Station Performance Analysis</h2>
            <div className="station-delays">
              {delayAnalysis.delaysByStation.map((station) => (
                <div key={station.station} className="station-delay-card">
                  <div className="station-header">
                    <h3>{station.station}</h3>
                    <div className="delay-badge">
                      {station.avgDelay}min avg
                    </div>
                  </div>
                  <div className="station-issues">
                    <strong>Primary Issues:</strong> {station.issues}
                  </div>
                  <div className="delay-severity">
                    <div 
                      className="severity-bar"
                      style={{ 
                        width: `${Math.min((station.avgDelay / 30) * 100, 100)}%`,
                        backgroundColor: station.avgDelay > 20 ? '#dc3545' : station.avgDelay > 12 ? '#ffc107' : '#28a745'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="analysis-section">
            <h2>💡 Key Recommendations</h2>
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

      <style>{`
        .delay-analysis-page {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .delay-analysis-page.loading,
        .delay-analysis-page.error {
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

        .analysis-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px;
        }

        .analysis-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .analysis-section h2 {
          color: #333;
          margin-bottom: 25px;
          font-size: 1.5rem;
          border-bottom: 2px solid #4A90E2;
          padding-bottom: 10px;
        }

        .peak-times-chart {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .time-bar {
          display: grid;
          grid-template-columns: 80px 1fr 80px 250px;
          align-items: center;
          gap: 20px;
        }

        .time-label {
          font-weight: bold;
          color: #333;
          font-size: 1.1rem;
        }

        .delay-bar {
          height: 25px;
          background: #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .delay-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 12px;
        }

        .delay-value {
          font-weight: bold;
          text-align: center;
          font-size: 1.1rem;
        }

        .delay-description {
          font-size: 0.95rem;
          color: #666;
          font-style: italic;
        }

        .train-type-analysis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }

        .type-card {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #4A90E2;
        }

        .type-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .type-name {
          font-weight: bold;
          font-size: 1.3rem;
          color: #333;
        }

        .type-reliability {
          color: #28a745;
          font-size: 1rem;
          font-weight: 600;
        }

        .type-delay {
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .performance-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }

        .performance-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .station-delays {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }

        .station-delay-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .station-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .station-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.2rem;
        }

        .delay-badge {
          background: #dc3545;
          color: white;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .station-issues {
          margin-bottom: 15px;
          color: #666;
          line-height: 1.4;
        }

        .delay-severity {
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }

        .severity-bar {
          height: 100%;
          transition: width 0.3s ease;
        }

        .recommendations {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 20px;
          background: #e8f4fd;
          border-radius: 8px;
          border-left: 4px solid #4A90E2;
        }

        .rec-icon {
          font-size: 1.3rem;
          margin-top: 2px;
        }

        .rec-text {
          color: #333;
          line-height: 1.5;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .time-bar {
            grid-template-columns: 1fr;
            gap: 10px;
            text-align: center;
          }

          .train-type-analysis {
            grid-template-columns: 1fr;
          }

          .station-delays {
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