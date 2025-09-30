import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import "dotenv/config";
import { faker } from '@faker-js/faker';

const logRocketScript = fs.readFileSync('./logrocket_loader.js', 'utf8');



async function runScript({
    useCloudEnv=false,
    websiteTarget,
    instructionsPrompt,
    timeoutSeconds=300, // 5 minutes
}) {    
    let stagehand;
    
    if (useCloudEnv) {
         // Run in Browserbase cloud

         stagehand = new Stagehand({
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
            env: "BROWSERBASE",

            browserbaseSessionCreateParams: {
                projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
                browserSettings: {
                    blockAds: false,
                    viewport: {
                        width: 1024,
                        height: 768,
                    },
                    solveCaptchas: true,
                },
            timeout: timeoutSeconds,
            keepAlive: true,
            }    
        });
    } else {
       // Run in a local browsers

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

    await stagehand.page.goto(websiteTarget, { timeout: 60000 }); // 60 seconds

    // await stagehand.page.waitForLoadState('networkidle');

    await stagehand.page.evaluate(logRocketScript);
    
    if (Math.random() < 0.5) {
        const fakeName = faker.person.fullName();
        const fakeID = faker.string.uuid();

        const randomNumber = Math.floor(Math.random() * 101); // 0-100
        const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'me.com'];
        const randomDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
        const fakeEmail = fakeName.toLowerCase().replace(/\s+/g, '.') + randomNumber + '@' + randomDomain;

        await stagehand.page.evaluate(`(() => {
            window.LogRocket && window.LogRocket.identify('${fakeID}', {
                name: '${fakeName}',
                email: '${fakeEmail}',
            });
        })()`);
    }

    stagehand.page.on('load', async () => {
        console.log('PAGE LOAD DETEFCTED')
        await stagehand.page.evaluate(logRocketScript);
    });
    
    const agent = stagehand.agent({
        // You can use either OpenAI or Anthropic
        provider: "anthropic",
        // The model to use (computer-use-preview for OpenAI)
        model: "claude-sonnet-4-20250514",
    
        // Customize the system prompt
        instructions: `You are an average human website user. Your job is to navigate around a given website in 
        a way that seems realistic for a normal human. You should be a bit curious but also sometimes indecesive. You may be given a goal, but 
        you don't need to execute that goal immediately, just eventually get to it. You should peruse a given website in a meandering way. 
        You should move your mouse slowly and carefully around the pages, and scroll up and down the pages in a realistic way. 

        DO NOT ASK FOLLOW UP QUESTIONS ABOUT THE GOAL. JUST TRY TO COMPLETE IT IN YOUR OWN WAY.
        
        If there are any cookie banners or pop ups, always click "accept", or "I Understand" or whatever is needed to approve the banner.`,
    
        // Customize the API key
        options: {
            apiKey: process.env.ANTHROPIC_API_KEY,
        },
    });
    // Enable logging for the agent's chain of thought
    agent.enableLogs = true;
    
    // Execute the agent
    await agent.execute(instructionsPrompt);
    
        
     
}

async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompt}) {
    const promises = [];
    for (let i = 0; i < numSessions; i++) {
        // create a random timeout between 2 and 10 minutes to represent the duration of the user session
        const timeoutSeconds = 
        Math.floor(Math.random() * (600 - 120 + 1)) + 120;
        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s`);
        
        promises.push(runScript({
            useCloudEnv,
            websiteTarget,
            instructionsPrompt,
            timeoutSeconds,
        }))
    }
    await Promise.all(promises);
}



runMultipleSessions({
    useCloudEnv: true,
    numSessions: 5,
    websiteTarget: 'https://www.ulta.com',
    instructionsPrompt: `Browse around the site and view a few different products. 
        If a product has configuration options, then try a few configurations of the product. 
        Then add one to your cart and attempt to check out`
});

