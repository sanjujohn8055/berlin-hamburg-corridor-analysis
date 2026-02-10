import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CorridorMap } from '../src/components/CorridorMap';

describe('CorridorMap', () => {
  const mockStations = [
    {
      eva: 8011160,
      name: 'Berlin Hbf',
      coordinates: [13.369545, 52.525589] as [number, number],
      distanceFromBerlin: 0,
      category: 1,
      platforms: 14,
      facilities: {
        hasWiFi: true,
        hasTravelCenter: true,
        hasDBLounge: true,
        hasLocalPublicTransport: true,
        hasParking: true,
        steplessAccess: 'yes' as const,
        hasMobilityService: true,
      },
      upgradePriority: 85,
      isStrategicHub: true,
      congestionReasons: [],
      suggestions: [],
      dataSource: 'real-api' as const,
    },
    {
      eva: 8002548,
      name: 'Hamburg Hbf',
      coordinates: [9.991234, 53.552645] as [number, number],
      distanceFromBerlin: 289,
      category: 1,
      platforms: 12,
      facilities: {
        hasWiFi: true,
        hasTravelCenter: true,
        hasDBLounge: true,
        hasLocalPublicTransport: true,
        hasParking: true,
        steplessAccess: 'yes' as const,
        hasMobilityService: true,
      },
      upgradePriority: 80,
      isStrategicHub: true,
      congestionReasons: [],
      suggestions: [],
      dataSource: 'real-api' as const,
    },
  ];

  const mockApiStatus = {
    stada: true,
    timetables: true,
  };

  it('should render the map container', () => {
    render(
      <CorridorMap
        stations={mockStations}
        selectedStation={null}
        onStationClick={jest.fn()}
        showPriorityColors={false}
        showRiskZones={false}
        dataSource="real-api"
        apiStatus={mockApiStatus}
      />
    );

    expect(screen.getByText(/Berlin-Hamburg Corridor/i)).toBeInTheDocument();
  });

  it('should display station names', () => {
    render(
      <CorridorMap
        stations={mockStations}
        selectedStation={null}
        onStationClick={jest.fn()}
        showPriorityColors={false}
        showRiskZones={false}
        dataSource="real-api"
        apiStatus={mockApiStatus}
      />
    );

    // Stations are rendered in SVG, check for their presence
    expect(screen.getByText(/Berlin Hbf/i)).toBeInTheDocument();
    expect(screen.getByText(/Hamburg Hbf/i)).toBeInTheDocument();
  });

  it('should render with selected station', () => {
    const { container } = render(
      <CorridorMap
        stations={mockStations}
        selectedStation={mockStations[0]}
        onStationClick={jest.fn()}
        showPriorityColors={false}
        showRiskZones={false}
        dataSource="real-api"
        apiStatus={mockApiStatus}
      />
    );

    // Component should render successfully with selected station
    expect(container.querySelector('.corridor-map-container')).toBeInTheDocument();
  });

  it('should render with priority colors enabled', () => {
    const { container } = render(
      <CorridorMap
        stations={mockStations}
        selectedStation={null}
        onStationClick={jest.fn()}
        showPriorityColors={true}
        showRiskZones={false}
        dataSource="real-api"
        apiStatus={mockApiStatus}
      />
    );

    // Component should render successfully with priority colors
    expect(container.querySelector('.corridor-map-container')).toBeInTheDocument();
  });

  it('should show data source indicator', () => {
    render(
      <CorridorMap
        stations={mockStations}
        selectedStation={null}
        onStationClick={jest.fn()}
        showPriorityColors={false}
        showRiskZones={false}
        dataSource="real-api"
        apiStatus={mockApiStatus}
      />
    );

    expect(screen.getAllByText(/Real API Data/i).length).toBeGreaterThan(0);
  });

  it('should render map with empty stations array', () => {
    const { container } = render(
      <CorridorMap
        stations={[]}
        selectedStation={null}
        onStationClick={jest.fn()}
        showPriorityColors={false}
        showRiskZones={false}
        dataSource="enhanced-mock"
        apiStatus={mockApiStatus}
      />
    );

    // Map should still render even with no stations
    expect(container.querySelector('.corridor-map-container')).toBeInTheDocument();
  });
});
