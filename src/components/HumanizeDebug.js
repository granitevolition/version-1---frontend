import React, { useState } from 'react';
import { isLoggedIn, getAuthHeader } from '../services/api';

// Get environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://version-1-backend-production.up.railway.app/api/v1';
const DIRECT_HUMANIZER_API_URL = process.env.REACT_APP_HUMANIZER_API_URL || 'https://web-production-3db6c.up.railway.app/humanize_text';

const HumanizeDebug = () => {
  const [testText, setTestText] = useState('This is a test message. Please humanize this text.');
  const [directResponse, setDirectResponse] = useState(null);
  const [proxyResponse, setProxyResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test the direct humanizer API
  const testDirectAPI = async () => {
    setLoading(true);
    setError(null);
    setDirectResponse(null);
    
    try {
      console.log(`Testing direct API at ${DIRECT_HUMANIZER_API_URL}`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(DIRECT_HUMANIZER_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          input_text: testText
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData, null, 2);
        } catch (e) {
          errorText = await response.text();
        }
        
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setDirectResponse({
        status: response.status,
        headers: Object.fromEntries([...response.headers.entries()]),
        data
      });
      
    } catch (err) {
      console.error('Direct API test failed:', err);
      setError(`Direct API Test Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Test the backend proxy API
  const testProxyAPI = async () => {
    setLoading(true);
    setError(null);
    setProxyResponse(null);
    
    try {
      const proxyUrl = `${API_BASE_URL}/humanize/humanize-text`;
      console.log(`Testing proxy API at ${proxyUrl}`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authentication if logged in
      if (isLoggedIn()) {
        const authHeader = getAuthHeader();
        Object.assign(headers, authHeader);
      }
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text: testText
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData, null, 2);
        } catch (e) {
          errorText = await response.text();
        }
        
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setProxyResponse({
        status: response.status,
        headers: Object.fromEntries([...response.headers.entries()]),
        data
      });
      
    } catch (err) {
      console.error('Proxy API test failed:', err);
      setError(`Proxy API Test Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Humanize API Debug Tool</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>This tool helps diagnose issues with the humanize API connections.</p>
        <ul>
          <li><strong>Direct API URL:</strong> {DIRECT_HUMANIZER_API_URL}</li>
          <li><strong>Backend Proxy URL:</strong> {API_BASE_URL}/humanize/humanize-text</li>
        </ul>
      </div>
      
      {error && (
        <div style={{
          padding: '10px',
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Error</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{error}</pre>
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Test Text</h2>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          style={{ width: '100%', height: '100px', padding: '8px', marginBottom: '10px' }}
          disabled={loading}
        />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={testDirectAPI}
            disabled={loading}
            style={{ padding: '8px 16px' }}
          >
            {loading ? 'Testing...' : 'Test Direct API'}
          </button>
          
          <button
            onClick={testProxyAPI}
            disabled={loading}
            style={{ padding: '8px 16px' }}
          >
            {loading ? 'Testing...' : 'Test Backend Proxy API'}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>Direct API Response</h2>
          {directResponse ? (
            <div style={{ 
              padding: '10px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <h3>Status: {directResponse.status}</h3>
              <h4>Response Headers:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(directResponse.headers, null, 2)}
              </pre>
              <h4>Response Data:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(directResponse.data, null, 2)}
              </pre>
            </div>
          ) : (
            <p>No response yet. Click "Test Direct API" to check the connection.</p>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>Backend Proxy Response</h2>
          {proxyResponse ? (
            <div style={{ 
              padding: '10px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <h3>Status: {proxyResponse.status}</h3>
              <h4>Response Headers:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(proxyResponse.headers, null, 2)}
              </pre>
              <h4>Response Data:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(proxyResponse.data, null, 2)}
              </pre>
            </div>
          ) : (
            <p>No response yet. Click "Test Backend Proxy API" to check the connection.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HumanizeDebug;
