/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@browserbasehq/stagehand'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore pino-pretty in production builds
      config.externals.push('pino-pretty');
    }
    return config;
  }
};

export default nextConfig;
