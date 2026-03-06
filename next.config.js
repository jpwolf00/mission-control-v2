/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/kanban', destination: '/stories', permanent: true },
    ];
  },
}

module.exports = nextConfig
