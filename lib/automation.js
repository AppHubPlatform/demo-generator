import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import { faker } from '@faker-js/faker';

const logRocketScript = fs.readFileSync('./logrocket_loader.js', 'utf8');

export async function runScript({
    useCloudEnv=false,
    websiteTarget,
    instructionsPrompts,
    timeoutSeconds=600,
}) {
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
                    proxies: [
                        {
                          "type": "browserbase",
                          "geolocation": {
                            "city": "NEW_YORK",
                            "state": "NY",
                            "country": "US"
                          }
                        }
                    ],
                    viewport: {
                        width: 1280,
                        height: 800,
                    },
                    solveCaptchas: true,
                    args: [
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
                    ]
                },
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

    await stagehand.init();

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
        provider: "anthropic",
        model: "gemini-2.5-computer-use-preview-10-2025",

        instructions: `You are an average human website user. Your job is to navigate around a given website in
        a way that seems realistic for a normal human. You should be a bit curious but also sometimes indecesive. You may be given a goal, but
        you don't need to execute that goal immediately, just eventually get to it. You should peruse a given website in a meandering way.
        You should move your mouse slowly and carefully around the pages, and scroll up and down the pages in a realistic way.

        DO NOT ASK FOLLOW UP QUESTIONS ABOUT THE GOAL. JUST TRY TO COMPLETE IT IN YOUR OWN WAY.

        If there are any cookie banners or pop ups, always click "accept", or "I Understand" or whatever is needed to approve the banner.`,

        verbose: true,

        options: {
            apiKey: process.env.GOOGLE_API_KEY,
        },
    });

    const results = [];
    for (const prompt of instructionsPrompts) {
        const result = await agent.execute(prompt);
        results.push(result);
        console.log(result);
    }

    return results;
}

export async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompts}) {
    const promises = [];
    for (let i = 0; i < numSessions; i++) {
        const timeoutSeconds = Math.floor(Math.random() * (600 - 120 + 1)) + 120;
        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s`);

        promises.push(runScript({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts,
            timeoutSeconds,
        }))
    }
    return await Promise.all(promises);
}

export async function mapSessionsToPrompts({useCloudEnv, websiteTarget, listOfInstructionsPrompts}) {
    const promises = [];
    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
        console.log(`Starting session ${i}`);

        promises.push(runScript({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts: listOfInstructionsPrompts[i],
        }))
    }
    return await Promise.all(promises);
}
