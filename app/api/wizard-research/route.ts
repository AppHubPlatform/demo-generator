import { NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

async function fetchWebsiteContent(url: string): Promise<string> {
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

        console.log(`Fetching ${url}...`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`Website returned error: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

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
                        model: google('gemini-2.0-flash-exp', {
                            apiKey: process.env.GOOGLE_API_KEY,
                        }),
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
