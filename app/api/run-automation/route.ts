import { NextRequest, NextResponse } from 'next/server';
import { runBrowsingSession, runMultipleSessions, mapSessionsToPrompts } from '@/lib/automation';

interface RequestBody {
    mode: 'single' | 'multiple' | 'mapped';
    useCloudEnv?: boolean;
    websiteTarget: string;
    instructionsPrompts?: string[];
    numSessions?: number;
    listOfInstructionsPrompts?: string[][];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as RequestBody;
        const { mode, useCloudEnv, websiteTarget, instructionsPrompts, numSessions, listOfInstructionsPrompts } = body;

        let results: any;

        switch(mode) {
            case 'single':
                if (!instructionsPrompts) {
                    return NextResponse.json(
                        { error: 'instructionsPrompts is required for single mode' },
                        { status: 400 }
                    );
                }
                results = await runBrowsingSession({
                    useCloudEnv: useCloudEnv || false,
                    websiteTarget,
                    instructionsPrompts,
                });
                break;

            case 'multiple':
                if (!instructionsPrompts) {
                    return NextResponse.json(
                        { error: 'instructionsPrompts is required for multiple mode' },
                        { status: 400 }
                    );
                }
                results = await runMultipleSessions({
                    numSessions: numSessions || 1,
                    useCloudEnv: useCloudEnv || false,
                    websiteTarget,
                    instructionsPrompts,
                });
                break;

            case 'mapped':
                if (!listOfInstructionsPrompts) {
                    return NextResponse.json(
                        { error: 'listOfInstructionsPrompts is required for mapped mode' },
                        { status: 400 }
                    );
                }
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
            { error: error instanceof Error ? error.message : 'An error occurred' },
            { status: 500 }
        );
    }
}
