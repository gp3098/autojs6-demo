module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          // 针对 Rhino 1.8.0 的兼容性配置
          browsers: ['> 0%']
        },
        modules: 'commonjs',
        // 强制转换所有 ES6+ 语法到 ES5
        forceAllTransforms: true,
        // 确保所有现代语法都被转换
        spec: true
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [
    // 先转换类属性，再转换类本身
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-classes',
    // 转换对象展开语法
    '@babel/plugin-transform-object-rest-spread',
    // 转换箭头函数
    '@babel/plugin-transform-arrow-functions',
    // 转换模板字符串
    '@babel/plugin-transform-template-literals',
    // 转换解构赋值
    '@babel/plugin-transform-destructuring',
    // 转换 const/let 为 var
    '@babel/plugin-transform-block-scoping',
    // 转换默认参数
    '@babel/plugin-transform-parameters'
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