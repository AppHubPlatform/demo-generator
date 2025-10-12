/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@browserbasehq/stagehand',
    'pino',
    'pino-pretty',
    'thread-stream'
  ],
  experimental: {
    serverComponentsExternalPackages: [
      '@browserbasehq/stagehand',
      'pino',
      'pino-pretty',
      'thread-stream'
    ]
  }
};

export default nextConfig;
