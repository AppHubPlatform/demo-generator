import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@browserbasehq/stagehand',
    'pino',
    'pino-pretty',
    'thread-stream',
    'pino-worker',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pino-related packages as external to prevent bundling
      if (!config.externals) {
        config.externals = [];
      }

      const externals = ['pino', 'pino-pretty', 'thread-stream', 'pino-worker', 'pino-file'];

      if (Array.isArray(config.externals)) {
        config.externals.push(...externals);
      } else if (typeof config.externals === 'function') {
        const oldExternals = config.externals;
        config.externals = async (context, request, callback) => {
          if (externals.some(ext => request === ext || request.startsWith(ext + '/'))) {
            return callback(null, `commonjs ${request}`);
          }
          return oldExternals(context, request, callback);
        };
      }
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
