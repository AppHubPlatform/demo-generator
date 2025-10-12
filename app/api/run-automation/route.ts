import { NextRequest, NextResponse } from 'next/server';
import { runBrowsingSession, runMultipleSessions, mapSessionsToPrompts } from '@/lib/automation';

interface RequestBody {
    mode: 'single' | 'multiple' | 'mapped';
    useCloudEnv?: boolean;
    websiteTarget: string;
    enableLogRocket?: boolean;
    logRocketServer?: 'demo' | 'staging' | 'prod';
    logRocketAppId?: string;
    screenSize?: 'randomize' | 'desktop-large' | 'desktop-medium' | 'iphone-regular' | 'iphone-plus';
    instructionsPrompts?: string[];
    numSessions?: number;
    listOfInstructionsPrompts?: string[][];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as RequestBody;
        const { mode, useCloudEnv, websiteTarget, enableLogRocket, logRocketServer, logRocketAppId, screenSize, instructionsPrompts, numSessions, listOfInstructionsPrompts } = body;

        // Force cloud environment in production
        const deploymentEnv = process.env.DEPLOYMENT_ENV || 'local';
        const isProduction = deploymentEnv === 'production';
        const effectiveUseCloudEnv = isProduction ? true : (useCloudEnv || false);

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
                    useCloudEnv: effectiveUseCloudEnv,
                    websiteTarget,
                    instructionsPrompts,
                    enableLogRocket: enableLogRocket !== false,
                    logRocketServer: logRocketServer || 'prod',
                    logRocketAppId: logRocketAppId || 'public-shares/credit-karma',
                    screenSize: screenSize || 'desktop-medium',
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
                    useCloudEnv: effectiveUseCloudEnv,
                    websiteTarget,
                    instructionsPrompts,
                    enableLogRocket: enableLogRocket !== false,
                    logRocketServer: logRocketServer || 'prod',
                    logRocketAppId: logRocketAppId || 'public-shares/credit-karma',
                    screenSize: screenSize || 'desktop-medium',
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
                    useCloudEnv: effectiveUseCloudEnv,
                    websiteTarget,
                    listOfInstructionsPrompts,
                    enableLogRocket: enableLogRocket !== false,
                    logRocketServer: logRocketServer || 'prod',
                    logRocketAppId: logRocketAppId || 'public-shares/credit-karma',
                    screenSize: screenSize || 'desktop-medium',
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
        // Filter out expected errors when session is killed
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isExpectedError = errorMessage.includes('Target page, context or browser has been closed') ||
                               errorMessage.includes('proxy.newCDPSession');

        if (isExpectedError) {
            // Session was killed, return success response
            return NextResponse.json({
                success: false,
                message: 'Session was terminated',
                results: null
            });
        }

        console.error('Automation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An error occurred' },
            { status: 500 }
        );
    }
}
