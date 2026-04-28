/** @type {import('next').NextConfig} */
const isMacLocalWorkaround =
  process.platform === "darwin" && !process.env.VERCEL && !process.env.CI;

const nextConfig = isMacLocalWorkaround
  ? {
      experimental: {
        useWasmBinary: true,
      },
    }
  : {};

export default nextConfig;
