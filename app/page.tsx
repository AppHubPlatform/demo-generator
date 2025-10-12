'use client';

import { useState, FormEvent, useEffect } from 'react';

type Mode = 'single' | 'multiple' | 'mapped';
type UsageMode = 'manual' | 'autopilot';
type LogRocketServer = 'demo' | 'staging' | 'prod';

export default function Home() {
  const [usageMode, setUsageMode] = useState<UsageMode>('autopilot');
  const [mode, setMode] = useState<Mode>('single');
  const [useCloudEnv, setUseCloudEnv] = useState<boolean>(false);
  const [isProduction, setIsProduction] = useState<boolean>(false);
  const [logRocketServer, setLogRocketServer] = useState<LogRocketServer>('prod');
  const [logRocketAppId, setLogRocketAppId] = useState<string>('public-shares/credit-karma');
  const [websiteTarget, setWebsiteTarget] = useState<string>('https://creditkarma.com');
  const [instructionsPrompts, setInstructionsPrompts] = useState<string>('Browse around the site and click on credit cards.\nReview credit cards in 3 different categories\nReview types of personal loans');
  const [numSessions, setNumSessions] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);
  const [isKilling, setIsKilling] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<Array<{
    id: string;
    startTime: string;
    debugUrl?: string;
    sessionUrl?: string;
    browserbaseSessionId?: string;
  }>>([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResults(null);
    setError(null);

    try {
      const payload: any = {
        mode,
        useCloudEnv,
        websiteTarget,
        logRocketServer,
        logRocketAppId,
      };

      if (mode === 'single' || mode === 'multiple') {
        payload.instructionsPrompts = instructionsPrompts.split('\n').filter((p: string) => p.trim());
      }

      if (mode === 'multiple') {
        payload.numSessions = numSessions;
      }

      if (mode === 'mapped') {
        payload.listOfInstructionsPrompts = instructionsPrompts
          .split('\n\n')
          .map((group: string) => group.split('\n').filter((p: string) => p.trim()));
      }

      const response = await fetch('/api/run-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run automation');
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionCount = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setActiveSessionCount(data.count || 0);
      setActiveSessions(data.sessions || []);
    } catch (err) {
      console.error('Error fetching session count:', err);
    }
  };

  const handleKillAll = async () => {
    setIsKilling(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to kill sessions');
      }

      fetchSessionCount();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to kill sessions');
    } finally {
      setIsKilling(false);
    }
  };

  useEffect(() => {
    // Fetch environment configuration
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        setIsProduction(data.isProduction);
        if (data.isProduction) {
          setUseCloudEnv(true); // Force cloud environment in production
        }
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    };

    fetchConfig();
    fetchSessionCount();
    const interval = setInterval(fetchSessionCount, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Browser Automation GUI</h1>
      </div>

      {/* Usage Mode Switcher */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setUsageMode('autopilot')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: usageMode === 'autopilot' ? 'bold' : 'normal',
            backgroundColor: usageMode === 'autopilot' ? '#0070f3' : 'transparent',
            color: usageMode === 'autopilot' ? 'white' : '#333',
            border: usageMode === 'autopilot' ? 'none' : '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Autopilot Mode
        </button>
        <button
          onClick={() => setUsageMode('manual')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: usageMode === 'manual' ? 'bold' : 'normal',
            backgroundColor: usageMode === 'manual' ? '#0070f3' : 'transparent',
            color: usageMode === 'manual' ? 'white' : '#333',
            border: usageMode === 'manual' ? 'none' : '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Manual Mode
        </button>
      </div>

      {/* Manual Mode UI */}
      {usageMode === 'manual' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Active Sessions: <strong>{activeSessionCount}</strong>
              </span>
              <button
                type="button"
                onClick={handleKillAll}
                disabled={isKilling || activeSessionCount === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: isKilling || activeSessionCount === 0 ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isKilling || activeSessionCount === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isKilling ? 'Killing...' : 'Kill All Sessions'}
              </button>
            </div>
          </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="single">Single Session</option>
            <option value="multiple">Multiple Sessions</option>
            <option value="mapped">Mapped Sessions</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            LogRocket Server
          </label>
          <select
            value={logRocketServer}
            onChange={(e) => setLogRocketServer(e.target.value as LogRocketServer)}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="prod">Production</option>
            <option value="staging">Staging</option>
            <option value="demo">Demo</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            LogRocket App ID
          </label>
          <input
            type="text"
            value={logRocketAppId}
            onChange={(e) => setLogRocketAppId(e.target.value)}
            placeholder="e.g., public-shares/credit-karma"
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        {!isProduction && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={useCloudEnv}
                onChange={(e) => setUseCloudEnv(e.target.checked)}
              />
              Use Cloud Environment (Browserbase)
            </label>
          </div>
        )}
        {isProduction && (
          <div style={{
            padding: '10px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '5px',
            fontSize: '14px',
            color: '#1565c0'
          }}>
            <strong>Production Mode:</strong> Using cloud environment (Browserbase)
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Website Target
          </label>
          <input
            type="text"
            value={websiteTarget}
            onChange={(e) => setWebsiteTarget(e.target.value)}
            placeholder="https://example.com"
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            required
          />
        </div>

        {mode === 'multiple' && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Number of Sessions
            </label>
            <input
              type="number"
              value={numSessions}
              onChange={(e) => setNumSessions(parseInt(e.target.value) || 1)}
              min="1"
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Instructions/Prompts
            {mode === 'mapped'
              ? ' (separate session groups with blank line)'
              : ' (one per line)'}
          </label>
          <textarea
            value={instructionsPrompts}
            onChange={(e) => setInstructionsPrompts(e.target.value)}
            placeholder={mode === 'mapped'
              ? "Session 1 prompt 1\nSession 1 prompt 2\n\nSession 2 prompt 1\nSession 2 prompt 2"
              : "Prompt 1\nPrompt 2\nPrompt 3"}
            style={{ width: '100%', padding: '8px', fontSize: '14px', minHeight: '150px' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isKilling}
          style={{
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: (isLoading || isKilling) ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (isLoading || isKilling) ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Running...' : isKilling ? 'Killing Sessions...' : 'Run Automation'}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '5px',
          color: '#c00',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '5px',
        }}>
          <strong>Results:</strong>
          <pre style={{
            marginTop: '10px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '400px',
            overflow: 'auto',
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
        </>
      )}

      {/* Autopilot Mode UI */}
      {usageMode === 'autopilot' && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '10px',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Autopilot Mode</h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
            Guided automation workflow coming soon...
          </p>
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px dashed #ccc'
          }}>
            <p style={{ color: '#999', margin: 0 }}>Autopilot functionality will be implemented here</p>
          </div>
        </div>
      )}
    </div>

    {activeSessions.length > 0 && activeSessions.some(s => s.debugUrl) && (
      <div style={{ marginTop: '30px', padding: '0 20px' }}>
        <h2>Live Sessions</h2>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          marginTop: '15px',
        }}>
          {activeSessions.filter(s => s.debugUrl).map((session) => (
            <div
              key={session.id}
              style={{
                border: '2px solid #ddd',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                flex: '0 0 calc(50% - 10px)',
                maxWidth: 'calc(40% - 10px)',
              }}
            >
              <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                <strong>Session:</strong> {session.id.slice(0, 8)}...
                <br />
                <strong>Started:</strong> {new Date(session.startTime).toLocaleTimeString()}
              </div>
              <iframe
                src={session.debugUrl}
                style={{
                  width: '100%',
                  height: '400px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                title={`Session ${session.id}`}
              />
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}
