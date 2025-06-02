/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14+ 默认启用 app directory，不需要实验性配置
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务器端构建时排除有问题的二进制文件
      config.externals = config.externals || [];
      config.externals.push({
        'ssh2': 'commonjs ssh2'
      });
    }

    // 忽略 .node 文件
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });

    return config;
  }
}

module.exports = nextConfig