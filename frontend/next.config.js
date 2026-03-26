/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
}

module.exports = nextConfig
