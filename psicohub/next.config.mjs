/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignorar erros de ESLint na compilação de produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros estritos de tipo do compilador na compilação final
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
