import React, { useState, useEffect, useRef } from 'react';
import { CorridorStation } from '../shared/types';

interface CorridorMapProps {
  stations: CorridorStation[];
  onStationClick?: (station: CorridorStation) => void;
  selectedStation?: CorridorStation | null;
  showPriorityColors?: boolean;
  showRiskZones?: boolean;
  dataSource?: 'real-api' | 'enhanced-mock';
  apiStatus?: {
    stada: boolean;
    timetables: boolean;
  };
}

/**
 * 2D Map visualization component for Berlin-Hamburg corridor
 * Displays stations on a proper 2D map similar to Google Maps
 */
export const CorridorMap: React.FC<CorridorMapProps> = ({
  stations,
  onStationClick,
  selectedStation,
  showPriorityColors = true,
  showRiskZones = false,
  dataSource = 'enhanced-mock',
  apiStatus = { stada: false, timetables: false }
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredStation, setHoveredStation] = useState<CorridorStation | null>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 1000, height: 600 });

  // Real geographic coordinates for Berlin-Hamburg corridor stations
  const stationCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Berlin Hbf': { lat: 52.5251, lng: 13.3694 },
    'Berlin-Spandau': { lat: 52.5347, lng: 13.1975 },
    'Brandenburg(Havel)': { lat: 52.4111, lng: 12.5606 },
    'Rathenow': { lat: 52.6039, lng: 12.4039 },
    'Stendal': { lat: 52.6056, lng: 11.8583 },
    'Hagenow Land': { lat: 53.4256, lng: 11.1869 },
    'Lüneburg': { lat: 53.2493, lng: 10.4077 },
    'Hamburg-Harburg': { lat: 53.4559, lng: 9.9847 },
    'Hamburg Hbf': { lat: 53.5528, lng: 10.0067 }
  };

  // Map bounds for the Berlin-Hamburg corridor
  const mapBounds = {
    north: 53.8,
    south: 52.2,
    east: 13.8,
    west: 9.5
  };

  /**
   * Converts geographic coordinates to pixel coordinates on the 2D map
   */
  const geoToPixel = (lat: number, lng: number): { x: number; y: number } => {
    const latRange = mapBounds.north - mapBounds.south;
    const lngRange = mapBounds.east - mapBounds.west;
    
    // Convert to normalized coordinates (0-1)
    const normalizedLng = (lng - mapBounds.west) / lngRange;
    const normalizedLat = (mapBounds.north - lat) / latRange; // Flip Y axis
    
    // Convert to pixel coordinates with padding
    const padding = 60;
    const x = normalizedLng * (mapDimensions.width - 2 * padding) + padding;
    const y = normalizedLat * (mapDimensions.height - 2 * padding) + padding;
    
    return { x, y };
  };

  /**
   * Gets station coordinates, using real coordinates if available
   */
  const getStationCoords = (station: CorridorStation): { x: number; y: number } => {
    // Try to use real coordinates first
    const realCoords = stationCoordinates[station.name];
    if (realCoords) {
      return geoToPixel(realCoords.lat, realCoords.lng);
    }
    
    // Fallback to station's stored coordinates
    if (station.coordinates && station.coordinates.length >= 2) {
      return geoToPixel(station.coordinates[1], station.coordinates[0]);
    }
    
    // Final fallback: position based on distance from Berlin
    const berlinCoords = geoToPixel(52.5251, 13.3694);
    const hamburgCoords = geoToPixel(53.5528, 10.0067);
    const progress = station.distanceFromBerlin / 289; // 289km total distance
    
    return {
      x: berlinCoords.x + (hamburgCoords.x - berlinCoords.x) * progress,
      y: berlinCoords.y + (hamburgCoords.y - berlinCoords.y) * progress
    };
  };

  /**
   * Gets color based on station priority level
   */
  const getPriorityColor = (priority: number): string => {
    if (!showPriorityColors) return '#4A90E2';
    
    if (priority >= 80) return '#FF4444'; // Critical - Red
    if (priority >= 60) return '#FF8800'; // High - Orange
    if (priority >= 40) return '#FFAA00'; // Medium - Yellow
    if (priority >= 20) return '#88CC88'; // Low - Light Green
    return '#44AA44'; // Very Low - Green
  };

  /**
   * Gets priority level label
   */
  const getPriorityLabel = (priority: number): string => {
    if (priority >= 80) return 'Critical';
    if (priority >= 60) return 'High';
    if (priority >= 40) return 'Medium';
    if (priority >= 20) return 'Low';
    return 'Very Low';
  };

  /**
   * Handles station click
   */
  const handleStationClick = (station: CorridorStation) => {
    onStationClick?.(station);
  };

  /**
   * Generates the railway route line
   */
  const generateRouteLines = () => {
    if (stations.length < 2) return null;

    // Sort stations by distance from Berlin to ensure proper route order
    const sortedStations = [...stations].sort((a, b) => a.distanceFromBerlin - b.distanceFromBerlin);
    
    // Create path points for the main Berlin-Hamburg route
    const mainRoutePoints = sortedStations
      .filter(station => {
        // Only include main corridor stations, exclude branches
        const mainStations = ['Berlin Hbf', 'Berlin-Spandau', 'Brandenburg(Havel)', 'Rathenow', 'Stendal', 'Hagenow Land', 'Hamburg Hbf'];
        return mainStations.includes(station.name);
      })
      .map(station => {
        const coords = getStationCoords(station);
        return `${coords.x},${coords.y}`;
      })
      .join(' ');

    return (
      <g>
        {/* Main railway route */}
        <polyline
          points={mainRoutePoints}
          fill="none"
          stroke="#2C3E50"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        {/* Route highlight */}
        <polyline
          points={mainRoutePoints}
          fill="none"
          stroke="#3498DB"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  /**
   * Generates map background with geographic features
   */
  const generateMapBackground = () => {
    return (
      <g>
        {/* Map background */}
        <rect 
          width={mapDimensions.width} 
          height={mapDimensions.height} 
          fill="#F8F9FA" 
        />
        
        {/* Geographic regions */}
        <rect 
          x="0" 
          y="0" 
          width={mapDimensions.width * 0.4} 
          height={mapDimensions.height} 
          fill="#E8F4FD" 
          opacity="0.3"
        />
        <text 
          x={mapDimensions.width * 0.2} 
          y="30" 
          textAnchor="middle" 
          fontSize="14" 
          fill="#666" 
          fontWeight="bold"
        >
          Hamburg Region
        </text>
        
        <rect 
          x={mapDimensions.width * 0.6} 
          y="0" 
          width={mapDimensions.width * 0.4} 
          height={mapDimensions.height} 
          fill="#FFF3E0" 
          opacity="0.3"
        />
        <text 
          x={mapDimensions.width * 0.8} 
          y="30" 
          textAnchor="middle" 
          fontSize="14" 
          fill="#666" 
          fontWeight="bold"
        >
          Berlin Region
        </text>
        
        {/* State boundaries */}
        <line 
          x1={mapDimensions.width * 0.5} 
          y1="0" 
          x2={mapDimensions.width * 0.5} 
          y2={mapDimensions.height} 
          stroke="#DDD" 
          strokeWidth="2" 
          strokeDasharray="5,5"
        />
        <text 
          x={mapDimensions.width * 0.5} 
          y="50" 
          textAnchor="middle" 
          fontSize="12" 
          fill="#999"
        >
          Lower Saxony | Brandenburg
        </text>
      </g>
    );
  };

  /**
   * Generates risk zone overlays
   */
  const generateRiskZones = () => {
    if (!showRiskZones) return null;

    const berlinCoords = geoToPixel(52.5251, 13.3694);
    const hamburgCoords = geoToPixel(53.5528, 10.0067);

    return (
      <g>
        {/* Berlin metropolitan risk zone */}
        <circle
          cx={berlinCoords.x}
          cy={berlinCoords.y}
          r="80"
          fill="rgba(255, 68, 68, 0.15)"
          stroke="#FF4444"
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <text
          x={berlinCoords.x}
          y={berlinCoords.y - 90}
          textAnchor="middle"
          fontSize="12"
          fill="#FF4444"
          fontWeight="bold"
        >
          Berlin High Risk Zone
        </text>

        {/* Hamburg metropolitan risk zone */}
        <circle
          cx={hamburgCoords.x}
          cy={hamburgCoords.y}
          r="70"
          fill="rgba(255, 68, 68, 0.15)"
          stroke="#FF4444"
          strokeWidth="2"
          strokeDasharray="3,3"
        />
        <text
          x={hamburgCoords.x}
          y={hamburgCoords.y - 80}
          textAnchor="middle"
          fontSize="12"
          fill="#FF4444"
          fontWeight="bold"
        >
          Hamburg High Risk Zone
        </text>

        {/* Central corridor medium risk zone */}
        <ellipse
          cx={mapDimensions.width * 0.5}
          cy={mapDimensions.height * 0.5}
          rx="150"
          ry="60"
          fill="rgba(255, 170, 0, 0.1)"
          stroke="#FFAA00"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        <text
          x={mapDimensions.width * 0.5}
          y={mapDimensions.height * 0.5 - 70}
          textAnchor="middle"
          fontSize="11"
          fill="#FFAA00"
          fontWeight="bold"
        >
          Central Corridor Medium Risk
        </text>
      </g>
    );
  };

  // Update map dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        setMapDimensions({
          width: Math.max(1000, rect.width),
          height: 600
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="corridor-map-container" ref={mapRef}>
      <div className="corridor-map-header">
        <div className="header-left">
          <h3>🗺️ Berlin-Hamburg Corridor - 2D Map View</h3>
          <div className="data-source-indicator">
            <span className={`data-badge ${dataSource}`}>
              {dataSource === 'real-api' ? '🔗 Real API Data' : '🎯 Enhanced Mock Data'}
            </span>
            <div className="api-status">
              <span className={`api-indicator ${apiStatus.stada ? 'connected' : 'disconnected'}`}>
                StaDa API {apiStatus.stada ? '✓' : '✗'}
              </span>
              <span className={`api-indicator ${apiStatus.timetables ? 'connected' : 'disconnected'}`}>
                Timetables API {apiStatus.timetables ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
        <div className="corridor-map-controls">
          {showPriorityColors && (
            <div className="priority-legend">
              <span className="legend-title">Priority Level:</span>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FF4444' }}></div>
                <span>Critical (80-100)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FF8800' }}></div>
                <span>High (60-79)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FFAA00' }}></div>
                <span>Medium (40-59)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#88CC88' }}></div>
                <span>Low (20-39)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#44AA44' }}></div>
                <span>Very Low (0-19)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="map-view-container">
        <svg
          width="100%"
          height="600"
          viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
          style={{ cursor: 'default', border: '2px solid #E0E0E0', borderRadius: '8px' }}
        >
          {/* Map background */}
          {generateMapBackground()}
          
          {/* Risk zones (if enabled) */}
          {generateRiskZones()}
          
          {/* Railway route lines */}
          {generateRouteLines()}
          
          {/* Stations */}
          {stations.map((station) => {
            const coords = getStationCoords(station);
            const isSelected = selectedStation?.eva === station.eva;
            const isHovered = hoveredStation?.eva === station.eva;
            const priorityColor = getPriorityColor(station.upgradePriority);
            const stationRadius = station.isStrategicHub ? 12 : 8;
            
            return (
              <g key={station.eva}>
                {/* Station shadow */}
                <circle
                  cx={coords.x + 2}
                  cy={coords.y + 2}
                  r={isSelected || isHovered ? stationRadius + 3 : stationRadius}
                  fill="rgba(0, 0, 0, 0.2)"
                />
                
                {/* Station circle */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={isSelected || isHovered ? stationRadius + 3 : stationRadius}
                  fill={priorityColor}
                  stroke={isSelected ? '#000' : '#fff'}
                  strokeWidth={isSelected ? 4 : 3}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleStationClick(station)}
                  onMouseEnter={() => setHoveredStation(station)}
                  onMouseLeave={() => setHoveredStation(null)}
                />
                
                {/* Data source indicator */}
                {dataSource === 'real-api' && (
                  <circle
                    cx={coords.x + stationRadius - 3}
                    cy={coords.y - stationRadius + 3}
                    r={4}
                    fill="#00FF00"
                    stroke="#fff"
                    strokeWidth="2"
                  >
                    <title>Real API Data</title>
                  </circle>
                )}
                
                {/* Strategic hub indicator */}
                {station.isStrategicHub && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={stationRadius + 6}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="3"
                    strokeDasharray="3,3"
                  />
                )}
                
                {/* Station name */}
                <text
                  x={coords.x}
                  y={coords.y - stationRadius - 15}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#333"
                  fontWeight={station.isStrategicHub ? 'bold' : 'normal'}
                  style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {station.name}
                </text>
                
                {/* Distance label */}
                <text
                  x={coords.x}
                  y={coords.y + stationRadius + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#666"
                  style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {station.distanceFromBerlin}km
                </text>
              </g>
            );
          })}
          
          {/* Compass rose */}
          <g transform={`translate(${mapDimensions.width - 80}, 80)`}>
            <circle cx="0" cy="0" r="30" fill="rgba(255,255,255,0.9)" stroke="#333" strokeWidth="2"/>
            <line x1="0" y1="-25" x2="0" y2="-15" stroke="#333" strokeWidth="2"/>
            <text x="0" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">N</text>
            <line x1="15" y1="0" x2="25" y2="0" stroke="#666" strokeWidth="1"/>
            <text x="20" y="4" textAnchor="middle" fontSize="10" fill="#666">E</text>
          </g>
          
          {/* Scale indicator */}
          <g transform={`translate(60, ${mapDimensions.height - 60})`}>
            <rect x="0" y="0" width="120" height="30" fill="rgba(255,255,255,0.9)" stroke="#333" strokeWidth="1" rx="4"/>
            <line x1="10" y1="15" x2="50" y2="15" stroke="#333" strokeWidth="3"/>
            <text x="30" y="25" textAnchor="middle" fontSize="10" fill="#333">100km</text>
          </g>
        </svg>
      </div>

      {/* Station tooltip */}
      {hoveredStation && (
        <div className="station-tooltip">
          <div className="tooltip-header">
            <strong>{hoveredStation.name}</strong>
            {hoveredStation.isStrategicHub && <span className="hub-badge">Strategic Hub</span>}
          </div>
          <div className="tooltip-content">
            <div>Distance: {hoveredStation.distanceFromBerlin}km from Berlin</div>
            <div>Category: {hoveredStation.category}</div>
            <div>Platforms: {hoveredStation.platforms}</div>
            {showPriorityColors && (
              <div>
                Priority: {getPriorityLabel(hoveredStation.upgradePriority)} 
                ({hoveredStation.upgradePriority}/100)
              </div>
            )}
            {hoveredStation.suggestions && hoveredStation.suggestions.length > 0 && (
              <div className="suggestions-preview">
                <strong>Top Suggestions:</strong>
                <div className="suggestion-item">{hoveredStation.suggestions[0]}</div>
                {hoveredStation.suggestions.length > 1 && (
                  <div className="more-suggestions">
                    +{hoveredStation.suggestions.length - 1} more suggestions
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .corridor-map-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 25px;
          margin: 20px 0;
        }

        .corridor-map-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .corridor-map-header h3 {
          margin: 0;
          color: #2C3E50;
          font-size: 1.6rem;
          font-weight: 600;
        }

        .data-source-indicator {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .data-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        .data-badge.real-api {
          background: linear-gradient(135deg, #28a745, #20c997);
        }

        .data-badge.enhanced-mock {
          background: linear-gradient(135deg, #6c757d, #495057);
        }

        .api-status {
          display: flex;
          gap: 12px;
        }

        .api-indicator {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 500;
        }

        .api-indicator.connected {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .api-indicator.disconnected {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .corridor-map-controls {
          display: flex;
          gap: 30px;
          align-items: center;
          flex-wrap: wrap;
        }

        .priority-legend {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          background: rgba(248, 249, 250, 0.8);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #E0E0E0;
        }

        .legend-title {
          font-weight: bold;
          color: #2C3E50;
          margin-right: 10px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #495057;
        }

        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .map-view-container {
          background: #F8F9FA;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .station-tooltip {
          position: absolute;
          background: rgba(44, 62, 80, 0.95);
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          pointer-events: none;
          z-index: 1000;
          max-width: 280px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .tooltip-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hub-badge {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #333;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .tooltip-content div {
          margin: 4px 0;
          line-height: 1.4;
        }

        .suggestions-preview {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
        }

        .suggestion-item {
          font-size: 11px;
          margin: 5px 0;
          padding: 3px 0;
          color: #FFD700;
          line-height: 1.3;
        }

        .more-suggestions {
          font-size: 10px;
          color: #BDC3C7;
          font-style: italic;
          margin-top: 5px;
        }

        @media (max-width: 768px) {
          .corridor-map-container {
            padding: 15px;
          }

          .corridor-map-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .corridor-map-header h3 {
            font-size: 1.4rem;
          }

          .corridor-map-controls {
            width: 100%;
            justify-content: flex-start;
          }

          .priority-legend {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            width: 100%;
          }

          .map-view-container svg {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
};

export default CorridorMap;