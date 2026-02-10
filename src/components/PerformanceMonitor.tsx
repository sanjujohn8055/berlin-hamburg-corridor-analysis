import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceMetrics {
  timestamp: string;
  apiResponseTime: number;
  dataFreshness: number;
  activeConnections: number;
  errorRate: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    avgResponseTime: 0,
    uptime: 0,
    totalRequests: 0,
    errorCount: 0,
  });

  useEffect(() => {
    // Simulate performance monitoring
    const interval = setInterval(() => {
      const now = new Date();
      const newMetric: PerformanceMetrics = {
        timestamp: now.toLocaleTimeString(),
        apiResponseTime: Math.random() * 500 + 100,
        dataFreshness: Math.random() * 30 + 5,
        activeConnections: Math.floor(Math.random() * 50 + 10),
        errorRate: Math.random() * 2,
      };

      setMetrics(prev => {
        const updated = [...prev, newMetric];
        return updated.slice(-20); // Keep last 20 data points
      });

      // Update current metrics
      setCurrentMetrics(prev => ({
        avgResponseTime: Math.round((prev.avgResponseTime * 0.9 + newMetric.apiResponseTime * 0.1)),
        uptime: prev.uptime + 5,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10 + 1),
        errorCount: prev.errorCount + (Math.random() > 0.95 ? 1 : 0),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const uptimeHours = Math.floor(currentMetrics.uptime / 3600);
  const uptimeMinutes = Math.floor((currentMetrics.uptime % 3600) / 60);
  const errorPercentage = currentMetrics.totalRequests > 0 
    ? ((currentMetrics.errorCount / currentMetrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '30px', color: '#333' }}>⚡ Performance Monitoring Dashboard</h2>

      {/* Key Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Avg Response Time</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
            {currentMetrics.avgResponseTime}ms
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {currentMetrics.avgResponseTime < 200 ? '✓ Excellent' : currentMetrics.avgResponseTime < 500 ? '⚠ Good' : '⚠ Slow'}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>System Uptime</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
            {uptimeHours}h {uptimeMinutes}m
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            ✓ Running smoothly
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Total Requests</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF9800' }}>
            {currentMetrics.totalRequests.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Since startup
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Error Rate</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: parseFloat(errorPercentage) > 5 ? '#F44336' : '#4CAF50' }}>
            {errorPercentage}%
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {currentMetrics.errorCount} errors
          </div>
        </div>
      </div>

      {/* Real-time Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
        {/* API Response Time Chart */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>API Response Time (ms)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="apiResponseTime" stroke="#4CAF50" strokeWidth={2} name="Response Time" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Active Connections Chart */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Active Connections</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="activeConnections" stroke="#2196F3" strokeWidth={2} name="Connections" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Freshness Chart */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Data Freshness (seconds)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dataFreshness" stroke="#FF9800" strokeWidth={2} name="Age (s)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Error Rate Chart */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px', color: '#555' }}>Error Rate (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="errorRate" stroke="#F44336" strokeWidth={2} name="Error Rate" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health Status */}
      <div style={{ marginTop: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>System Health Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50' }}></div>
            <span>API Server: Online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50' }}></div>
            <span>Database: Connected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50' }}></div>
            <span>Real-time Updates: Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50' }}></div>
            <span>Cache: Operational</span>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div style={{ marginTop: '20px', backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '10px', color: '#1976d2' }}>💡 Performance Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
          <li>Response times under 200ms indicate excellent performance</li>
          <li>Error rates below 1% are considered healthy</li>
          <li>Data freshness under 30 seconds ensures real-time accuracy</li>
          <li>Monitor active connections to prevent overload</li>
        </ul>
      </div>
    </div>
  );
};
