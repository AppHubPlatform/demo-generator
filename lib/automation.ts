import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { sessionManager } from './sessionManager';
import { randomUUID } from 'crypto';

const logRocketScript = fs.readFileSync('./logrocket_loader.js', 'utf8');

interface RunBrowsingSessionParams {
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts: string[];
    timeoutSeconds?: number;
}

export async function runBrowsingSession({
    useCloudEnv = false,
    websiteTarget,
    instructionsPrompts,
    timeoutSeconds = 600,
}: RunBrowsingSessionParams): Promise<any[]> {
    const sessionId = randomUUID();
    let stagehand;

    if (useCloudEnv) {
         stagehand = new Stagehand({
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
            env: "BROWSERBASE",
            logInferenceToFile: true,
            verbose: 2,

            browserbaseSessionCreateParams: {
                projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
                browserSettings: {
                    blockAds: false,
                    viewport: {
                        width: 1280,
                        height: 800,
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

    // Extract the Browserbase session ID if using cloud environment
    const browserbaseSessionId = useCloudEnv ? initResult.sessionId : undefined;

    sessionManager.addSession(sessionId, stagehand, browserbaseSessionId);

    const page = stagehand.page;

    await page.goto(websiteTarget,  { waitUntil: "domcontentloaded" });

    await page.evaluate(logRocketScript);

    if (Math.random() < 0.5) {
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

    page.on('load', async () => {
        await page.evaluate(logRocketScript);
    });

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
    } finally {
        sessionManager.removeSession(sessionId);
    }
}

interface RunMultipleSessionsParams {
    numSessions: number;
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts: string[];
}

export async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompts}: RunMultipleSessionsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < numSessions; i++) {
        const timeoutSeconds = Math.floor(Math.random() * (600 - 120 + 1)) + 120;
        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts,
            timeoutSeconds,
        }))
    }
    return await Promise.all(promises);
}

interface MapSessionsToPromptsParams {
    useCloudEnv?: boolean;
    websiteTarget: string;
    listOfInstructionsPrompts: string[][];
}

export async function mapSessionsToPrompts({useCloudEnv, websiteTarget, listOfInstructionsPrompts}: MapSessionsToPromptsParams): Promise<any[]> {
    const promises: Promise<any[]>[] = [];
    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
        console.log(`Starting session ${i}`);

        promises.push(runBrowsingSession({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts: listOfInstructionsPrompts[i],
        }))
    }
    return await Promise.all(promises);
}
