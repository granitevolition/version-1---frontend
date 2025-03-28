import React, { useState, useEffect } from 'react';
import { isApiAvailable, checkApiHealth } from '../services/api';

const TestConnectivity = () => {
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: 'Checking connection...' });
  const [healthResult, setHealthResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runApiTest = async () => {
    setLoading(true);
    setError(null);
    setApiStatus({ status: 'checking', message: 'Testing connection...' });
    
    try {
      const available = await isApiAvailable();
      setApiStatus({
        status: available ? 'available' : 'unavailable',
        message: available ? 'API is connected' : 'API is not responding'
      });
    } catch (err) {
      console.error('API test failed:', err);
      setError(`API test failed: ${err.message}`);
      setApiStatus({
        status: 'error',
        message: `Error: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setHealthResult(null);
    
    try {
      const result = await checkApiHealth();
      setHealthResult(result);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(`Health check failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run the health check on component mount
    runHealthCheck();
    runApiTest();
  }, []);

  // Helper for status colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return '#4caf50';  // Green
      case 'unavailable': return '#f44336';  // Red
      case 'checking': return '#2196f3';  // Blue
      case 'error': return '#ff9800';  // Orange
      default: return '#9e9e9e';  // Grey
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Service Connectivity Test</h1>
      
      {error && (
        <div style={{ padding: '10px', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '4px', marginBottom: '20px' }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ 
          flex: 1, 
          padding: '15px', 
          borderRadius: '4px', 
          border: '1px solid #ddd',
          background: '#f9f9f9'
        }}>
          <h2>Backend API</h2>
          <div style={{
            padding: '10px',
            background: getStatusColor(apiStatus.status) + '22',
            borderLeft: `4px solid ${getStatusColor(apiStatus.status)}`,
            marginBottom: '10px'
          }}>
            <p><strong>Status:</strong> {apiStatus.status}</p>
            <p>{apiStatus.message}</p>
          </div>
          <button 
            onClick={runApiTest}
            disabled={loading}
            style={{ padding: '8px 16px', marginRight: '10px' }}
          >
            {loading ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Health Check</h2>
        <button 
          onClick={runHealthCheck}
          disabled={loading}
          style={{ padding: '8px 16px', marginRight: '10px' }}
        >
          {loading ? 'Running...' : 'Run Health Check'}
        </button>
        
        {healthResult && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h3>Health Check Result</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(healthResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestConnectivity;