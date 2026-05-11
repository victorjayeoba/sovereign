import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next stops complaining about multiple lockfiles
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // The desktop workspace pulls in `bare-*` runtime shims via @qvac/sdk.
  // Next's devtools walks the workspace node_modules and trips on their
  // dynamic `require()` calls. Mark them external so Next stops bundling
  // them and the "Critical dependency" warnings go away.
  serverExternalPackages: [
    'bare-fs',
    'bare-os',
    'bare-tty',
    'bare-signals',
    'bare-process',
    'bare-stdio',
    'bare-abort-controller',
    'bare-buffer',
    'bare-fetch',
    'bare-subprocess',
  ],
  // Silence the same warnings on the client bundle path (webpack), which
  // serverExternalPackages doesn't cover.
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules[\\/](\.pnpm[\\/])?bare-/ },
    ]
    return config
  },
}

export default nextConfig
