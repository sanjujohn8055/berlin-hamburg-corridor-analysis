import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CorridorStation } from '../shared/types';

interface CorridorAnalyticsProps {
  stations: CorridorStation[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const CorridorAnalytics: React.FC<CorridorAnalyticsProps> = ({ stations }) => {
  // Prepare delay data by station
  const delayData = stations
    .filter(s => s.realTimeData)
    .map(station => ({
      name: station.name.replace(' Hbf', '').replace('Berlin ', '').replace('Hamburg ', ''),
      avgDelay: station.realTimeData?.avgDelay || 0,
      delayed: station.realTimeData?.delayedTrains || 0,
      cancelled: station.realTimeData?.cancelledTrains || 0,
      total: station.realTimeData?.totalDepartures || 0,
    }));

  // Prepare facility distribution data
  const facilityData = [
    {
      name: 'WiFi',
      value: stations.filter(s => s.facilities.hasWiFi).length,
    },
    {
      name: 'DB Lounge',
      value: stations.filter(s => s.facilities.hasDBLounge).length,
    },
    {
      name: 'Travel Center',
      value: stations.filter(s => s.facilities.hasTravelCenter).length,
    },
    {
      name: 'Stepless Access',
      value: stations.filter(s => s.facilities.steplessAccess === 'yes').length,
    },
  ];

  // Prepare upgrade priority distribution
  const priorityDistribution = [
    {
      name: 'High Priority (80+)',
      value: stations.filter(s => s.upgradePriority >= 80).length,
      color: '#FF4444',
    },
    {
      name: 'Medium Priority (60-79)',
      value: stations.filter(s => s.upgradePriority >= 60 && s.upgradePriority < 80).length,
      color: '#FFA500',
    },
    {
      name: 'Low Priority (<60)',
      value: stations.filter(s => s.upgradePriority < 60).length,
      color: '#4CAF50',
    },
  ];

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '30px', color: '#333' }}>📊 Corridor Analytics Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
        {/* Average Delays by Station */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Average Delays by Station</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={delayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDelay" fill="#FF6B6B" name="Avg Delay (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Train Status Distribution */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Train Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={delayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="delayed" fill="#FFA500" name="Delayed" stackId="a" />
              <Bar dataKey="cancelled" fill="#FF4444" name="Cancelled" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Facility Coverage */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Facility Coverage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={facilityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {facilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Upgrade Priority Distribution */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Upgrade Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Distance vs Priority Trend */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Distance from Berlin vs Upgrade Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={stations.map(s => ({
                name: s.name.replace(' Hbf', ''),
                distance: s.distanceFromBerlin,
                priority: s.upgradePriority,
                platforms: s.platforms,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="distance" label={{ value: 'Distance from Berlin (km)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Priority Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="priority" stroke="#8884d8" strokeWidth={2} name="Upgrade Priority" />
              <Line type="monotone" dataKey="platforms" stroke="#82ca9d" strokeWidth={2} name="Platform Count" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>{stations.length}</div>
          <div style={{ color: '#666', marginTop: '5px' }}>Total Stations</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
            {stations.filter(s => s.isStrategicHub).length}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Strategic Hubs</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF9800' }}>
            {Math.round(stations.reduce((sum, s) => sum + (s.realTimeData?.avgDelay || 0), 0) / stations.filter(s => s.realTimeData).length || 0)}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Avg Delay (min)</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F44336' }}>
            {stations.reduce((sum, s) => sum + (s.realTimeData?.cancelledTrains || 0), 0)}
          </div>
          <div style={{ color: '#666', marginTop: '5px' }}>Total Cancellations</div>
        </div>
      </div>
    </div>
  );
};
