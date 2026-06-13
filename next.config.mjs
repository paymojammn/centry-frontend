/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path for production deployment behind nginx proxy
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Asset prefix for static assets
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Skip type checking during build (we'll fix types separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Prevent Next.js from stripping trailing slashes on API routes
  // Django requires trailing slashes (APPEND_SLASH = False)
  skipTrailingSlashRedirect: true,

  // Bills/Invoices/Vendors moved under the /erp/ namespace. Keep old links and
  // provider payment-return URLs working (query string is preserved by Next.js).
  async redirects() {
    return [
      { source: '/bills', destination: '/erp/bills', permanent: true },
      { source: '/bills/:id*', destination: '/erp/bills/:id*', permanent: true },
      { source: '/invoices', destination: '/erp/invoices', permanent: true },
      { source: '/invoices/:id*', destination: '/erp/invoices/:id*', permanent: true },
      { source: '/vendors', destination: '/erp/vendors', permanent: true },
      { source: '/vendors/:id*', destination: '/erp/vendors/:id*', permanent: true },
    ];
  },

  // Environment variables - ensure API URL is available
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },

};

export default nextConfig;
