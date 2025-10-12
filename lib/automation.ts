import { Stagehand } from "@browserbasehq/stagehand";
import { faker } from '@faker-js/faker';
import { sessionManager } from './sessionManager';
import { randomUUID } from 'crypto';
import { generateLogRocketScript } from './logRocketScript';

type LogRocketServer = 'demo' | 'staging' | 'prod';
type ScreenSize = 'desktop-large' | 'desktop-medium' | 'iphone-regular' | 'iphone-plus';

interface RunBrowsingSessionParams {
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts: string[];
    enableLogRocket?: boolean;
    logRocketServer?: LogRocketServer;
    logRocketAppId?: string;
    screenSize?: ScreenSize;
    timeoutSeconds?: number;
}

function getScreenDimensions(screenSize: ScreenSize): { width: number; height: number } {
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

function isMobileScreenSize(screenSize: ScreenSize): boolean {
    return screenSize === 'iphone-regular' || screenSize === 'iphone-plus';
}

function getMobileUserAgent(screenSize: ScreenSize): string {
    // iPhone 14 Pro user agent
    if (screenSize === 'iphone-regular') {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    }
    // iPhone 14 Plus user agent
    if (screenSize === 'iphone-plus') {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    }
    return '';
}

export async function runBrowsingSession({
    useCloudEnv = false,
    websiteTarget,
    instructionsPrompts,
    enableLogRocket = true,
    logRocketServer = 'prod',
    logRocketAppId = 'public-shares/credit-karma',
    screenSize = 'desktop-medium',
    timeoutSeconds = 600,
}: RunBrowsingSessionParams): Promise<any[]> {
    const sessionId = randomUUID();
    let stagehand;

    const dimensions = getScreenDimensions(screenSize);
    const isMobile = isMobileScreenSize(screenSize);
    const userAgent = isMobile ? getMobileUserAgent(screenSize) : undefined;

    if (useCloudEnv) {
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
                browserSettings: {
                    blockAds: false,
                    viewport: {
                        width: dimensions.width,
                        height: dimensions.height,
                    },
                    solveCaptchas: true,
                } as any,
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

    sessionManager.addSession(sessionId, stagehand, browserbaseSessionId, debugUrl, sessionUrl);

    const page = stagehand.page;

    // Set mobile user agent using CDP if needed
    if (isMobile && userAgent) {
        const context = page.context();
        await context.addInitScript(`
            Object.defineProperty(navigator, 'userAgent', {
                get: () => '${userAgent}'
            });
            Object.defineProperty(navigator, 'platform', {
                get: () => 'iPhone'
            });
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 5
            });
        `);
    }

    await page.goto(websiteTarget,  { waitUntil: "domcontentloaded" });

    // Generate LogRocket script if enabled
    let logRocketScript: string | null = null;
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

    // Re-inject LogRocket script on page load if enabled
    if (enableLogRocket && logRocketScript) {
        page.on('load', async () => {
            await page.evaluate(logRocketScript!);
        });
    }

    const agent = stagehand.agent({
        provider: "google",
        model: "gemini-2.5-computer-use-preview-10-2025",

        instructions: `You are an average human website user. You will be given instructions of some tasks to complete on a website.
        You should try to complete these tasks in a reasonable amount of time, but you do not need to rush. Your mouse movements, scrolling,
        and typing on the website should seem realistic for a HUMAN and not a bot. 

        DO NOT ASK FOLLOW UP QUESTIONS ABOUT THE GOAL. JUST TRY TO COMPLETE IT IN YOUR OWN WAY.

        If there are any cookie banners or pop ups, always click "accept", or "I Understand" or whatever is needed to approve the banner
        and continue with your given tasks.`,

        // verbose: true,

        options: {
            apiKey: process.env.GOOGLE_API_KEY,
        },
    });

    try {
        const results = [];
        for (const prompt of instructionsPrompts) {
            const result = await agent.execute(prompt);
            results.push(result);
            console.log(result);
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
}

export async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompts, enableLogRocket, logRocketServer, logRocketAppId, screenSize}: RunMultipleSessionsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < numSessions; i++) {
        const timeoutSeconds = Math.floor(Math.random() * (600 - 120 + 1)) + 120;
        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts,
            enableLogRocket,
            logRocketServer,
            logRocketAppId,
            screenSize,
            timeoutSeconds,
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
}

export async function mapSessionsToPrompts({useCloudEnv, websiteTarget, listOfInstructionsPrompts, enableLogRocket, logRocketServer, logRocketAppId, screenSize}: MapSessionsToPromptsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
        console.log(`Starting session ${i}`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts: listOfInstructionsPrompts[i],
            enableLogRocket,
            logRocketServer,
            logRocketAppId,
            screenSize,
        }))
    }
    return await Promise.all(promises);
}
