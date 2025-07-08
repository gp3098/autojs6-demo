# Webpack 打包配置

本项目已成功集成webpack打包功能，可以将TypeScript源码打包成单个main.js文件。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 打包命令

#### 开发版本打包
```bash
npm run bundle:dev
# 或者
npm run webpack:build
```
- 生成带有source map的开发版本
- 代码未压缩，便于调试
- 文件大小约4.4KB

#### 生产版本打包
```bash
npm run bundle
# 或者
npm run webpack:build:prod
```
- 生成压缩优化的生产版本
- 代码已压缩混淆
- 文件大小约602B

#### 监听模式（开发）
```bash
npm run webpack:watch
```
- 文件变更时自动重新打包
- 适合开发阶段使用

## 📁 输出文件

打包后的文件位于 `dist/` 目录：
- `main.js` - 打包后的主文件
- `main.js.map` - source map文件（仅开发版本）

## ⚙️ 配置说明

### webpack.config.js
开发环境配置：
- 启用source map
- 保留注释
- 未压缩代码

### webpack.prod.config.js  
生产环境配置：
- 启用代码压缩
- 禁用source map
- 优化文件大小

### tsconfig.webpack.json
专用TypeScript配置：
- 目标ES5兼容
- 跳过类型检查（transpileOnly）
- 排除AutoJS6类型定义中的错误

## 🎯 AutoJS6 兼容性

- 目标环境设置为`node`以适配AutoJS6
- 使用ES5语法确保兼容性
- 支持AutoJS6特有的全局对象和API
- 可直接在AutoJS6中运行生成的main.js

## 📋 项目结构

```
src/
├── main.ts         # 入口文件
├── AppMgr.ts       # 应用管理类
└── ...

dist/
└── main.js         # 打包输出文件

配置文件:
├── webpack.config.js        # 开发环境webpack配置
├── webpack.prod.config.js   # 生产环境webpack配置
└── tsconfig.webpack.json    # webpack专用TS配置
```

## 🔧 自定义配置

如需修改打包配置，可以编辑：
- `webpack.config.js` - 开发环境设置
- `webpack.prod.config.js` - 生产环境设置
- `tsconfig.webpack.json` - TypeScript编译选项

## 📝 注意事项

1. 生成的代码经过webpack模块化处理，适合AutoJS6环境
2. 生产版本代码已压缩，不适合调试
3. 开发版本包含source map，便于调试
4. 所有TypeScript源码会被打包到单个文件中 