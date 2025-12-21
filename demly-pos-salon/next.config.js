/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Disable automatic trailing slash redirects
  skipTrailingSlashRedirect: true,
  
  // Don't add trailing slashes automatically
  trailingSlash: false,
  
  async headers() {
    return [
      {
        // Apply to ALL routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
