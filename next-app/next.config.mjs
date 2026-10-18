const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/build/pdf.mjs';
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  /* config options here */
  async redirects() {
    return [
      {
        source: '/home',
        destination: 'http://maheshiesacademy.edustacks.co.in/',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/student/signup',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xalbtjoykovnlbjeddtv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
