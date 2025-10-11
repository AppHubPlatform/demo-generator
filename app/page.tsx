'use client';

import { useState, FormEvent } from 'react';

type Mode = 'single' | 'multiple' | 'mapped';

export default function Home() {
  const [mode, setMode] = useState<Mode>('single');
  const [useCloudEnv, setUseCloudEnv] = useState<boolean>(false);
  const [websiteTarget, setWebsiteTarget] = useState<string>('https://creditkarma.com');
  const [instructionsPrompts, setInstructionsPrompts] = useState<string>('Browse around the site and click on credit cards.\nReview credit cards in 3 different categories\nReview types of personal loans');
  const [numSessions, setNumSessions] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Browser Automation GUI</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="single">Single Session</option>
            <option value="multiple">Multiple Sessions</option>
            <option value="mapped">Mapped Sessions</option>
          </select>
        </div>

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
          disabled={isLoading}
          style={{
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: isLoading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Running...' : 'Run Automation'}
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
    </div>
  );
}
