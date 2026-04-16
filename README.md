# AutoJS6 Demo

这是一个使用TypeScript和Babel的AutoJS6项目演示。

## 项目结构

```
autojs6-demo/
├── src/           # TypeScript源代码
│   └── main.ts    # 主入口文件
├── dist/          # 编译后的JavaScript文件
├── babel.config.js # Babel配置文件
├── .babelrc       # Babel配置文件（备选）
├── tsconfig.json  # TypeScript配置
└── package.json   # 项目依赖和脚本
```

## 可用脚本

### 构建相关
- `pnpm webpack:watch` - Rhino 1.8.0 兼容构建 (ES5) **推荐用于 AutoJS6** 日常开发
- `npm run clean` - 清理dist目录

### 运行相关
- `npm run start` - 运行编译后的main.js文件

## 开发流程

1. **开始开发**：
   ```bash
   npm run dev
   ```

2. **修改代码**：
   编辑 `src/` 目录下的TypeScript文件

3. **自动构建**：
   文件保存后会自动编译到 `dist/` 目录

4. **运行代码**：
   ```bash
   pnpm webpack:watch
   ```

## Babel配置

项目提供了三种不同的Babel配置：

### 标准配置 (`babel.config.js`)
- **@babel/preset-env**: 根据目标环境自动转换ES6+语法
- **@babel/preset-typescript**: TypeScript支持
- **@babel/plugin-transform-class-properties**: 类属性支持
- **@babel/plugin-transform-object-rest-spread**: 对象展开运算符支持

### Rhino 1.8.0 兼容配置 (`babel.config.rhino.js`)
- **目标**: 完全兼容 Rhino 1.8.0 (ES5)
- **特点**: 将所有现代语法转换为 ES5
- **用途**: AutoJS6 等基于 Rhino 的环境

### 简化配置 (`babel.config.simple.js`)
- **目标**: 最小化转换
- **特点**: 只转换 class 语法和 TypeScript 类型
- **用途**: 需要基本 ES5 兼容但保持代码简洁

> ⚠️ **重要提醒**: `class` 是 ES6 关键字，Rhino 1.8.0 不支持！请使用 `npm run build:rhino` 进行构建。

## 监视功能

开发模式会监视以下文件变化：
- `src/**/*.ts`
- `src/**/*.tsx`

忽略以下文件：
- `node_modules/`
- `dist/`
- 测试文件（`*.test.ts`, `*.spec.ts`等）

## 快速开始

### 针对 AutoJS6 (Rhino 1.8.0) 开发

```bash
# 安装依赖
npm install

# 开始 Rhino 兼容开发
npm run dev:rhino

# 在另一个终端运行
npm run start
```

### 针对现代 JavaScript 环境开发

```bash
# 安装依赖
npm install

# 开始标准开发
npm run dev

# 在另一个终端运行
npm run start
```

## 演示监视功能

运行演示脚本来体验自动构建功能：

```bash
npm run demo
```

这个演示会：
1. 清理旧的构建文件
2. 进行初始构建
3. 启动监视模式
4. 等待你修改源代码
5. 自动重新构建修改后的文件

## 实际使用场景

### 场景1：开发新功能
```bash
# 启动监视模式
npm run dev

# 在另一个终端测试
npm run start
```

### 场景2：调试现有代码
```bash
# 使用详细输出的监视模式
npm run dev:simple

# 修改代码后检查构建输出
npm run start
```

### 场景3：生产构建
```bash
# 清理旧文件
npm run clean

# 构建生产版本
npm run build

# 运行
npm run start
``` 