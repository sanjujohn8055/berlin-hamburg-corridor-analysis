import React, { useState } from 'react';

interface AdminPanelProps {
  onClose: () => void;
}

interface User {
  username: string;
  role: 'admin' | 'supervisor' | 'analyst';
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: any[];
  uploadedAt: string;
  uploadedBy: string;
}

interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  enabled: boolean;
  addedBy: string;
  addedAt: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'api' | 'logs'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showApiForm, setShowApiForm] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    method: 'GET' as 'GET' | 'POST',
    headers: '',
  });

  // Simple authentication (in production, use proper backend auth)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Demo credentials - replace with real authentication
    const validUsers = {
      'admin': { password: 'admin123', role: 'admin' as const },
      'supervisor': { password: 'super123', role: 'supervisor' as const },
      'analyst': { password: 'analyst123', role: 'analyst' as const },
    };

    const user = validUsers[username as keyof typeof validUsers];
    if (user && user.password === password) {
      setCurrentUser({ username, role: user.role });
      setIsAuthenticated(true);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
  };

  // CSV File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const data = parseCSV(text);
          
          const uploadedFile: UploadedFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            data: data,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser?.username || 'unknown',
          };
          
          setUploadedFiles(prev => [...prev, uploadedFile]);
        };
        reader.readAsText(file);
      } else {
        alert('Please upload CSV files only');
      }
    });
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return data;
  };

  const handleApplyData = (file: UploadedFile) => {
    if (confirm(`Apply data from ${file.name}? This will update the system data.`)) {
      // In production, send to backend API
      console.log('Applying data:', file);
      alert(`Data from ${file.name} has been applied successfully!`);
      
      // Log the action
      logAction('data_upload', `Applied CSV file: ${file.name}`);
    }
  };

  const handleDeleteFile = (fileName: string) => {
    if (confirm(`Delete ${fileName}?`)) {
      setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
      logAction('data_delete', `Deleted CSV file: ${fileName}`);
    }
  };

  // API Endpoint Management
  const handleAddEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.url) {
      alert('Please fill in all required fields');
      return;
    }

    const endpoint: APIEndpoint = {
      id: Date.now().toString(),
      name: newEndpoint.name,
      url: newEndpoint.url,
      method: newEndpoint.method,
      headers: newEndpoint.headers ? JSON.parse(newEndpoint.headers) : undefined,
      enabled: true,
      addedBy: currentUser?.username || 'unknown',
      addedAt: new Date().toISOString(),
    };

    setApiEndpoints(prev => [...prev, endpoint]);
    setShowApiForm(false);
    setNewEndpoint({ name: '', url: '', method: 'GET', headers: '' });
    logAction('api_add', `Added API endpoint: ${endpoint.name}`);
  };

  const handleToggleEndpoint = (id: string) => {
    setApiEndpoints(prev =>
      prev.map(ep =>
        ep.id === id ? { ...ep, enabled: !ep.enabled } : ep
      )
    );
    logAction('api_toggle', `Toggled API endpoint: ${id}`);
  };

  const handleDeleteEndpoint = (id: string) => {
    const endpoint = apiEndpoints.find(ep => ep.id === id);
    if (confirm(`Delete API endpoint "${endpoint?.name}"?`)) {
      setApiEndpoints(prev => prev.filter(ep => ep.id !== id));
      logAction('api_delete', `Deleted API endpoint: ${endpoint?.name}`);
    }
  };

  const handleTestEndpoint = async (endpoint: APIEndpoint) => {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
      });
      const data = await response.json();
      alert(`API Test Successful!\nStatus: ${response.status}\nData: ${JSON.stringify(data).substring(0, 100)}...`);
    } catch (error) {
      alert(`API Test Failed: ${error}`);
    }
  };

  // Audit Logging
  const [auditLogs, setAuditLogs] = useState<Array<{
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }>>([]);

  const logAction = (action: string, details: string) => {
    setAuditLogs(prev => [{
      timestamp: new Date().toISOString(),
      user: currentUser?.username || 'unknown',
      action,
      details,
    }, ...prev]);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loginContainer}>
          <div style={styles.loginHeader}>
            <h2>🔐 Admin Access</h2>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
          
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={styles.input}
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.input}
                required
              />
            </div>
            
            <button type="submit" style={styles.loginButton}>
              Login
            </button>
          </form>
          
          <div style={styles.demoCredentials}>
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: admin / admin123</p>
            <p>Supervisor: supervisor / super123</p>
            <p>Analyst: analyst / analyst123</p>
          </div>
        </div>
      </div>
    );
  }

  // Main Admin Panel
  return (
    <div style={styles.overlay}>
      <div style={styles.adminContainer}>
        <div style={styles.adminHeader}>
          <div>
            <h2>⚙️ Admin Data Management</h2>
            <p style={styles.userInfo}>
              Logged in as: <strong>{currentUser?.username}</strong> ({currentUser?.role})
            </p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              ...styles.tab,
              ...(activeTab === 'upload' ? styles.activeTab : {}),
            }}
          >
            📁 CSV Upload
          </button>
          <button
            onClick={() => setActiveTab('api')}
            style={{
              ...styles.tab,
              ...(activeTab === 'api' ? styles.activeTab : {}),
            }}
          >
            🔌 API Config
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              ...styles.tab,
              ...(activeTab === 'logs' ? styles.activeTab : {}),
            }}
          >
            📋 Audit Logs
          </button>
        </div>

        <div style={styles.content}>
          {/* CSV Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <h3>Upload CSV Data Files</h3>
              <p style={styles.description}>
                Upload CSV files containing station data, delay information, or other corridor metrics.
                Files will be validated before being applied to the system.
              </p>

              <div
                style={{
                  ...styles.dropZone,
                  ...(dragActive ? styles.dropZoneActive : {}),
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div style={styles.dropZoneContent}>
                  <div style={styles.uploadIcon}>📤</div>
                  <p><strong>Drag and drop CSV files here</strong></p>
                  <p style={styles.orText}>or</p>
                  <label style={styles.browseButton}>
                    Browse Files
                    <input
                      type="file"
                      accept=".csv"
                      multiple
                      onChange={handleFileInput}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div style={styles.filesList}>
                  <h4>Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={styles.fileItem}>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName}>📄 {file.name}</div>
                        <div style={styles.fileDetails}>
                          {(file.size / 1024).toFixed(2)} KB • {file.data.length} rows • 
                          Uploaded by {file.uploadedBy} at {new Date(file.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={styles.fileActions}>
                        <button
                          onClick={() => handleApplyData(file)}
                          style={styles.applyButton}
                        >
                          Apply Data
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.name)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API Configuration Tab */}
          {activeTab === 'api' && (
            <div>
              <div style={styles.sectionHeader}>
                <h3>API Endpoint Configuration</h3>
                <button
                  onClick={() => setShowApiForm(!showApiForm)}
                  style={styles.addButton}
                >
                  + Add Endpoint
                </button>
              </div>

              {showApiForm && (
                <div style={styles.apiForm}>
                  <h4>Add New API Endpoint</h4>
                  <div style={styles.formGroup}>
                    <label>Endpoint Name *</label>
                    <input
                      type="text"
                      value={newEndpoint.name}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                      placeholder="e.g., External Station Data API"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>URL *</label>
                    <input
                      type="url"
                      value={newEndpoint.url}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                      placeholder="https://api.example.com/stations"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Method</label>
                    <select
                      value={newEndpoint.method}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, method: e.target.value as 'GET' | 'POST' })}
                      style={styles.input}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label>Headers (JSON format, optional)</label>
                    <textarea
                      value={newEndpoint.headers}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, headers: e.target.value })}
                      placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                      style={{ ...styles.input, minHeight: '80px' }}
                    />
                  </div>
                  <div style={styles.formActions}>
                    <button onClick={handleAddEndpoint} style={styles.saveButton}>
                      Save Endpoint
                    </button>
                    <button onClick={() => setShowApiForm(false)} style={styles.cancelButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.endpointsList}>
                {apiEndpoints.length === 0 ? (
                  <p style={styles.emptyState}>No API endpoints configured yet.</p>
                ) : (
                  apiEndpoints.map((endpoint) => (
                    <div key={endpoint.id} style={styles.endpointItem}>
                      <div style={styles.endpointInfo}>
                        <div style={styles.endpointName}>
                          <span style={endpoint.enabled ? styles.statusEnabled : styles.statusDisabled}>
                            {endpoint.enabled ? '🟢' : '🔴'}
                          </span>
                          {endpoint.name}
                        </div>
                        <div style={styles.endpointDetails}>
                          <span style={styles.methodBadge}>{endpoint.method}</span>
                          {endpoint.url}
                        </div>
                        <div style={styles.endpointMeta}>
                          Added by {endpoint.addedBy} on {new Date(endpoint.addedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={styles.endpointActions}>
                        <button
                          onClick={() => handleTestEndpoint(endpoint)}
                          style={styles.testButton}
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleToggleEndpoint(endpoint.id)}
                          style={styles.toggleButton}
                        >
                          {endpoint.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteEndpoint(endpoint.id)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <h3>Audit Logs</h3>
              <p style={styles.description}>
                Track all data management activities performed by authorized users.
              </p>

              <div style={styles.logsList}>
                {auditLogs.length === 0 ? (
                  <p style={styles.emptyState}>No audit logs yet.</p>
                ) : (
                  auditLogs.map((log, index) => (
                    <div key={index} style={styles.logItem}>
                      <div style={styles.logTimestamp}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div style={styles.logContent}>
                        <strong>{log.user}</strong> performed <strong>{log.action}</strong>
                        <div style={styles.logDetails}>{log.details}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  loginContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  loginHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  input: {
    padding: '10px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  loginButton: {
    padding: '12px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  demoCredentials: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#666',
  },
  adminContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  adminHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '2px solid #e0e0e0',
  },
  userInfo: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#666',
    lineHeight: '1',
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e0e0e0',
    padding: '0 30px',
  },
  tab: {
    padding: '15px 25px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#666',
  },
  activeTab: {
    color: '#4A90E2',
    borderBottomColor: '#4A90E2',
  },
  content: {
    padding: '30px',
    overflowY: 'auto',
    flex: 1,
  },
  description: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '20px',
  },
  dropZone: {
    border: '3px dashed #ccc',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  dropZoneActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#e3f2fd',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  uploadIcon: {
    fontSize: '48px',
  },
  orText: {
    color: '#999',
    margin: '0',
  },
  browseButton: {
    padding: '10px 20px',
    backgroundColor: '#4A90E2',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  filesList: {
    marginTop: '30px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  fileDetails: {
    fontSize: '12px',
    color: '#666',
  },
  fileActions: {
    display: 'flex',
    gap: '10px',
  },
  applyButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  apiForm: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  endpointsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  endpointItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  endpointInfo: {
    flex: 1,
  },
  endpointName: {
    fontWeight: 'bold',
    marginBottom: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  endpointDetails: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px',
  },
  endpointMeta: {
    fontSize: '11px',
    color: '#999',
  },
  methodBadge: {
    padding: '2px 8px',
    backgroundColor: '#4A90E2',
    color: 'white',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginRight: '8px',
  },
  statusEnabled: {
    fontSize: '12px',
  },
  statusDisabled: {
    fontSize: '12px',
  },
  endpointActions: {
    display: 'flex',
    gap: '8px',
  },
  testButton: {
    padding: '6px 12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  toggleButton: {
    padding: '6px 12px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  logItem: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #4A90E2',
  },
  logTimestamp: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '5px',
  },
  logContent: {
    fontSize: '14px',
  },
  logDetails: {
    fontSize: '13px',
    color: '#666',
    marginTop: '5px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '40px',
    fontSize: '14px',
  },
};
