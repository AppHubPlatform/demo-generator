import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import "dotenv/config";
import { faker } from '@faker-js/faker';
import { map } from "zod/v4";

const logRocketScript = fs.readFileSync('./logrocket_loader.js', 'utf8');



async function runScript({
    useCloudEnv=false,
    websiteTarget,
    instructionsPrompts,
    timeoutSeconds=600, // 10 minutes
}) {    
    let stagehand;
    
    if (useCloudEnv) {
         // Run in Browserbase cloud

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
       // Run in a local browsers

       stagehand = new Stagehand({
            env: 'LOCAL',
            localBrowserLaunchOptions: {
                headless: false,
                viewport: {
                    width: 1280,
                    height: 800,
                },
                // cdpUrl: 'http://localhost:9222',
                // args: [
                //     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
                // ]
            }
        });
    }

    await stagehand.init();

    const page = stagehand.page;

    await page.goto(websiteTarget,  { waitUntil: "domcontentloaded" }); 

    await page.evaluate(logRocketScript);


    // 50% of the time, call LogRocket.identify() with a fake user
    if (Math.random() < 0.5) {
        const fakeName = faker.person.fullName();
        const fakeID = faker.string.uuid();

        const randomNumber = Math.floor(Math.random() * 101); // 0-100
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
        // Inject LogRocket script on each page load
        await page.evaluate(logRocketScript);
    });
    
    const agent = stagehand.agent({
        // You can use either OpenAI or Anthropic
        provider: "anthropic",
        // The model to use (computer-use-preview for OpenAI)
        // model: "claude-sonnet-4-20250514",
        model: "gemini-2.5-computer-use-preview-10-2025",
    
        // Customize the system prompt
        instructions: `You are an average human website user. Your job is to navigate around a given website in 
        a way that seems realistic for a normal human. You should be a bit curious but also sometimes indecesive. You may be given a goal, but 
        you don't need to execute that goal immediately, just eventually get to it. You should peruse a given website in a meandering way. 
        You should move your mouse slowly and carefully around the pages, and scroll up and down the pages in a realistic way. 

        DO NOT ASK FOLLOW UP QUESTIONS ABOUT THE GOAL. JUST TRY TO COMPLETE IT IN YOUR OWN WAY. 
        
        If there are any cookie banners or pop ups, always click "accept", or "I Understand" or whatever is needed to approve the banner.`,
    
        verbose: true,

        // Customize the API key
        options: {
            apiKey: process.env.GOOGLE_API_KEY,
        },
    });
      
    
    // Execute each prompt
    for (const prompt of instructionsPrompts) {
        console.log(await agent.execute(prompt));
    }
    
        
}

async function runMultipleSessions({numSessions, useCloudEnv, websiteTarget, instructionsPrompts}) {
    const promises = [];
    for (let i = 0; i < numSessions; i++) {
        // create a random timeout between 2 and 10 minutes to represent the duration of the user session
        const timeoutSeconds = Math.floor(Math.random() * (600 - 120 + 1)) + 120;
        console.log(`Starting session ${i} with timeout of ${timeoutSeconds}s`);
        
        promises.push(runScript({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts,
            timeoutSeconds,
        }))
    }
    await Promise.all(promises);
}


async function mapSessionsToPrompts({useCloudEnv, websiteTarget, listOfInstructionsPrompts}) {
    const promises = [];
    for (let i = 0; i < listOfInstructionsPrompts.length; i++) {
        
        console.log(`Starting session ${i}`);
        
        promises.push(runScript({
            useCloudEnv,
            websiteTarget,
            instructionsPrompts: listOfInstructionsPrompts[i],
        }))
    }
    await Promise.all(promises);
}


runMultipleSessions({
    useCloudEnv: false,
    numSessions: 1,
    websiteTarget: 'https://creditkarma.com',
    instructionsPrompts: [`Browse around the site and click on credit cards.`,
        `Review credit cards in 3 different categories `,
        `Review types of personal loans`,
    ]
});



// const variousPrompts = [
//     ["Click “Sign up / Join credit karma”", "Enter a fake name, fake email, fake SSN", "Submit and capture any validation or error messages"],
  
//     ["Click “Log in / Sign in”", "Enter a valid email + wrong password", "Try “Forgot password” flow"],
  
//     ["Begin signup with real name but invalid SSN format (too short or letters)", "Try to proceed", "Capture error messages"],
  
//     ["On homepage, click “credit cards”", "Select a credit card offer", "Click “See your odds” or eligibility", "Check for missing or incorrect odds display"],
  
//     ["Go to personal loans section", "Filter by “debt consolidation” and “home improvement”", "Select a lender and view detailed offer", "Check that interest rate / APR is shown"],
  
//     ["Navigate to “Auto Loans / Car Financing”", "Try to enter a ZIP code outside service area (e.g. non-US)", "See how system handles it"],
  
//     ["Go to “Help / Support”", "Search for “report error on credit report”", "Click dispute flow", "Try uploading an unsupported file type"],
  
//     ["Open “Credit Score Simulator” tool", "Increase utilization percentage to 200%", "See how system handles unrealistic input"],
  
//     ["Visit “Recommendations / My Offers”", "Click on a recommendation", "Try to apply, but use invalid income or employment info", "Capture error"],
  
//     ["Navigate to “Identity / Credit Monitoring”", "Toggle alerts settings", "See if toggle states persist after refresh"],
  
//     ["Go to “Net Worth / Linked Accounts”", "Try to connect a bank using invalid login credentials", "See how failures are handled"],
  
//     ["Open “Messages / Notifications” section", "Click on an old notification", "Check if links inside notification still valid"],
  
//     ["Browse the privacy / data sharing policy pages", "Click external links", "Check for broken links or missing content"],
  
//     ["From settings, go to profile / personal info", "Edit your income bracket or employment status", "Save, then reload and verify persistence"],
  
//     ["In signup, skip a required field (leave “date of birth” blank)", "Try to advance", "Capture field-level error"],
  
//     ["Search for “student loans”", "Click on a result", "If none, try similar spelling (e.g. “studnt loans”)", "See whether “no results” messaging is clear"],
  
//     ["On credit report summary, click one item labeled “dispute” or “challenge”", "Begin dispute process", "Cancel midflow", "See whether partial progress is saved or lost"],
  
//     ["Go to “Tax / Refund” section", "Enter invalid or malformed bank account info for direct deposit", "Check validation errors"],
  
//     ["Use site search bar, search for a non-existent product (e.g. “crypto loan”)", "Observe search results / “no results” experience", "Try suggestions"],
  
//     ["Attempt signup using email already in use", "Submit", "Check whether error is descriptive, not generic (“Something went wrong”)"]
//   ];
  
//   mapSessionsToPrompts({
//     useCloudEnv: true,
//     websiteTarget: 'https://creditkarma.com',
//     listOfInstructionsPrompts: variousPrompts,
//   })
  

