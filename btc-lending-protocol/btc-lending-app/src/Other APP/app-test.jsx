import { useState } from 'react';
import { StacksTestnet } from '@stacks/network';

const CONFIG = {
  CONTRACT_ADDRESS: 'ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3',
  LOAN_PROTOCOL: 'loan-protocol-v20',
  NETWORK: new StacksTestnet()
};

function TestAPI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      // Test 1: Check if contract exists
      const url = `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/is-initialized`;
      
      setResult(`Calling: ${url}\n\n`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: CONFIG.CONTRACT_ADDRESS,
          arguments: []
        })
      });
      
      setResult(prev => prev + `Status: ${response.status}\n\n`);
      
      const text = await response.text();
      setResult(prev => prev + `Raw response:\n${text}\n\n`);
      
      if (response.ok) {
        const json = JSON.parse(text);
        setResult(prev => prev + `Parsed JSON:\n${JSON.stringify(json, null, 2)}`);
      } else {
        setResult(prev => prev + `ERROR: Response not OK`);
      }
      
    } catch (error) {
      setResult(prev => prev + `\n\nERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#1e293b', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1>API Debug Tool</h1>
      <button 
        onClick={testAPI} 
        disabled={loading}
        style={{ padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', marginBottom: '20px' }}
      >
        {loading ? 'Testing...' : 'Test API Call'}
      </button>
      
      <pre style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', overflow: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
        {result || 'Click button to test API call'}
      </pre>
      
      <div style={{ marginTop: '20px', padding: '16px', background: '#0f172a', borderRadius: '8px' }}>
        <h3>Contract Info:</h3>
        <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          <div>Address: {CONFIG.CONTRACT_ADDRESS}</div>
          <div>Contract: {CONFIG.LOAN_PROTOCOL}</div>
          <div>API: {CONFIG.NETWORK.coreApiUrl}</div>
        </div>
      </div>
    </div>
  );
}

export default TestAPI;
