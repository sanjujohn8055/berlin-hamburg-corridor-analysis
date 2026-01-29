import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CorridorDashboard } from './components/CorridorDashboard';
import { TrainTimetables } from './components/TrainTimetables';
import { DelayAnalysisPage } from './components/DelayAnalysisPage';
import { AlternativeRoutesPage } from './components/AlternativeRoutesPage';
import { BackupStationsPage } from './components/BackupStationsPage';

type Page = 'dashboard' | 'timetables' | 'delay-analysis' | 'alternative-routes' | 'backup-stations';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateToPage = (page: Page) => {
    setIsNavigating(true);
    // Small delay to show navigation is happening, then navigate
    setTimeout(() => {
      setCurrentPage(page);
      setIsNavigating(false);
    }, 100);
  };

  const navigateBack = () => {
    setIsNavigating(true);
    setTimeout(() => {
      setCurrentPage('dashboard');
      setIsNavigating(false);
    }, 100);
  };

  return (
    <div className="app">
      <nav className="app-navigation">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>🚄 Berlin-Hamburg Corridor Analysis</h1>
          </div>
          <div className="nav-links">
            <button 
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateToPage('dashboard')}
              disabled={isNavigating}
            >
              🗺️ Corridor Dashboard
            </button>
            <button 
              className={`nav-link ${currentPage === 'timetables' ? 'active' : ''}`}
              onClick={() => navigateToPage('timetables')}
              disabled={isNavigating}
            >
              🚄 Train Timetables
            </button>
          </div>
        </div>
      </nav>

      <main className="app-main">
        {isNavigating && (
          <div className="navigation-loading">
            <div className="nav-spinner"></div>
            <p>Loading page...</p>
          </div>
        )}
        {!isNavigating && currentPage === 'dashboard' && <CorridorDashboard onNavigate={navigateToPage} />}
        {!isNavigating && currentPage === 'timetables' && <TrainTimetables />}
        {!isNavigating && currentPage === 'delay-analysis' && <DelayAnalysisPage onBack={navigateBack} />}
        {!isNavigating && currentPage === 'alternative-routes' && <AlternativeRoutesPage onBack={navigateBack} />}
        {!isNavigating && currentPage === 'backup-stations' && <BackupStationsPage onBack={navigateBack} />}
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          background: #f5f7fa;
        }

        .app-navigation {
          background: #2c3e50;
          color: white;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
        }

        .nav-brand h1 {
          margin: 0;
          font-size: 1.5rem;
          color: white;
        }

        .nav-links {
          display: flex;
          gap: 10px;
        }

        .nav-link {
          padding: 10px 20px;
          background: transparent;
          color: white;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .nav-link.active {
          background: #3498db;
          border-color: #3498db;
        }

        .app-main {
          min-height: calc(100vh - 80px);
        }

        .navigation-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #666;
        }

        .nav-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4A90E2;
          border-radius: 50%;
          animation: navSpin 0.8s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes navSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .nav-link:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .nav-content {
            flex-direction: column;
            gap: 15px;
          }

          .nav-links {
            width: 100%;
            justify-content: center;
          }

          .nav-link {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);