const path = require('path');

/**
 * Webpack production configuration for AutoJS6 demo project
 * Optimized build for production deployment
 */
module.exports = {
  // 生产模式 - 启用优化和压缩
  mode: 'production',
  
  // 入口文件
  entry: './src/main.ts',
  
  // 输出配置
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // 构建前清理输出目录
  },
  
  // 模块解析配置
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    modules: ['node_modules'],
  },
  
  // 模块加载器
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            // 使用专门的webpack TypeScript配置
            configFile: 'tsconfig.webpack.json',
            // 生产环境禁用类型检查以提高构建速度
            transpileOnly: true,
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  
  // 生产环境不生成source map以减小文件体积
  devtool: false,
  
  // 优化配置
  optimization: {
    // 启用代码压缩
    minimize: true,
    // 不进行代码分割，交由 Webpack 和 LimitChunkCountPlugin 保持单文件输出
  },
  
  plugins: [
    // 强制将所有代码打包到一个文件
    new (require('webpack')).optimize.LimitChunkCountPlugin({
      maxChunks: 1
    }),
    new (require('webpack')).BannerPlugin({ banner: '"ui";', raw: true })
  ],
  
  // 外部依赖 - AutoJS6 相关的全局对象不需要打包
  externals: {
    // 如果有需要排除的全局变量，可以在这里配置
    // 'console': 'console',
    // 'global': 'global'
  },
  
  // 目标环境 - 设置为node以适配AutoJS6环境
  target: 'node',
  
  // 性能提示
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
}; 