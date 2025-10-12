/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@browserbasehq/stagehand'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore pino-pretty and thread-stream in production builds
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['pino-pretty'] = false;
      config.resolve.alias['thread-stream'] = false;
    }
    return config;
  }
};

export default nextConfig;
