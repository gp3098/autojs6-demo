module.exports = {
  presets: [
    // 只使用 TypeScript 预设，移除类型
    '@babel/preset-typescript'
  ],
  plugins: [
    // 转换类属性 (必须在类转换之前)
    '@babel/plugin-transform-class-properties',
    // 转换 ES6 类为 ES5 函数
    '@babel/plugin-transform-classes',
    // 转换 const/let 为 var
    '@babel/plugin-transform-block-scoping'
  ],
  ignore: [
    'node_modules',
    'dist',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx'
  ]
}; 