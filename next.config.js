/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Allows product images from Cloudinary to load
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        // Allows Green API media downloads during processing
        protocol: 'https',
        hostname: '*.green-api.com',
      },
    ],
  },
}

module.exports = nextConfig
