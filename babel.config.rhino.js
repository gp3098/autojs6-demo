module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          // 明确指定 ES5 兼容性
          ie: '9'
        },
        modules: 'commonjs',
        // 强制转换所有现代语法
        forceAllTransforms: true,
        // 使用严格的转换模式
        spec: true,
        // 不使用任何现代 API
        useBuiltIns: false,
        // 禁用所有现代特性
        exclude: [
          'transform-typeof-symbol'
        ]
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [
    // 转换类属性 (必须在类转换之前)
    '@babel/plugin-transform-class-properties',
    // 转换 ES6 类为 ES5 函数
    '@babel/plugin-transform-classes',
    // 转换对象展开 (使用 loose 模式避免 Symbol)
    ['@babel/plugin-transform-object-rest-spread', { loose: true, useBuiltIns: true }],
    // 转换箭头函数
    '@babel/plugin-transform-arrow-functions',
    // 转换模板字符串为字符串拼接
    '@babel/plugin-transform-template-literals',
    // 转换解构赋值
    ['@babel/plugin-transform-destructuring', { loose: true, useBuiltIns: true }],
    // 转换 const/let 为 var
    '@babel/plugin-transform-block-scoping',
    // 转换默认参数
    '@babel/plugin-transform-parameters',
    // 转换 for-of 循环
    ['@babel/plugin-transform-for-of', { loose: true }],
    // 转换计算属性名
    '@babel/plugin-transform-computed-properties',
    // 转换简写属性
    '@babel/plugin-transform-shorthand-properties',
    // 转换 spread 语法
    ['@babel/plugin-transform-spread', { loose: true, useBuiltIns: true }]
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