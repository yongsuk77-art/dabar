import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 정적 배포용 (빌드 결과물: ./out)
  output: "export",
  // 정적 익스포트에서는 next/image 최적화 서버가 없으므로 비활성화
  images: { unoptimized: true },
};

export default nextConfig;
