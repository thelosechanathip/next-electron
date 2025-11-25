/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // เพิ่มบรรทัดนี้: เพื่อเปลี่ยน /_next เป็น ./_next ตอน build production
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : undefined,
};

export default nextConfig;