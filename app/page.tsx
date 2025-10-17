'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';

type Mode = 'single' | 'multiple' | 'mapped';
type UsageMode = 'manual' | 'wizard';
type LogRocketServer = 'demo' | 'staging' | 'prod';
type ScreenSize = 'randomize' | 'desktop-large' | 'desktop-medium' | 'iphone-regular' | 'iphone-plus';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usageMode, setUsageMode] = useState<UsageMode>('wizard');
  const [mode, setMode] = useState<Mode>('single');
  const [useCloudEnv, setUseCloudEnv] = useState<boolean>(true);
  const [isProduction, setIsProduction] = useState<boolean>(false);
  const [enableLogRocket, setEnableLogRocket] = useState<boolean>(true);
  const [logRocketServer, setLogRocketServer] = useState<LogRocketServer>('prod');
  const [logRocketAppId, setLogRocketAppId] = useState<string>('');
  const [screenSize, setScreenSize] = useState<ScreenSize>('randomize');
  const [modelProvider, setModelProvider] = useState<'anthropic' | 'google'>('anthropic');
  const [websiteTarget, setWebsiteTarget] = useState<string>('https://creditkarma.com');
  const [instructionsPrompts, setInstructionsPrompts] = useState<string>('Browse around the site and click on credit cards.\nReview credit cards in 3 different categories\nReview types of personal loans');
  const [mappedPrompts, setMappedPrompts] = useState<string[]>(['', '', '', '', '']);
  const [numSessions, setNumSessions] = useState<number>(1);
  const [requiresLogin, setRequiresLogin] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
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
    promptLabel?: string;
    promptText?: string;
  }>>([]);

  // Wizard mode state
  const [wizardWebsite, setWizardWebsite] = useState<string>('');
  const [wizardResearch, setWizardResearch] = useState<string>('');
  const [wizardPrompts, setWizardPrompts] = useState<string[]>([]);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [researchStatus, setResearchStatus] = useState<string>('');
  const [numPromptsToGenerate, setNumPromptsToGenerate] = useState<number>(5);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [editingPromptText, setEditingPromptText] = useState<string>('');

  // Parse LogRocket URL to extract server and appID
  const parseLogRocketUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Determine server type from hostname
      let server: LogRocketServer = 'prod';
      if (hostname.includes('staging.logrocket.com')) {
        server = 'staging';
      } else if (hostname.includes('demo.logrocket.com')) {
        server = 'demo';
      } else if (hostname.includes('app.logrocket.com')) {
        server = 'prod';
      }

      // Extract appID from pathname
      // Format: /org/app or /org/app/anything-else
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      let appId = '';
      if (pathParts.length >= 2) {
        appId = `${pathParts[0]}/${pathParts[1]}`;
      }

      return { server, appId };
    } catch (e) {
      // Invalid URL, return defaults
      return null;
    }
  };

  const handleLogRocketUrlChange = (url: string) => {
    const parsed = parseLogRocketUrl(url);
    if (parsed) {
      setLogRocketServer(parsed.server);
      setLogRocketAppId(parsed.appId);
    }
  };

  // Load saved values from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = {
        usageMode: localStorage.getItem('usageMode') as UsageMode | null,
        mode: localStorage.getItem('mode') as Mode | null,
        useCloudEnv: localStorage.getItem('useCloudEnv'),
        enableLogRocket: localStorage.getItem('enableLogRocket'),
        logRocketServer: localStorage.getItem('logRocketServer') as LogRocketServer | null,
        logRocketAppId: localStorage.getItem('logRocketAppId'),
        screenSize: localStorage.getItem('screenSize') as ScreenSize | null,
        modelProvider: localStorage.getItem('modelProvider') as 'anthropic' | 'google' | null,
        websiteTarget: localStorage.getItem('websiteTarget'),
        instructionsPrompts: localStorage.getItem('instructionsPrompts'),
        numSessions: localStorage.getItem('numSessions'),
        requiresLogin: localStorage.getItem('requiresLogin'),
        loginUsername: localStorage.getItem('loginUsername'),
        loginPassword: localStorage.getItem('loginPassword'),
        wizardWebsite: localStorage.getItem('wizardWebsite'),
        numPromptsToGenerate: localStorage.getItem('numPromptsToGenerate'),
      };

      if (saved.usageMode) setUsageMode(saved.usageMode);
      if (saved.mode) setMode(saved.mode);
      if (saved.useCloudEnv !== null) setUseCloudEnv(saved.useCloudEnv === 'true');
      if (saved.enableLogRocket !== null) setEnableLogRocket(saved.enableLogRocket === 'true');
      if (saved.logRocketServer) setLogRocketServer(saved.logRocketServer);
      if (saved.logRocketAppId) setLogRocketAppId(saved.logRocketAppId);
      if (saved.screenSize) setScreenSize(saved.screenSize);
      if (saved.modelProvider) setModelProvider(saved.modelProvider);
      if (saved.websiteTarget) setWebsiteTarget(saved.websiteTarget);
      if (saved.instructionsPrompts) setInstructionsPrompts(saved.instructionsPrompts);
      if (saved.numSessions) setNumSessions(parseInt(saved.numSessions));
      if (saved.requiresLogin !== null) setRequiresLogin(saved.requiresLogin === 'true');
      if (saved.loginUsername) setLoginUsername(saved.loginUsername);
      if (saved.loginPassword) setLoginPassword(saved.loginPassword);
      if (saved.wizardWebsite) setWizardWebsite(saved.wizardWebsite);
      if (saved.numPromptsToGenerate) setNumPromptsToGenerate(parseInt(saved.numPromptsToGenerate));
    }
  }, []);

  // Save values to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('usageMode', usageMode);
    }
  }, [usageMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useCloudEnv', useCloudEnv.toString());
    }
  }, [useCloudEnv]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableLogRocket', enableLogRocket.toString());
    }
  }, [enableLogRocket]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logRocketServer', logRocketServer);
    }
  }, [logRocketServer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logRocketAppId', logRocketAppId);
    }
  }, [logRocketAppId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('screenSize', screenSize);
    }
  }, [screenSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('modelProvider', modelProvider);
    }
  }, [modelProvider]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('websiteTarget', websiteTarget);
    }
  }, [websiteTarget]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('instructionsPrompts', instructionsPrompts);
    }
  }, [instructionsPrompts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('numSessions', numSessions.toString());
    }
  }, [numSessions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('requiresLogin', requiresLogin.toString());
    }
  }, [requiresLogin]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loginUsername', loginUsername);
    }
  }, [loginUsername]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loginPassword', loginPassword);
    }
  }, [loginPassword]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wizardWebsite', wizardWebsite);
    }
  }, [wizardWebsite]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('numPromptsToGenerate', numPromptsToGenerate.toString());
    }
  }, [numPromptsToGenerate]);

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
        enableLogRocket,
        logRocketServer,
        logRocketAppId,
        screenSize,
        modelProvider,
        requiresLogin,
        loginUsername: requiresLogin ? loginUsername : undefined,
        loginPassword: requiresLogin ? loginPassword : undefined,
      };

      if (mode === 'single' || mode === 'multiple') {
        payload.instructionsPrompts = instructionsPrompts.split('\n').filter((p: string) => p.trim());
      }

      if (mode === 'multiple') {
        payload.numSessions = numSessions;
      }

      if (mode === 'mapped') {
        // Filter out blank prompts and split each prompt by newlines
        payload.listOfInstructionsPrompts = mappedPrompts
          .filter((prompt: string) => prompt.trim())
          .map((prompt: string) => prompt.split('\n').filter((p: string) => p.trim()));
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
      if (!response.ok) {
        // Don't update state on failed responses
        return;
      }
      const data = await response.json();

      // Only update if we have valid data
      if (typeof data.count === 'number' && Array.isArray(data.sessions)) {
        // Only accept empty arrays if we're starting fresh or explicitly clearing
        // This prevents flickering from empty responses due to serverless instance routing
        if (data.sessions.length > 0 || activeSessions.length === 0) {
          setActiveSessionCount(data.count);
          setActiveSessions(data.sessions);
        }
        // If we get an empty response but had sessions before,
        // verify by making another request to confirm they're really gone
        else if (data.sessions.length === 0 && activeSessions.length > 0) {
          // Wait a moment and check again before clearing
          setTimeout(async () => {
            const confirmResponse = await fetch('/api/sessions');
            if (confirmResponse.ok) {
              const confirmData = await confirmResponse.json();
              if (confirmData.sessions.length === 0) {
                // Confirmed empty, update state
                setActiveSessionCount(0);
                setActiveSessions([]);
              }
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Error fetching session count:', err);
      // Don't update state on error - keep showing previous sessions
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

  const handleWizardResearch = async () => {
    setIsResearching(true);
    setWizardResearch('');
    setWizardPrompts([]);
    setResearchStatus('');
    setError(null);

    let researchSessionId: string | null = null;

    try {
      const response = await fetch('/api/wizard-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website: wizardWebsite,
          requiresLogin,
          loginUsername: requiresLogin ? loginUsername : undefined,
          loginPassword: requiresLogin ? loginPassword : undefined,
        }),
      });

      // Check if the response is an error
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to research website');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let researchText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'status') {
                  setResearchStatus(parsed.content);
                } else if (parsed.type === 'research') {
                  researchText += parsed.content;
                  setWizardResearch(researchText);
                } else if (parsed.type === 'session') {
                  // Add research session to active sessions
                  researchSessionId = parsed.session.id;
                  setActiveSessions(prev => [...prev, {
                    id: parsed.session.id,
                    startTime: new Date().toISOString(),
                    debugUrl: parsed.session.debugUrl,
                    sessionUrl: parsed.session.sessionUrl,
                    browserbaseSessionId: parsed.session.browserbaseSessionId,
                    promptLabel: 'Research Session',
                    promptText: wizardWebsite,
                  }]);
                  setActiveSessionCount(prev => prev + 1);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Remove research session from active sessions
      if (researchSessionId) {
        setActiveSessions(prev => prev.filter(s => s.id !== researchSessionId));
        setActiveSessionCount(prev => prev - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research website');
      setWizardResearch('');
      // Remove research session on error
      if (researchSessionId) {
        setActiveSessions(prev => prev.filter(s => s.id !== researchSessionId));
        setActiveSessionCount(prev => prev - 1);
      }
    } finally {
      setIsResearching(false);
      setResearchStatus('');
    }
  };

  const handleGeneratePrompts = async () => {
    setIsGeneratingPrompts(true);
    setWizardPrompts([]);
    setError(null);

    try {
      const response = await fetch('/api/wizard-generate-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website: wizardWebsite,
          research: wizardResearch,
          numPrompts: numPromptsToGenerate,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'prompts') {
                  setWizardPrompts(parsed.prompts);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleEditPrompt = (index: number) => {
    setEditingPromptIndex(index);
    setEditingPromptText(wizardPrompts[index]);
  };

  const handleSavePrompt = (index: number) => {
    const newPrompts = [...wizardPrompts];
    newPrompts[index] = editingPromptText;
    setWizardPrompts(newPrompts);
    setEditingPromptIndex(null);
    setEditingPromptText('');
  };

  const handleCancelEdit = () => {
    setEditingPromptIndex(null);
    setEditingPromptText('');
  };

  const handleRunWizard = async () => {
    setIsLoading(true);
    setResults(null);
    setError(null);

    try {
      // Run mapped sessions - one session per prompt
      // Each prompt contains multiple steps separated by newlines
      const listOfInstructionsPrompts = wizardPrompts.map(prompt =>
        prompt.split('\n').filter(step => step.trim())
      );

      const payload = {
        mode: 'mapped' as Mode,
        useCloudEnv: true, // Wizard always uses Browserbase Cloud
        websiteTarget: wizardWebsite,
        listOfInstructionsPrompts,
        enableLogRocket,
        logRocketServer,
        logRocketAppId,
        screenSize,
        requiresLogin,
        loginUsername: requiresLogin ? loginUsername : undefined,
        loginPassword: requiresLogin ? loginPassword : undefined,
      };

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

  // Control video playback based on isLoading
  useEffect(() => {
    if (videoRef.current) {
      if (isLoading) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isLoading]);

  return (
    <>
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>LogRocket Demo Session Generator</h1>
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
          onClick={() => setUsageMode('wizard')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: usageMode === 'wizard' ? 'bold' : 'normal',
            backgroundColor: usageMode === 'wizard' ? '#0070f3' : 'transparent',
            color: usageMode === 'wizard' ? 'white' : '#333',
            border: usageMode === 'wizard' ? 'none' : '1px solid #ccc',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Wizard Mode
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '20px' }}>
        {/* Main Settings Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isProduction && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Browser Environment
              </label>
              <select
                value={useCloudEnv ? 'cloud' : 'local'}
                onChange={(e) => setUseCloudEnv(e.target.value === 'cloud')}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              >
                <option value="cloud">Browserbase Cloud</option>
                <option value="local">Local Browser</option>
              </select>
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
              Screen Size
            </label>
            <select
              value={screenSize}
              onChange={(e) => setScreenSize(e.target.value as ScreenSize)}
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            >
              <option value="randomize">Randomize (Different per session)</option>
              <option value="desktop-large">Desktop Large (1920×1080)</option>
              <option value="desktop-medium">Desktop Medium (1280×800)</option>
              <option value="iphone-regular">iPhone Regular (390×844)</option>
              <option value="iphone-plus">iPhone Plus (430×932)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              AI Model Provider
            </label>
            <select
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value as 'anthropic' | 'google')}
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            >
              <option value="anthropic">Anthropic (Claude Sonnet 4)</option>
              <option value="google">Google (Gemini 2.5 Computer Use)</option>
            </select>
          </div>

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

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={requiresLogin}
                onChange={(e) => setRequiresLogin(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold' }}>Website requires a login</span>
            </label>
          </div>

          {requiresLogin && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                />
              </div>
            </>
          )}

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

          {mode === 'mapped' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Session Prompts (one prompt per session)
              </label>
              {mappedPrompts.map((prompt, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                    Session {index + 1}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      const newPrompts = [...mappedPrompts];
                      newPrompts[index] = e.target.value;
                      setMappedPrompts(newPrompts);
                    }}
                    placeholder={`Enter instructions for session ${index + 1} (leave blank to skip)`}
                    style={{ width: '100%', padding: '8px', fontSize: '14px', minHeight: '80px' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Instructions/Prompts (one per line)
              </label>
              <textarea
                value={instructionsPrompts}
                onChange={(e) => setInstructionsPrompts(e.target.value)}
                placeholder="Prompt 1\nPrompt 2\nPrompt 3"
                style={{ width: '100%', padding: '8px', fontSize: '14px', minHeight: '150px' }}
                required
              />
            </div>
          )}

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
            {isLoading ? 'Running...' : isKilling ? 'Killing Sessions...' : 'Run'}
          </button>

          {/* Active Sessions Section */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
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

        {/* LogRocket Settings Sidebar */}
        <div style={{
          width: '300px',
          marginLeft: '20px',
          padding: '20px',
          backgroundColor: '#f3e5f5',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#6a1b9a' }}>
            LogRocket Settings
          </h3>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableLogRocket}
                onChange={(e) => setEnableLogRocket(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold' }}>Record in LogRocket</span>
            </label>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
              LogRocket App URL
            </label>
            <input
              type="text"
              onChange={(e) => handleLogRocketUrlChange(e.target.value)}
              disabled={!enableLogRocket}
              placeholder="e.g., https://app.logrocket.com/epos-now/hq"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                color: enableLogRocket ? 'inherit' : '#999',
                cursor: enableLogRocket ? 'text' : 'not-allowed',
                boxSizing: 'border-box',
                marginBottom: '10px'
              }}
            />
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
              Paste your LogRocket app URL to auto-fill settings below
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
              Server
            </label>
            <select
              value={logRocketServer}
              onChange={(e) => setLogRocketServer(e.target.value as LogRocketServer)}
              disabled={!enableLogRocket}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                color: enableLogRocket ? 'inherit' : '#999',
                cursor: enableLogRocket ? 'pointer' : 'not-allowed'
              }}
            >
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
              <option value="demo">Demo</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
              App ID
            </label>
            <input
              type="text"
              value={logRocketAppId}
              onChange={(e) => setLogRocketAppId(e.target.value)}
              disabled={!enableLogRocket}
              placeholder="e.g., public-shares/credit-karma"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                color: enableLogRocket ? 'inherit' : '#999',
                cursor: enableLogRocket ? 'text' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
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

      {/* Wizard Mode UI */}
      {usageMode === 'wizard' && (
        <div style={{
          padding: '40px',
          backgroundColor: '#f5f5f5',
          borderRadius: '10px',
          marginTop: '20px'
        }}>
          <h2 style={{ marginBottom: '10px', color: '#333' }}>Wizard Mode</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
            AI will research your website and generate realistic user behavior prompts
          </p>

          {/* Error Display */}
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#fee',
              border: '2px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Step 1: Website Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>
              Website URL
            </label>
            <input
              type="text"
              value={wizardWebsite}
              onChange={(e) => setWizardWebsite(e.target.value)}
              placeholder="e.g., https://creditkarma.com"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ccc',
                borderRadius: '5px',
                marginBottom: '15px',
              }}
            />

            {/* Login Options */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={requiresLogin}
                  onChange={(e) => setRequiresLogin(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 'bold' }}>Website requires a login</span>
              </label>
            </div>

            {requiresLogin && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter username"
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleWizardResearch}
              disabled={isResearching || !wizardWebsite}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: isResearching ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isResearching ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {isResearching ? 'Researching...' : 'Research Website'}
            </button>
          </div>

          {/* Status Display */}
          {isResearching && researchStatus && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffc107',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#856404',
                fontWeight: 'bold'
              }}>
                {researchStatus}
              </div>
            </div>
          )}

          {/* Research Output */}
          {wizardResearch && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #ddd',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#0070f3' }}>Research Summary</h3>
              <div style={{
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#333'
              }}>
                {wizardResearch}
              </div>
            </div>
          )}

          {/* Step 2: Generate Prompts (shown after research completes) */}
          {wizardResearch && !isResearching && wizardPrompts.length === 0 && (
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '2px solid #0070f3',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0070f3' }}>Generate User Behavior Prompts</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  Number of prompts:
                </label>
                <select
                  value={numPromptsToGenerate}
                  onChange={(e) => setNumPromptsToGenerate(parseInt(e.target.value))}
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    minWidth: '100px'
                  }}
                >
                  <option value={3}>3 prompts</option>
                  <option value={5}>5 prompts</option>
                  <option value={10}>10 prompts</option>
                  <option value={15}>15 prompts</option>
                  <option value={20}>20 prompts</option>
                </select>
                <button
                  onClick={handleGeneratePrompts}
                  disabled={isGeneratingPrompts}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: isGeneratingPrompts ? '#ccc' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: isGeneratingPrompts ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isGeneratingPrompts ? 'Generating...' : 'Generate Prompts'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generated Prompts & Settings */}
          {wizardPrompts.length > 0 && (
            <>
              {/* Generated Prompts */}
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #ddd',
                textAlign: 'left'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#0070f3' }}>Generated Prompts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {wizardPrompts.map((prompt, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px',
                        backgroundColor: '#f9f9f9',
                        border: '1px solid #e0e0e0',
                        borderRadius: '5px',
                        fontSize: '13px',
                        lineHeight: '1.5'
                      }}
                    >
                      {editingPromptIndex === index ? (
                        // Edit mode
                        <div>
                          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Prompt {index + 1}:</div>
                          <textarea
                            value={editingPromptText}
                            onChange={(e) => setEditingPromptText(e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              padding: '8px',
                              fontSize: '13px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              fontFamily: 'inherit',
                              marginBottom: '8px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleSavePrompt(index)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <strong>Prompt {index + 1}:</strong> {prompt}
                          </div>
                          <button
                            onClick={() => handleEditPrompt(index)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                            title="Edit prompt"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings & Run */}
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* Left Column - Screen Size */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Screen Size
                    </label>
                    <select
                      value={screenSize}
                      onChange={(e) => setScreenSize(e.target.value as ScreenSize)}
                      style={{ width: '100%', padding: '8px', fontSize: '14px', marginBottom: '15px' }}
                    >
                      <option value="randomize">Randomize (Different per session)</option>
                      <option value="desktop-large">Desktop Large (1920×1080)</option>
                      <option value="desktop-medium">Desktop Medium (1280×800)</option>
                      <option value="iphone-regular">iPhone Regular (390×844)</option>
                      <option value="iphone-plus">iPhone Plus (430×932)</option>
                    </select>

                    <button
                      onClick={handleRunWizard}
                      disabled={isLoading}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        backgroundColor: isLoading ? '#ccc' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        width: '100%'
                      }}
                    >
                      {isLoading ? 'Running Sessions...' : 'Run Sessions'}
                    </button>
                  </div>
                </div>

                {/* Right Column - LogRocket Settings */}
                <div style={{ width: '300px' }}>
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#f3e8ff',
                    borderRadius: '8px',
                    border: '1px solid #c084fc'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#7c3aed' }}>LogRocket Settings</h4>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={enableLogRocket}
                          onChange={(e) => setEnableLogRocket(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>Record in LogRocket</span>
                      </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
                        LogRocket App URL
                      </label>
                      <input
                        type="text"
                        onChange={(e) => handleLogRocketUrlChange(e.target.value)}
                        disabled={!enableLogRocket}
                        placeholder="e.g., https://app.logrocket.com/epos-now/hq"
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                          color: enableLogRocket ? 'inherit' : '#999',
                          cursor: enableLogRocket ? 'text' : 'not-allowed',
                          boxSizing: 'border-box',
                          marginBottom: '5px'
                        }}
                      />
                      <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                        Paste your LogRocket app URL to auto-fill settings below
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
                        Server
                      </label>
                      <select
                        value={logRocketServer}
                        onChange={(e) => setLogRocketServer(e.target.value as LogRocketServer)}
                        disabled={!enableLogRocket}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                          color: enableLogRocket ? 'inherit' : '#999',
                          cursor: enableLogRocket ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <option value="prod">Production</option>
                        <option value="staging">Staging</option>
                        <option value="demo">Demo</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: enableLogRocket ? 'inherit' : '#999' }}>
                        App ID
                      </label>
                      <input
                        type="text"
                        value={logRocketAppId}
                        onChange={(e) => setLogRocketAppId(e.target.value)}
                        disabled={!enableLogRocket}
                        placeholder="e.g., public-shares/credit-karma"
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          backgroundColor: enableLogRocket ? 'white' : '#f0f0f0',
                          color: enableLogRocket ? 'inherit' : '#999',
                          cursor: enableLogRocket ? 'text' : 'not-allowed',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {activeSessions.length > 0 && activeSessions.some(s => s.debugUrl) && (
      <div style={{ marginTop: '30px', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Live Sessions</h2>
          <button
            onClick={handleKillAll}
            disabled={isKilling}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: isKilling ? '#ccc' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isKilling ? 'not-allowed' : 'pointer',
            }}
          >
            {isKilling ? 'Killing...' : 'Kill All Sessions'}
          </button>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
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
              {session.promptLabel && (
                <div
                  style={{
                    marginBottom: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    cursor: 'help'
                  }}
                  title={session.promptText || session.promptLabel}
                >
                  {session.promptLabel}
                </div>
              )}
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

    {/* Galileo Dancing Video - Upper Left Corner */}
    <video
      ref={videoRef}
      src="/galileo_dancing.mp4"
      loop
      muted
      playsInline
      style={{
        position: 'fixed',
        top: '20px',
        left: '-20px',
        maxWidth: '14%',
        height: 'auto',
        zIndex: 1000
      }}
    />
    </>
  );
}
