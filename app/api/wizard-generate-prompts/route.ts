import { NextRequest } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
});

export async function POST(request: NextRequest) {
    try {
        const { website, research, numPrompts } = await request.json();

        if (!website || !research) {
            return new Response('Website URL and research are required', { status: 400 });
        }

        const count = numPrompts || 5;

        const prompt = `You are a UX researcher who creates realistic user behavior prompts for browser automation testing.

Website: ${website}

Research Summary:
${research}

Based on this research, generate exactly ${count} realistic prompts that simulate actual user behavior on this site.

Each prompt should be a natural language instruction for a browser automation agent. Make them diverse and realistic.

Provide your prompts in this exact format:
PROMPT_1: [first prompt]
PROMPT_2: [second prompt]
PROMPT_3: [third prompt]
... and so on for all ${count} prompts.

No extra explanation needed - just the prompts in the format shown above.`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await streamText({
                        model: google('gemini-2.0-flash-exp'),
                        prompt: prompt,
                    });

                    let fullText = '';

                    for await (const textPart of result.textStream) {
                        fullText += textPart;

                        // Send generation updates
                        const data = JSON.stringify({ type: 'generating', content: textPart });
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
        console.error('Wizard generate prompts error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
