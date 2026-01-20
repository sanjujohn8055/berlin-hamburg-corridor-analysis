import React, { useState, useEffect, useRef } from 'react';
import { CorridorStation } from '../shared/types';

interface CorridorMapProps {
  stations: CorridorStation[];
  onStationClick?: (station: CorridorStation) => void;
  selectedStation?: CorridorStation | null;
  showPriorityColors?: boolean;
  showRiskZones?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Linear corridor map visualization component for Berlin-Hamburg route
 * Displays stations in sequence with distance markers and priority color coding
 */
export const CorridorMap: React.FC<CorridorMapProps> = ({
  stations,
  onStationClick,
  selectedStation,
  showPriorityColors = true,
  showRiskZones = false,
  zoomLevel = 1,
  onZoomChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1000, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStation, setHoveredStation] = useState<CorridorStation | null>(null);

  // Constants for visualization
  const CORRIDOR_LENGTH = 289; // km Berlin to Hamburg
  const MAP_WIDTH = 900;
  const MAP_HEIGHT = 150;
  const STATION_RADIUS = 6;
  const TRACK_Y = MAP_HEIGHT / 2;

  /**
   * Converts distance from Berlin to X coordinate on the map
   */
  const distanceToX = (distance: number): number => {
    return (distance / CORRIDOR_LENGTH) * MAP_WIDTH + 50; // 50px margin
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
   * Handles mouse wheel zoom
   */
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
    onZoomChange?.(newZoom);
  };

  /**
   * Handles mouse down for panning
   */
  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  /**
   * Handles mouse move for panning
   */
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    setViewBox(prev => ({
      ...prev,
      x: prev.x - deltaX / zoomLevel,
      y: prev.y - deltaY / zoomLevel
    }));

    setDragStart({ x: event.clientX, y: event.clientY });
  };

  /**
   * Handles mouse up to stop panning
   */
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /**
   * Handles station click
   */
  const handleStationClick = (station: CorridorStation) => {
    onStationClick?.(station);
  };

  /**
   * Generates distance markers along the corridor
   */
  const generateDistanceMarkers = () => {
    const markers = [];
    for (let distance = 0; distance <= CORRIDOR_LENGTH; distance += 50) {
      const x = distanceToX(distance);
      markers.push(
        <g key={`marker-${distance}`}>
          <line
            x1={x}
            y1={TRACK_Y - 10}
            x2={x}
            y2={TRACK_Y + 10}
            stroke="#666"
            strokeWidth="1"
          />
          <text
            x={x}
            y={TRACK_Y + 25}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {distance}km
          </text>
        </g>
      );
    }
    return markers;
  };

  /**
   * Generates risk zone overlays
   */
  const generateRiskZones = () => {
    if (!showRiskZones) return null;

    // Mock risk zones for demonstration
    const riskZones = [
      { start: 0, end: 30, level: 'high', name: 'Berlin Metropolitan' },
      { start: 100, end: 140, level: 'medium', name: 'Central Corridor' },
      { start: 250, end: 289, level: 'high', name: 'Hamburg Metropolitan' }
    ];

    return riskZones.map((zone, index) => {
      const startX = distanceToX(zone.start);
      const endX = distanceToX(zone.end);
      const color = zone.level === 'high' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 170, 0, 0.2)';

      return (
        <g key={`risk-zone-${index}`}>
          <rect
            x={startX}
            y={TRACK_Y - 30}
            width={endX - startX}
            height={60}
            fill={color}
            stroke={zone.level === 'high' ? '#FF4444' : '#FFAA00'}
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <text
            x={startX + (endX - startX) / 2}
            y={TRACK_Y - 35}
            textAnchor="middle"
            fontSize="9"
            fill="#333"
            fontWeight="bold"
          >
            {zone.name}
          </text>
        </g>
      );
    });
  };

  // Update viewBox based on zoom level
  useEffect(() => {
    const scaledWidth = 1000 / zoomLevel;
    const scaledHeight = 200 / zoomLevel;
    setViewBox(prev => ({
      ...prev,
      width: scaledWidth,
      height: scaledHeight
    }));
  }, [zoomLevel]);

  return (
    <div className="corridor-map-container">
      <div className="corridor-map-header">
        <h3>Berlin-Hamburg Corridor Map</h3>
        <div className="corridor-map-controls">
          <div className="zoom-controls">
            <button 
              onClick={() => onZoomChange?.(Math.min(3, zoomLevel + 0.2))}
              disabled={zoomLevel >= 3}
            >
              Zoom In
            </button>
            <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
            <button 
              onClick={() => onZoomChange?.(Math.max(0.5, zoomLevel - 0.2))}
              disabled={zoomLevel <= 0.5}
            >
              Zoom Out
            </button>
          </div>
          
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

      <div className="corridor-map-svg-container">
        <svg
          ref={svgRef}
          width="100%"
          height="300"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Background */}
          <rect width="1000" height="200" fill="#f8f9fa" />
          
          {/* Risk zones (if enabled) */}
          {generateRiskZones()}
          
          {/* Main railway track */}
          <line
            x1={50}
            y1={TRACK_Y}
            x2={MAP_WIDTH + 50}
            y2={TRACK_Y}
            stroke="#333"
            strokeWidth="3"
          />
          
          {/* Distance markers */}
          {generateDistanceMarkers()}
          
          {/* Stations */}
          {stations.map((station) => {
            const x = distanceToX(station.distanceFromBerlin);
            const isSelected = selectedStation?.eva === station.eva;
            const isHovered = hoveredStation?.eva === station.eva;
            const priorityColor = getPriorityColor(station.upgradePriority);
            
            return (
              <g key={station.eva}>
                {/* Station circle */}
                <circle
                  cx={x}
                  cy={TRACK_Y}
                  r={isSelected || isHovered ? STATION_RADIUS + 2 : STATION_RADIUS}
                  fill={priorityColor}
                  stroke={isSelected ? '#000' : '#fff'}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleStationClick(station)}
                  onMouseEnter={() => setHoveredStation(station)}
                  onMouseLeave={() => setHoveredStation(null)}
                />
                
                {/* Strategic hub indicator */}
                {station.isStrategicHub && (
                  <circle
                    cx={x}
                    cy={TRACK_Y}
                    r={STATION_RADIUS + 4}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                )}
                
                {/* Station name */}
                <text
                  x={x}
                  y={TRACK_Y - STATION_RADIUS - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#333"
                  fontWeight={station.isStrategicHub ? 'bold' : 'normal'}
                >
                  {station.name}
                </text>
                
                {/* Distance label */}
                <text
                  x={x}
                  y={TRACK_Y + STATION_RADIUS + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#666"
                >
                  {station.distanceFromBerlin}km
                </text>
              </g>
            );
          })}
          
          {/* City labels */}
          <text x={distanceToX(0)} y={30} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
            Berlin
          </text>
          <text x={distanceToX(289)} y={30} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
            Hamburg
          </text>
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
          </div>
        </div>
      )}

      <style>{`
        .corridor-map-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin: 20px 0;
        }

        .corridor-map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .corridor-map-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .corridor-map-controls {
          display: flex;
          gap: 30px;
          align-items: center;
          flex-wrap: wrap;
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .zoom-controls button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .zoom-controls button:hover:not(:disabled) {
          background: #f5f5f5;
        }

        .zoom-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .priority-legend {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .legend-title {
          font-weight: bold;
          color: #333;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid #fff;
        }

        .corridor-map-svg-container {
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          background: #f8f9fa;
        }

        .station-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 10px;
          border-radius: 6px;
          font-size: 12px;
          pointer-events: none;
          z-index: 1000;
          max-width: 250px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .tooltip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hub-badge {
          background: #FFD700;
          color: #333;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .tooltip-content div {
          margin: 3px 0;
        }

        @media (max-width: 768px) {
          .corridor-map-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .corridor-map-controls {
            width: 100%;
            justify-content: space-between;
          }

          .priority-legend {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default CorridorMap;