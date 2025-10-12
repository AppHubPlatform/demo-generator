/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@browserbasehq/stagehand'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mock pino-pretty to prevent the transport error
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': false,
      };
    }
    return config;
  },
  env: {
    PINO_DISABLE_PRETTY: 'true',
  }
};

export default nextConfig;
