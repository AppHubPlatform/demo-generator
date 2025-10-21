import { Stagehand } from "@browserbasehq/stagehand";
import { faker } from '@faker-js/faker';
import { sessionManager } from './sessionManager';
import { randomUUID } from 'crypto';
import { generateLogRocketScript } from './logRocketScript';
import { devices } from 'playwright';
import { BROWSER_AGENT_INSTRUCTIONS, getLoginInstruction } from './prompts';

type LogRocketServer = 'demo' | 'staging' | 'prod';
type ScreenSize = 'randomize' | 'desktop-large' | 'desktop-medium' | 'iphone-regular' | 'iphone-plus';
type ConcreteScreenSize = 'desktop-large' | 'desktop-medium' | 'iphone-regular' | 'iphone-plus';

interface RunBrowsingSessionParams {
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts: string[];
    enableLogRocket?: boolean;
    logRocketServer?: LogRocketServer;
    logRocketAppId?: string;
    screenSize?: ConcreteScreenSize;
    modelProvider?: 'anthropic' | 'google';
    timeoutSeconds?: number;
    promptLabel?: string;
    promptText?: string;
    requiresLogin?: boolean;
    loginUsername?: string;
    loginPassword?: string;
    contextId?: string;
    loggedInUrl?: string;
}

function getRandomScreenSize(): ConcreteScreenSize {
    const sizes: ConcreteScreenSize[] = ['desktop-large', 'desktop-medium', 'iphone-regular', 'iphone-plus'];
    return sizes[Math.floor(Math.random() * sizes.length)];
}

function getScreenDimensions(screenSize: ConcreteScreenSize): { width: number; height: number } {
    switch (screenSize) {
        case 'desktop-large':
            return { width: 1920, height: 1080 };
        case 'desktop-medium':
            return { width: 1280, height: 800 };
        case 'iphone-regular':
            return { width: 390, height: 844 };
        case 'iphone-plus':
            return { width: 430, height: 932 };
        default:
            return { width: 1280, height: 800 };
    }
}

function isMobileScreenSize(screenSize: ConcreteScreenSize): boolean {
    return screenSize === 'iphone-regular' || screenSize === 'iphone-plus';
}

function getPlaywrightDevice(screenSize: ConcreteScreenSize) {
    if (screenSize === 'iphone-regular') {
        // iPhone 12 Pro has dimensions 390x844
        return devices['iPhone 12 Pro'];
    }
    if (screenSize === 'iphone-plus') {
        // iPhone 14 Plus has dimensions 430x932
        return devices['iPhone 14 Plus'];
    }
    return null;
}

export async function runBrowsingSession({
    useCloudEnv = false,
    websiteTarget,
    instructionsPrompts,
    enableLogRocket = true,
    logRocketServer = 'prod',
    logRocketAppId = 'public-shares/credit-karma',
    screenSize = 'desktop-medium',
    modelProvider = 'anthropic',
    timeoutSeconds = 600,
    promptLabel,
    promptText,
    requiresLogin = false,
    loginUsername,
    loginPassword,
    contextId,
    loggedInUrl,
}: RunBrowsingSessionParams): Promise<any[]> {
    const sessionId = randomUUID();
    let stagehand;

    const dimensions = getScreenDimensions(screenSize);
    const isMobile = isMobileScreenSize(screenSize);
    const deviceSettings = isMobile ? getPlaywrightDevice(screenSize) : null;

    if (useCloudEnv) {
        const browserSettings: any = {
            blockAds: false,
            viewport: {
                width: dimensions.width,
                height: dimensions.height,
            },
            solveCaptchas: true,
        };

        // Add context if provided (for reusing login state)
        if (contextId) {
            console.log(`[Context Debug] Using context ID: ${contextId} with persist: false`);
            browserSettings.context = {
                id: contextId,
                persist: false, // Read-only, don't modify the context
            };
        } else {
            console.log('[Context Debug] No context ID provided, starting fresh session');
        }

        // Set OS to mobile for mobile devices (requires Advanced Stealth plan)
        // if (isMobile) {
        //     browserSettings.os = 'mobile';
        // }

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
                browserSettings: browserSettings,
            timeout: timeoutSeconds,
            keepAlive: true,
            }
        });
    } else {
       stagehand = new Stagehand({
            env: 'LOCAL',
            disablePino: true,
            modelClientOptions: { apiKey: process.env.GOOGLE_API_KEY },
            localBrowserLaunchOptions: {
                headless: false,
                viewport: {
                    width: dimensions.width,
                    height: dimensions.height,
                },
            }
        });
    }

    const initResult = await stagehand.init();

    // Extract the Browserbase session info if using cloud environment
    const browserbaseSessionId = useCloudEnv ? initResult.sessionId : undefined;
    const debugUrl = useCloudEnv ? initResult.debugUrl : undefined;
    const sessionUrl = useCloudEnv ? initResult.sessionUrl : undefined;

    sessionManager.addSession(sessionId, stagehand, browserbaseSessionId, debugUrl, sessionUrl, promptLabel, promptText);

    const page = stagehand.page;

    // Apply mobile device settings if needed
    if (isMobile && deviceSettings) {
        // Set user agent and mobile properties
        const context = page.context();

        // Apply device settings by creating a new page with device emulation
        // This doesn't work well with Stagehand, so we'll use a simpler approach
        await page.emulateMedia({ colorScheme: 'light' });

        // Set extra HTTP headers to include mobile user agent
        if (deviceSettings.userAgent) {
            await page.setExtraHTTPHeaders({
                'User-Agent': deviceSettings.userAgent
            });
        }
    }

    // Use loggedInUrl if provided (when reusing context), otherwise use websiteTarget
    const targetUrl = loggedInUrl || websiteTarget;
    await page.goto(targetUrl,  { waitUntil: "domcontentloaded" });

    const agent = stagehand.agent({
        provider: modelProvider,
        model: modelProvider === 'google'
            ? "gemini-2.5-computer-use-preview-10-2025"
            : "claude-sonnet-4-20250514",

        instructions: BROWSER_AGENT_INSTRUCTIONS,

        // verbose: true,

        options: {
            apiKey: process.env.GOOGLE_API_KEY,
        },
    });

    try {
        const results = [];
        let logRocketScript: string | null = null;

        // If login is required AND no context (need to log in manually)
        // Skip login if we have a contextId (already logged in via context)
        if (requiresLogin && loginUsername && loginPassword && !contextId) {
            const loginInstruction = getLoginInstruction(loginUsername, loginPassword);
            const loginResult = await agent.execute(loginInstruction);
            results.push(loginResult);
            console.log('Login completed:', loginResult);
        } else if (contextId) {
            console.log('Reusing login context:', contextId);
        }

        // NOW inject LogRocket after login (if applicable)
        if (enableLogRocket) {
            logRocketScript = generateLogRocketScript(logRocketServer, logRocketAppId);
            await page.evaluate(logRocketScript);
        }

        if (enableLogRocket && Math.random() < 0.5) {
            const fakeName = faker.person.fullName();
            const fakeID = faker.string.uuid();

            const randomNumber = Math.floor(Math.random() * 101);
            const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'me.com'];
            const randomDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
            const fakeEmail = fakeName.toLowerCase().replace(/\s+/g, '.') + randomNumber + '@' + randomDomain;

            await page.evaluate(`(() => {
                window.LogRocket && window.LogRocket.identify('${fakeID}', {
                    name: '${fakeName}',
                    email: '${fakeEmail}',
                });
            })()`);
        }

        // Execute remaining prompts
        for (const prompt of instructionsPrompts) {
            const result = await agent.execute(prompt);
            results.push(result);
            console.log(result);
        }

        // Set up page.on('load') listener ONLY AFTER prompts execute
        // This ensures LogRocket isn't re-injected during login-related page navigations
        if (enableLogRocket && logRocketScript) {
            page.on('load', async () => {
                await page.evaluate(logRocketScript!);
            });
        }

        return results;
    } catch (error) {
        // Filter out expected errors when session is killed
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isExpectedError = errorMessage.includes('Target page, context or browser has been closed') ||
                               errorMessage.includes('proxy.newCDPSession');

        if (!isExpectedError) {
            console.error('Automation error:', error);
        }
        throw error;
    } finally {
        sessionManager.removeSession(sessionId);
    }
}

interface RunMultipleSessionsParams {
    numSessions: number;
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts: string[];
    enableLogRocket?: boolean;
    logRocketServer?: LogRocketServer;
    logRocketAppId?: string;
    screenSize?: ScreenSize;
    modelProvider?: 'anthropic' | 'google';
    requiresLogin?: boolean;
    loginUsername?: string;
    loginPassword?: string;
    contextId?: string;
    loggedInUrl?: string;
}

export async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompts, enableLogRocket, logRocketServer, logRocketAppId, screenSize, modelProvider, requiresLogin, loginUsername, loginPassword, contextId, loggedInUrl}: RunMultipleSessionsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < numSessions; i++) {
        const timeoutSeconds = Math.floor(Math.random() * (600 - 120 + 1)) + 120;

        // If randomize, pick a random screen size for this session
        const concreteScreenSize: ConcreteScreenSize = screenSize === 'randomize'
            ? getRandomScreenSize()
            : (screenSize || 'desktop-medium');

        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s and screen size ${concreteScreenSize}`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts,
            enableLogRocket,
            logRocketServer,
            logRocketAppId,
            screenSize: concreteScreenSize,
            modelProvider,
            timeoutSeconds,
            requiresLogin,
            loginUsername,
            loginPassword,
            contextId,
            loggedInUrl,
        }))
    }
    return await Promise.all(promises);
}

interface MapSessionsToPromptsParams {
    useCloudEnv?: boolean;
    websiteTarget: string;
    listOfInstructionsPrompts: string[][];
    enableLogRocket?: boolean;
    logRocketServer?: LogRocketServer;
    logRocketAppId?: string;
    screenSize?: ScreenSize;
    modelProvider?: 'anthropic' | 'google';
    requiresLogin?: boolean;
    loginUsername?: string;
    loginPassword?: string;
    contextId?: string;
    loggedInUrl?: string;
}

export async function mapSessionsToPrompts({useCloudEnv, websiteTarget, listOfInstructionsPrompts, enableLogRocket, logRocketServer, logRocketAppId, screenSize, modelProvider, requiresLogin, loginUsername, loginPassword, contextId, loggedInUrl}: MapSessionsToPromptsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
        // If randomize, pick a random screen size for this session
        const concreteScreenSize: ConcreteScreenSize = screenSize === 'randomize'
            ? getRandomScreenSize()
            : (screenSize || 'desktop-medium');

        console.log(`Starting session ${i} with screen size ${concreteScreenSize}`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts: listOfInstructionsPrompts[i],
            enableLogRocket,
            logRocketServer,
            logRocketAppId,
            screenSize: concreteScreenSize,
            modelProvider,
            promptLabel: `Prompt ${i + 1}`,
            requiresLogin,
            loginUsername,
            loginPassword,
            contextId,
            loggedInUrl,
        }))
    }
    return await Promise.all(promises);
}
