import { NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(request: NextRequest) {
    try {
        const { website } = await request.json();

        if (!website) {
            return new Response('Website URL is required', { status: 400 });
        }

        const prompt = `You are a UX researcher analyzing websites to understand user behavior patterns.

Your task:
1. Research the website: ${website}
2. Identify what the company does, what services/products they offer
3. Think about realistic user scenarios and behaviors on this site
4. Generate 5 realistic prompts that would simulate actual user behavior on this site

Think through this step by step:
- What is the main purpose of this website?
- What are the key features/sections users would interact with?
- What are common user journeys on this type of site?
- What actions would real users take?

After your analysis, provide exactly 5 prompts in this format:
PROMPT_1: [first prompt]
PROMPT_2: [second prompt]
PROMPT_3: [third prompt]
PROMPT_4: [fourth prompt]
PROMPT_5: [fifth prompt]

Each prompt should be a natural language instruction for a browser automation agent, describing realistic user behavior.`;

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

                    let fullText = '';

                    for await (const textPart of result.textStream) {
                        fullText += textPart;

                        // Send research updates
                        const data = JSON.stringify({ type: 'research', content: textPart });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }

                    // Extract prompts from the full text
                    const prompts = [];
                    const promptRegex = /PROMPT_\d+:\s*(.+?)(?=(?:PROMPT_\d+:|$))/gs;
                    const matches = fullText.matchAll(promptRegex);

                    for (const match of matches) {
                        const prompt = match[1].trim();
                        if (prompt) {
                            prompts.push(prompt);
                        }
                    }

                    // Send the extracted prompts
                    if (prompts.length > 0) {
                        const data = JSON.stringify({ type: 'prompts', prompts });
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
        console.error('Autopilot research error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
