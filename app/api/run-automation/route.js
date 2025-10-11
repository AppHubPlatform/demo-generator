import { NextResponse } from 'next/server';
import { runScript, runMultipleSessions, mapSessionsToPrompts } from '@/lib/automation';

export async function POST(request) {
    try {
        const body = await request.json();
        const { mode, useCloudEnv, websiteTarget, instructionsPrompts, numSessions, listOfInstructionsPrompts } = body;

        let results;

        switch(mode) {
            case 'single':
                results = await runScript({
                    useCloudEnv: useCloudEnv || false,
                    websiteTarget,
                    instructionsPrompts,
                });
                break;

            case 'multiple':
                results = await runMultipleSessions({
                    numSessions: numSessions || 1,
                    useCloudEnv: useCloudEnv || false,
                    websiteTarget,
                    instructionsPrompts,
                });
                break;

            case 'mapped':
                results = await mapSessionsToPrompts({
                    useCloudEnv: useCloudEnv || false,
                    websiteTarget,
                    listOfInstructionsPrompts,
                });
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid mode. Use "single", "multiple", or "mapped"' },
                    { status: 400 }
                );
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Automation error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred' },
            { status: 500 }
        );
    }
}
