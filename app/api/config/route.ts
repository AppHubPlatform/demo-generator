import { NextResponse } from 'next/server';

export async function GET() {
    const deploymentEnv = process.env.DEPLOYMENT_ENV || 'local';
    const isProduction = deploymentEnv === 'production';

    return NextResponse.json({
        isProduction,
        deploymentEnv
    });
}
