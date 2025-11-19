import { NextRequest } from 'next/server';
import { Stagehand } from "@browserbasehq/stagehand";
import { faker } from '@faker-js/faker';
import { generateLogRocketScript } from '@/lib/logRocketScript';
import { BROWSER_AGENT_INSTRUCTIONS, getLoginInstruction } from '@/lib/prompts';
import { sessionManager } from '@/lib/sessionManager';
import { randomUUID } from 'crypto';
import Browserbase from '@browserbasehq/sdk';

type LogRocketServer = 'demo' | 'staging' | 'prod';

interface SequentialWizardParams {
    websiteTarget: string;
    listOfInstructionsPrompts: string[][];
    useCloudEnv?: boolean;
    enableLogRocket?: boolean;
    logRocketServer?: LogRocketServer;
    logRocketAppId?: string;
    logRocketSanitizeAll?: boolean;
    requiresLogin?: boolean;
    loginUsername?: string;
    loginPassword?: string;
}

export async function POST(request: NextRequest) {
    try {
        const {
            websiteTarget,
            listOfInstructionsPrompts,
            useCloudEnv = true,
            enableLogRocket = true,
            logRocketServer = 'prod',
            logRocketAppId = '',
            logRocketSanitizeAll = false,
            requiresLogin = false,
            loginUsername,
            loginPassword,
        }: SequentialWizardParams = await request.json();

        if (!websiteTarget || !listOfInstructionsPrompts || listOfInstructionsPrompts.length === 0) {
            return new Response('Website target and prompts are required', { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let stagehand: Stagehand | null = null;
                let loggedInUrl = websiteTarget;
                const sessionId = randomUUID();

                try {
                    const sendStatus = (status: string) => {
                        const data = JSON.stringify({ type: 'status', content: status });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    };

                    sendStatus('Initializing browser session...');

                    if (useCloudEnv) {
                        // Initialize Stagehand with Browserbase for cloud
                        const browserSettings: any = {
                            blockAds: false,
                            viewport: {
                                width: 1280,
                                height: 800,
                            },
                            solveCaptchas: true,
                        };

                        stagehand = new Stagehand({
                            apiKey: process.env.BROWSERBASE_API_KEY,
                            projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
                            env: "BROWSERBASE",
                            disablePino: true,
                            modelClientOptions: { apiKey: process.env.GOOGLE_API_KEY },
                            logInferenceToFile: false,
                            verbose: 0,
                            browserbaseSessionCreateParams: {
                                projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
                                browserSettings,
                                timeout: 3600, // 1 hour max
                                keepAlive: true, // Keep session alive across all prompts
                            }
                        });
                    } else {
                        // Initialize Stagehand with local browser
                        stagehand = new Stagehand({
                            env: 'LOCAL',
                            disablePino: true,
                            modelClientOptions: { apiKey: process.env.GOOGLE_API_KEY },
                            localBrowserLaunchOptions: {
                                headless: false,
                                viewport: {
                                    width: 1280,
                                    height: 800,
                                },
                            }
                        });
                    }

                    const initResult = await stagehand.init();
                    const page = stagehand.page;

                    // Add session to session manager for live viewing (only for cloud sessions)
                    if (useCloudEnv) {
                        const browserbaseSessionId = initResult.sessionId;
                        const debugUrl = initResult.debugUrl;
                        const sessionUrl = initResult.sessionUrl;

                        sessionManager.addSession(
                            sessionId,
                            stagehand,
                            browserbaseSessionId,
                            debugUrl,
                            sessionUrl,
                            'Sequential Wizard',
                            websiteTarget
                        );

                        // Send session info for live viewing
                        if (debugUrl) {
                            const sessionData = JSON.stringify({
                                type: 'session',
                                session: {
                                    browserbaseSessionId,
                                    debugUrl,
                                    sessionUrl,
                                }
                            });
                            controller.enqueue(encoder.encode(`data: ${sessionData}\n\n`));
                        }
                    }

                    sendStatus('Navigating to website...');
                    await page.goto(websiteTarget, { waitUntil: "domcontentloaded" });

                    // Perform login if required
                    if (requiresLogin && loginUsername && loginPassword) {
                        sendStatus('Logging in...');

                        const loginAgent = stagehand.agent({
                            provider: 'anthropic',
                            model: "claude-sonnet-4-20250514",
                            instructions: BROWSER_AGENT_INSTRUCTIONS,
                            options: {
                                apiKey: process.env.ANTHROPIC_API_KEY,
                            },
                        });

                        const loginInstruction = getLoginInstruction(loginUsername, loginPassword);
                        await loginAgent.execute(loginInstruction);

                        sendStatus('Login complete, waiting for page to load...');
                        await page.waitForTimeout(5000);

                        // Capture the logged-in URL (may have changed after login)
                        loggedInUrl = page.url();
                        console.log('[Wizard Sequential] Logged-in URL:', loggedInUrl);
                    }

                    // Prepare LogRocket script if enabled
                    let logRocketScript: string | null = null;
                    if (enableLogRocket) {
                        logRocketScript = generateLogRocketScript(logRocketServer, logRocketAppId, logRocketSanitizeAll);
                    }

                    // Create the browser agent for executing prompts
                    const agent = stagehand.agent({
                        provider: 'anthropic',
                        model: "claude-sonnet-4-20250514",
                        instructions: BROWSER_AGENT_INSTRUCTIONS,
                        options: {
                            apiKey: process.env.ANTHROPIC_API_KEY,
                        },
                    });

                    // Execute each prompt sequentially
                    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
                        const promptSteps = listOfInstructionsPrompts[i];
                        console.log(`[Wizard Sequential] Starting prompt ${i + 1} of ${listOfInstructionsPrompts.length}`);
                        console.log(`[Wizard Sequential] Session ${sessionId} should still be in sessionManager`);
                        sendStatus(`Executing prompt ${i + 1} of ${listOfInstructionsPrompts.length}...`);

                        // Navigate back to the starting URL
                        sendStatus(`Navigating to starting URL for prompt ${i + 1}...`);
                        await page.goto(loggedInUrl, { waitUntil: "domcontentloaded" });
                        await page.waitForTimeout(2000);

                        // Handle LogRocket for this prompt
                        if (enableLogRocket && logRocketScript) {
                            if (i === 0) {
                                // First prompt: Initialize LogRocket
                                sendStatus(`Initializing LogRocket for prompt ${i + 1}...`);
                                await page.evaluate(logRocketScript);
                            } else {
                                // Subsequent prompts: Re-inject LogRocket and start new session
                                sendStatus(`Starting new LogRocket session for prompt ${i + 1}...`);

                                // Re-inject LogRocket script (page navigation cleared it)
                                await page.evaluate(logRocketScript);

                                // Wait for LogRocket to be ready, then start new session
                                await page.waitForTimeout(1000);

                                const sessionStarted = await page.evaluate(`
                                    (async () => {
                                        if (window.LogRocket && window.LogRocket.startNewSession) {
                                            try {
                                                await window.LogRocket.startNewSession();
                                                console.log('[LogRocket] New session started');
                                                return true;
                                            } catch (e) {
                                                console.error('[LogRocket] Error starting new session:', e);
                                                return false;
                                            }
                                        } else {
                                            console.error('[LogRocket] startNewSession not available');
                                            return false;
                                        }
                                    })()
                                `);

                                console.log(`[Wizard Sequential] LogRocket new session started: ${sessionStarted}`);
                            }

                            // Identify with a new fake user (80% probability)
                            if (Math.random() < 0.8) {
                                const fakeName = faker.person.fullName();
                                const fakeID = faker.string.uuid();
                                const randomNumber = Math.floor(Math.random() * 101);
                                const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'me.com'];
                                const randomDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
                                const fakeEmail = fakeName.toLowerCase().replace(/\s+/g, '.') + randomNumber + '@' + randomDomain;

                                await page.evaluate(`
                                    if (window.LogRocket && window.LogRocket.identify) {
                                        window.LogRocket.identify('${fakeID}', {
                                            name: '${fakeName}',
                                            email: '${fakeEmail}',
                                        });
                                    }
                                `);
                            }

                            // Get and send the LogRocket session URL
                            try {
                                const sessionUrl = await page.evaluate(`
                                    new Promise((resolve) => {
                                        if (window.LogRocket && window.LogRocket.getSessionURL) {
                                            window.LogRocket.getSessionURL(resolve);
                                        } else {
                                            resolve(null);
                                        }
                                    })
                                `);

                                if (sessionUrl) {
                                    const logRocketData = JSON.stringify({
                                        type: 'logrocket_session',
                                        promptIndex: i,
                                        sessionUrl: sessionUrl,
                                    });
                                    controller.enqueue(encoder.encode(`data: ${logRocketData}\n\n`));
                                }
                            } catch (e) {
                                console.error('Error getting LogRocket session URL:', e);
                            }
                        }

                        // Execute each step of the prompt
                        for (let j = 0; j < promptSteps.length; j++) {
                            const step = promptSteps[j];
                            sendStatus(`Prompt ${i + 1}, Step ${j + 1}/${promptSteps.length}: ${step.substring(0, 50)}...`);

                            try {
                                await agent.execute(step);
                            } catch (error) {
                                console.error(`Error executing step ${j + 1} of prompt ${i + 1}:`, error);
                                sendStatus(`Warning: Step ${j + 1} failed, continuing...`);
                            }
                        }

                        sendStatus(`Completed prompt ${i + 1} of ${listOfInstructionsPrompts.length}`);

                        // Brief pause between prompts
                        await page.waitForTimeout(2000);
                    }

                    sendStatus('All prompts completed successfully!');

                    // Send completion
                    const completionData = JSON.stringify({
                        type: 'complete',
                        totalPrompts: listOfInstructionsPrompts.length,
                    });
                    controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));

                } catch (error) {
                    console.error('Sequential wizard error:', error);
                    const errorData = JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                } finally {
                    // Remove session from session manager (only if it was added for cloud)
                    if (useCloudEnv) {
                        sessionManager.removeSession(sessionId);
                    }

                    // Clean up the session
                    if (stagehand) {
                        try {
                            if (stagehand.context) {
                                const browser = stagehand.context.browser();
                                if (browser) {
                                    await browser.close();
                                } else {
                                    await stagehand.context.close();
                                }
                            }
                        } catch (e) {
                            console.error('Error closing browser:', e);
                        }
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Wizard sequential execution error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
