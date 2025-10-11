import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/sessionManager';

export async function GET(request: NextRequest) {
    try {
        const sessions = sessionManager.getActiveSessions();
        const count = sessionManager.getSessionCount();

        return NextResponse.json({
            sessions,
            count
        });
    } catch (error) {
        console.error('Error getting sessions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An error occurred' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const killedCount = await sessionManager.killAllSessions();

        return NextResponse.json({
            success: true,
            killedCount,
            message: `Killed ${killedCount} session(s)`
        });
    } catch (error) {
        console.error('Error killing sessions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An error occurred' },
            { status: 500 }
        );
    }
}
