/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable automatic trailing slash redirects
  skipTrailingSlashRedirect: true,
  
  async headers() {
    return [
      {
        // Match webhook endpoint with or without trailing slash
        source: '/api/webhooks/stripe/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
