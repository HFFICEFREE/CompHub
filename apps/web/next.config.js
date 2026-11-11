// Removed TypeScript-specific syntax for JavaScript compatibility

const nextConfig = {
  experimental: {
    // No unknown properties
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;