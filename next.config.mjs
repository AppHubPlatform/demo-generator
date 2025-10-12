import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@browserbasehq/stagehand'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Replace pino-pretty with our stub to prevent the transport error
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': path.resolve(__dirname, 'lib/stubs/pino-pretty.js'),
      };
    }
    return config;
  },
  env: {
    PINO_DISABLE_PRETTY: 'true',
    LOG_LEVEL: 'silent',
    PINO_LOG_LEVEL: 'silent',
  }
};

export default nextConfig;
