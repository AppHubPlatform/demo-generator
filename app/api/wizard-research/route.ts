import { NextRequest } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { Stagehand } from "@browserbasehq/stagehand";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
});

async function fetchWebsiteContent(url: string): Promise<string> {
    let stagehand: Stagehand | null = null;

    try {
        // Validate URL format
        let validUrl: URL;
        try {
            validUrl = new URL(url);
        } catch (e) {
            throw new Error(`Invalid URL format: "${url}". Please enter a complete URL like https://example.com`);
        }

        // Ensure URL has http or https protocol
        if (!validUrl.protocol.startsWith('http')) {
            throw new Error(`Invalid protocol: "${validUrl.protocol}". URL must start with http:// or https://`);
        }

        console.log(`Fetching ${url} using Browserbase...`);

        // Use Browserbase to fetch content to bypass bot detection
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
                        width: 1280,
                        height: 800,
                    },
                    solveCaptchas: true,
                },
                timeout: 60,
                keepAlive: false,
            }
        });

        const initResult = await stagehand.init();
        const page = stagehand.page;

        // Navigate to the page and wait for content to load
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Wait a moment for any dynamic content
        await page.waitForTimeout(2000);

        // Get the text content
        const html = await page.content();

        // Extract text content from HTML
        // Remove script and style tags
        let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, ' ');
        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        // Limit to first 15000 characters to avoid token limits
        const limitedText = text.substring(0, 15000);

        if (limitedText.length < 100) {
            throw new Error('Website content is too short or empty. The URL may not be valid.');
        }

        console.log(`Fetched ${url}, extracted ${limitedText.length} characters`);
        return limitedText;
    } catch (error) {
        console.error('Error fetching website:', error);
        if (error instanceof Error) {
            // Pass through our custom error messages
            if (error.message.includes('Invalid URL') ||
                error.message.includes('Invalid protocol') ||
                error.message.includes('returned error') ||
                error.message.includes('too short or empty')) {
                throw error;
            }
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Cannot reach website "${url}". Please check the URL and try again.`);
            }
            // Handle timeout
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                throw new Error(`Request timed out while trying to reach "${url}". The website may be slow or unreachable.`);
            }
        }
        throw new Error(`Failed to fetch website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        // Clean up browser session
        if (stagehand) {
            try {
                // Only close if context exists (means init was successful)
                if (stagehand.context) {
                    await stagehand.context.close();
                }
            } catch (e) {
                // Ignore cleanup errors
                const errorMessage = e instanceof Error ? e.message : String(e);
                if (!errorMessage.includes('closed') && !errorMessage.includes('not initialized')) {
                    console.error('Error closing browser:', e);
                }
            }
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const { website } = await request.json();

        if (!website) {
            return new Response('Website URL is required', { status: 400 });
        }

        // Fetch the website content first
        const websiteContent = await fetchWebsiteContent(website);

        const prompt = `You are a UX researcher analyzing websites to understand user behavior patterns.

I have fetched the content from ${website}. Here is the text content from that website:

${websiteContent}

Based on this actual website content, provide a CONCISE summary (3-4 sentences maximum) covering:
1. What the company/site does (main purpose)
2. Key features or sections users interact with
3. Common user behaviors/journeys on this type of site

Be brief and focused. No extra explanation needed.`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await streamText({
                        model: google('gemini-2.0-flash-exp'),
                        prompt: prompt,
                    });

                    for await (const textPart of result.textStream) {
                        // Send research updates
                        const data = JSON.stringify({ type: 'research', content: textPart });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
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
        console.error('Wizard research error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
