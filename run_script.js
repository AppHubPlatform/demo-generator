import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import "dotenv/config";

const logRocketScript = fs.readFileSync('./logrocket_loader.js', 'utf8');



async function runScript(useCloudEnv=false) {    
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
                },
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

    await stagehand.page.goto("https://www.ulta.com");

    // await stagehand.page.waitForLoadState('networkidle');

    await stagehand.page.evaluate(logRocketScript);

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
    await agent.execute(`Browse around the site and view a few different products. 
        If a product has configuration options, then try a few configurations of the product. 
        Then add one to your cart and attempt to check out`);
    
        
     
}

runScript(true);