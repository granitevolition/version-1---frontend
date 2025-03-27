import React, { useState, useEffect } from 'react';
import { testApiConnection, testApiEcho, checkApiHealth } from '../services/api';

const TestConnectivity = () => {
  const [testResult, setTestResult] = useState(null);
  const [echoResult, setEchoResult] = useState(null);
  const [healthResult, setHealthResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [echoData, setEchoData] = useState('{"test":"Hello API"}');

  const runApiTest = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (err) {
      console.error('API test failed:', err);
      setError(`API test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runApiEcho = async () => {
    setLoading(true);
    setError(null);
    setEchoResult(null);
    
    try {
      // Parse the JSON data
      let dataToSend;
      try {
        dataToSend = JSON.parse(echoData);
      } catch (parseErr) {
        throw new Error(`Invalid JSON: ${parseErr.message}`);
      }
      
      const result = await testApiEcho(dataToSend);
      setEchoResult(result);
    } catch (err) {
      console.error('API echo failed:', err);
      setError(`API echo failed: ${err.message}`);
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
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Connectivity Test</h1>
      
      {error && (
        <div style={{ padding: '10px', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '4px', marginBottom: '20px' }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
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
            <pre>{JSON.stringify(healthResult, null, 2)}</pre>
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>API Connection Test</h2>
        <button 
          onClick={runApiTest}
          disabled={loading}
          style={{ padding: '8px 16px', marginRight: '10px' }}
        >
          {loading ? 'Testing...' : 'Test API Connection'}
        </button>
        
        {testResult && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h3>Test Result</h3>
            <pre>{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>
      
      <div>
        <h2>API Echo Test</h2>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Data to Echo (JSON):
          </label>
          <textarea
            value={echoData}
            onChange={(e) => setEchoData(e.target.value)}
            style={{ width: '100%', height: '100px', padding: '8px' }}
            disabled={loading}
          />
        </div>
        
        <button 
          onClick={runApiEcho}
          disabled={loading}
          style={{ padding: '8px 16px', marginRight: '10px' }}
        >
          {loading ? 'Testing...' : 'Run Echo Test'}
        </button>
        
        {echoResult && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h3>Echo Result</h3>
            <pre>{JSON.stringify(echoResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestConnectivity;
