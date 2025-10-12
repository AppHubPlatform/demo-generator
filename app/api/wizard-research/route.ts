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

Your task: Research the website ${website} and provide a CONCISE summary (3-4 sentences maximum) covering:
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
