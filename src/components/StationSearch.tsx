import React, { useState, useMemo } from 'react';
import { CorridorStation } from '../shared/types';

interface StationSearchProps {
  stations: CorridorStation[];
  onStationSelect: (station: CorridorStation) => void;
}

export const StationSearch: React.FC<StationSearchProps> = ({ stations, onStationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    hasWiFi: false,
    hasDBLounge: false,
    hasTravelCenter: false,
    steplessAccess: false,
    isStrategicHub: false,
    minPriority: 0,
    maxDelay: 999,
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Search term filter
      const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           station.eva.toString().includes(searchTerm);

      // Facility filters
      const matchesWiFi = !filters.hasWiFi || station.facilities.hasWiFi;
      const matchesLounge = !filters.hasDBLounge || station.facilities.hasDBLounge;
      const matchesTravelCenter = !filters.hasTravelCenter || station.facilities.hasTravelCenter;
      const matchesStepless = !filters.steplessAccess || station.facilities.steplessAccess === 'yes';
      const matchesHub = !filters.isStrategicHub || station.isStrategicHub;

      // Priority filter
      const matchesPriority = station.upgradePriority >= filters.minPriority;

      // Delay filter
      const matchesDelay = !station.realTimeData || 
                          (station.realTimeData.avgDelay <= filters.maxDelay);

      return matchesSearch && matchesWiFi && matchesLounge && matchesTravelCenter && 
             matchesStepless && matchesHub && matchesPriority && matchesDelay;
    });
  }, [stations, searchTerm, filters]);

  const resetFilters = () => {
    setFilters({
      hasWiFi: false,
      hasDBLounge: false,
      hasTravelCenter: false,
      steplessAccess: false,
      isStrategicHub: false,
      minPriority: 0,
      maxDelay: 999,
    });
    setSearchTerm('');
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    typeof v === 'boolean' ? v : v > 0 && v < 999
  ).length;

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>🔍 Station Search & Filter</h3>
        
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by station name or EVA number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 40px 12px 12px',
              fontSize: '14px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#4A90E2'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#999',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px',
              backgroundColor: showFilters ? '#4A90E2' : '#f5f5f5',
              color: showFilters ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {showFilters ? '▼' : '▶'} Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '6px',
            marginBottom: '15px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Facility Filters */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.hasWiFi}
                  onChange={(e) => setFilters({ ...filters, hasWiFi: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>📶 Has WiFi</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.hasDBLounge}
                  onChange={(e) => setFilters({ ...filters, hasDBLounge: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>🛋️ DB Lounge</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.hasTravelCenter}
                  onChange={(e) => setFilters({ ...filters, hasTravelCenter: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>ℹ️ Travel Center</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.steplessAccess}
                  onChange={(e) => setFilters({ ...filters, steplessAccess: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>♿ Stepless Access</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.isStrategicHub}
                  onChange={(e) => setFilters({ ...filters, isStrategicHub: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>⭐ Strategic Hub</span>
              </label>
            </div>

            {/* Range Filters */}
            <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                  Min Priority Score: {filters.minPriority}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minPriority}
                  onChange={(e) => setFilters({ ...filters, minPriority: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                  Max Avg Delay: {filters.maxDelay === 999 ? 'Any' : `${filters.maxDelay} min`}
                </label>
                <input
                  type="range"
                  min="0"
                  max="999"
                  value={filters.maxDelay}
                  onChange={(e) => setFilters({ ...filters, maxDelay: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#1976d2',
          marginBottom: '15px',
        }}>
          Found {filteredStations.length} of {stations.length} stations
        </div>
      </div>

      {/* Results List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredStations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>No stations match your search criteria</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredStations.map(station => (
              <div
                key={station.eva}
                onClick={() => onStationSelect(station)}
                style={{
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.borderColor = '#4A90E2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9f9f9';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                      {station.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      EVA: {station.eva} • {station.distanceFromBerlin}km from Berlin
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {station.isStrategicHub && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#FFD700', borderRadius: '12px' }}>
                          ⭐ Hub
                        </span>
                      )}
                      {station.facilities.hasWiFi && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '12px' }}>
                          📶 WiFi
                        </span>
                      )}
                      {station.facilities.hasDBLounge && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#2196F3', color: 'white', borderRadius: '12px' }}>
                          🛋️ Lounge
                        </span>
                      )}
                      {station.facilities.steplessAccess === 'yes' && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#9C27B0', color: 'white', borderRadius: '12px' }}>
                          ♿ Accessible
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold',
                      color: station.upgradePriority >= 80 ? '#ff4444' : station.upgradePriority >= 60 ? '#ff9800' : '#4caf50',
                    }}>
                      {station.upgradePriority}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Priority</div>
                    {station.realTimeData && (
                      <div style={{ marginTop: '5px', fontSize: '12px', color: '#ff6b6b' }}>
                        {station.realTimeData.avgDelay}min delay
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
