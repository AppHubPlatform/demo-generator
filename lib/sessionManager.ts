import { Stagehand } from "@browserbasehq/stagehand";
import { Browserbase } from "@browserbasehq/sdk";

interface ActiveSession {
    id: string;
    stagehand: Stagehand;
    startTime: Date;
    browserbaseSessionId?: string;
    debugUrl?: string;
    sessionUrl?: string;
}

class SessionManager {
    private sessions: Map<string, ActiveSession> = new Map();

    addSession(id: string, stagehand: Stagehand, browserbaseSessionId?: string, debugUrl?: string, sessionUrl?: string): void {
        this.sessions.set(id, {
            id,
            stagehand,
            startTime: new Date(),
            browserbaseSessionId,
            debugUrl,
            sessionUrl,
        });
    }

    removeSession(id: string): void {
        this.sessions.delete(id);
    }

    async killSession(id: string): Promise<boolean> {
        const session = this.sessions.get(id);
        if (!session) {
            return false;
        }

        try {
            // Close the local context first
            await session.stagehand.context?.close();

            // If this is a Browserbase session, terminate it via SDK
            if (session.browserbaseSessionId && process.env.BROWSERBASE_API_KEY) {
                try {
                    const bb = new Browserbase({
                        apiKey: process.env.BROWSERBASE_API_KEY,
                    });

                    await bb.sessions.update(session.browserbaseSessionId, {
                        projectId: "ceaa3d2e-6ab5-4694-bdcc-a06f060b2137",
                        status: "REQUEST_RELEASE",
                    });
                } catch (apiError) {
                    console.error(`Error terminating Browserbase session ${session.browserbaseSessionId}:`, apiError);
                }
            }

            this.sessions.delete(id);
            return true;
        } catch (error) {
            console.error(`Error killing session ${id}:`, error);
            return false;
        }
    }

    async killAllSessions(): Promise<number> {
        let killedCount = 0;
        const sessionIds = Array.from(this.sessions.keys());

        for (const id of sessionIds) {
            const success = await this.killSession(id);
            if (success) {
                killedCount++;
            }
        }

        return killedCount;
    }

    getActiveSessions(): Array<{ id: string; startTime: Date; debugUrl?: string; sessionUrl?: string; browserbaseSessionId?: string }> {
        return Array.from(this.sessions.values()).map(({ id, startTime, debugUrl, sessionUrl, browserbaseSessionId }) => ({
            id,
            startTime,
            debugUrl,
            sessionUrl,
            browserbaseSessionId,
        }));
    }

    getSessionCount(): number {
        return this.sessions.size;
    }
}

export const sessionManager = new SessionManager();
