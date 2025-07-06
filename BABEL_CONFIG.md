# Babel 配置说明

## 配置文件

项目使用了两种Babel配置方式：

### 1. babel.config.js (推荐)
```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: '14' },
      modules: 'commonjs'
    }],
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-object-rest-spread'
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
```

### 2. .babelrc (备选)
JSON格式的配置文件，内容与babel.config.js相同。

## 预设 (Presets)

### @babel/preset-env
- **用途**: 根据目标环境自动转换ES6+语法
- **配置**: 
  - `targets: { node: '14' }` - 目标Node.js版本
  - `modules: 'commonjs'` - 输出CommonJS模块

### @babel/preset-typescript
- **用途**: 提供TypeScript支持
- **功能**: 移除类型注解，转换TS特有语法

## 插件 (Plugins)

### @babel/plugin-transform-class-properties
- **用途**: 转换类属性语法
- **示例**: 
  ```typescript
  class MyClass {
    name = 'test';  // 转换为构造函数中的赋值
  }
  ```

### @babel/plugin-transform-object-rest-spread
- **用途**: 转换对象展开语法
- **示例**:
  ```typescript
  const obj = { ...other, name: 'test' };  // 转换为Object.assign
  ```

## 忽略文件

以下文件/目录会被Babel忽略：
- `node_modules/` - 第三方依赖
- `dist/` - 构建输出目录
- `**/*.test.ts` - 测试文件
- `**/*.spec.ts` - 规范文件

## 监视模式

### 基本监视
```bash
npm run build:watch
```

### 开发模式（推荐）
```bash
npm run dev
```

### 详细输出模式
```bash
npm run dev:simple
```

## 构建流程

1. **源文件**: `src/**/*.ts` 和 `src/**/*.tsx`
2. **转换**: TypeScript → JavaScript (ES6)
3. **输出**: `dist/` 目录
4. **扩展名**: `.ts` → `.js`

## 性能优化

- 使用 `ignore` 配置跳过不需要的文件
- 监视模式只处理变更的文件
- 缓存机制提高重复构建速度

## 故障排除

### 常见问题

1. **插件未找到**
   ```bash
   npm install @babel/plugin-transform-class-properties --save-dev
   ```

2. **TypeScript类型错误**
   - Babel只转换语法，不进行类型检查
   - 使用 `tsc --noEmit` 进行类型检查

3. **监视模式不工作**
   - 检查文件路径是否正确
   - 确保没有被ignore规则排除

### 调试技巧

1. 使用 `--verbose` 参数查看详细输出
2. 检查 `dist/` 目录的生成文件
3. 使用 `npm run build` 测试单次构建 