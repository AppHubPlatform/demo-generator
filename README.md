# LogRocket Demo Session Generator

A Next.js application that generates realistic browser automation sessions using AI to simulate human-like website interactions. Built with [Stagehand](https://stagehand.dev) for browser automation and designed to generate demo sessions for LogRocket.

## Features

- **AI-Powered Browser Automation**: Uses Google's Gemini 2.5 Computer Use model to naturally interact with websites
- **Multiple Session Modes**:
  - Single Session: Run one automation session with custom prompts
  - Multiple Sessions: Run multiple parallel sessions with the same instructions
  - Mapped Sessions: Run up to 5 different sessions with unique prompts for each
- **Cloud & Local Browser Support**:
  - Browserbase Cloud: Run sessions in the cloud (required for production)
  - Local Browser: Run sessions locally for development
- **Mobile Device Emulation**: Support for desktop and iPhone screen sizes
- **LogRocket Integration**: Automatic LogRocket script injection with configurable servers and app IDs
- **Session Management**: View active sessions, debug URLs, and kill sessions on demand
- **Autopilot Mode**: Pre-configured Credit Karma demo that runs automatically

## Prerequisites

- Node.js 18+
- npm or pnpm
- A [Browserbase](https://browserbase.com) account and API key (for cloud sessions)
- A Google API key for Gemini AI model
- (Optional) LogRocket account for session recording

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd demo-monkey-typist
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```bash
# Deployment environment (local or production)
DEPLOYMENT_ENV=local

# Required: Google API key for Gemini AI model
GOOGLE_API_KEY=your_google_api_key_here

# Required for cloud sessions: Browserbase credentials
BROWSERBASE_API_KEY=your_browserbase_api_key_here

# Optional: Other AI provider keys (not currently used)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Autopilot Mode

The easiest way to get started. Click "Autopilot Mode" and hit "Run" to start a pre-configured demo on creditkarma.com.

### Manual Mode

Customize your automation sessions:

1. **Browser Environment**: Choose between Browserbase Cloud or Local Browser (local only available in development)

2. **Screen Size**: Select from:
   - Desktop Large (1920×1080)
   - Desktop Medium (1280×800)
   - iPhone Regular (390×844) - with mobile user agent
   - iPhone Plus (430×932) - with mobile user agent

3. **Mode**: Choose your session type:
   - **Single Session**: One session with multiple instruction prompts
   - **Multiple Sessions**: Run N parallel sessions with the same instructions
   - **Mapped Sessions**: Run up to 5 sessions, each with unique instructions

4. **Website Target**: Enter the URL you want to automate (e.g., https://creditkarma.com)

5. **Instructions**: Provide natural language instructions for what the AI should do on the website

6. **LogRocket Settings**:
   - Enable/disable LogRocket recording
   - Select server (demo/staging/prod)
   - Enter LogRocket App ID

### Session Management

- **Active Sessions**: View currently running sessions with links to Browserbase debug views
- **Kill Sessions**: Stop individual sessions or kill all sessions at once

## Project Structure

```
demo-monkey-typist/
├── app/
│   ├── page.tsx              # Main UI component
│   ├── api/
│   │   ├── run-automation/   # API endpoint for running sessions
│   │   ├── sessions/         # API endpoint for session management
│   │   └── config/           # API endpoint for configuration
├── lib/
│   ├── automation.ts         # Core automation logic (Stagehand)
│   ├── sessionManager.ts     # In-memory session tracking
│   ├── logRocketScript.ts    # LogRocket script generation
│   └── stubs/                # Stub modules for production compatibility
├── public/
│   └── galileo_dancing.mp4   # Loading animation
├── .env                      # Environment variables (not in git)
├── next.config.mjs           # Next.js configuration
└── package.json              # Dependencies
```

## How It Works

1. **Session Initialization**: Creates a Stagehand instance configured for either local browser or Browserbase cloud
2. **AI Agent**: Initializes a Gemini Computer Use agent with instructions to behave like a human user
3. **LogRocket Injection**: Injects LogRocket script into pages (if enabled)
4. **Task Execution**: Agent executes natural language instructions by interacting with the page
5. **Session Management**: Tracks active sessions and provides debug URLs

## Mobile Device Emulation

When iPhone screen sizes are selected, the app uses Playwright's device emulation with proper:
- User Agent strings (iPhone 12 Pro / iPhone 14 Plus)
- Mobile viewport settings
- Touch event support
- Device pixel ratio

This ensures websites serve their mobile versions instead of desktop versions in a small viewport.

## Deployment

### Vercel Deployment

1. Push your code to GitHub

2. Connect your repository to Vercel

3. Add environment variables in Vercel project settings:
   - `DEPLOYMENT_ENV=production`
   - `GOOGLE_API_KEY`
   - `BROWSERBASE_API_KEY`

4. Deploy! In production, the app automatically uses Browserbase Cloud (local browser is disabled)

### Important Notes

- **Production mode** automatically forces cloud environment (Browserbase)
- The `disablePino` flag is set to prevent pino logging issues in serverless environments
- Mobile OS emulation (`os: 'mobile'`) requires Browserbase Advanced Stealth plan

## Troubleshooting

### "modelApiKey is required" error
Make sure `GOOGLE_API_KEY` is set in your environment variables.

### "mobile OS is only available for advanced stealth users"
Comment out the `browserSettings.os = 'mobile'` line in `lib/automation.ts` or upgrade your Browserbase plan.

### WebSocket disconnected errors
This usually means the browser session was closed unexpectedly. Check your Browserbase dashboard for session logs.

### Mobile site not loading
Ensure you're using Browserbase Cloud (not local) for best mobile emulation. Local mobile emulation has limitations.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run dev`
4. Commit with descriptive messages
5. Push and create a pull request

## License

ISC

## Support

For issues with:
- **Stagehand**: https://github.com/browserbase/stagehand/issues
- **Browserbase**: support@browserbase.com
- **This project**: Create an issue in this repository
