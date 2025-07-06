# Rhino 1.8.0 兼容性指南

## 问题说明

你的担心是对的！`class` 确实是 ES6 (ES2015) 的关键字，而 **Rhino 1.8.0 对 ES6 的支持非常有限**。

根据 Mozilla 的兼容性表格：
- Rhino 1.8.0 只有 **62% 的 ES6 支持**
- **不支持 ES6 的 `class` 语法**
- 许多现代 JavaScript 特性都不被支持

## 解决方案

我们提供了三种不同的 Babel 配置来处理这个问题：

### 1. 标准配置 (`babel.config.js`)
- **用途**: 现代 Node.js 环境
- **目标**: ES6+ 环境
- **特点**: 保留较多现代语法

### 2. Rhino 兼容配置 (`babel.config.rhino.js`)
- **用途**: 完全兼容 Rhino 1.8.0
- **目标**: ES5 环境 (IE9 兼容)
- **特点**: 转换所有现代语法到 ES5

### 3. 简化配置 (`babel.config.simple.js`)
- **用途**: 最小化转换，主要处理 class 和 TypeScript
- **目标**: 基本的 ES5 兼容
- **特点**: 只转换必要的语法

## 使用方法

### 针对 Rhino 1.8.0 的构建命令

```bash
# 使用 Rhino 兼容配置（推荐）
npm run build:rhino

# 使用简化配置
npm run build:simple

# 监视模式
npm run dev:rhino
```

### 针对现代环境的构建命令

```bash
# 标准构建
npm run build

# 标准监视模式
npm run dev
```

## 代码编写建议

### ✅ Rhino 1.8.0 兼容的写法

```typescript
// 使用简单的类定义
class AppMgr {
  private name: string;
  
  constructor() {
    this.name = 'AutoJS6 Demo';
  }
  
  // 使用普通方法
  showInfo(): void {
    console.log('Application: ' + this.name);
  }
  
  // 避免箭头函数属性
  handleClick(): void {
    console.log('Button clicked!');
  }
}

// 使用 var 而不是 const/let
var config = {
  debug: true,
  timeout: 5000
};

// 手动对象合并，避免展开语法
var extendedConfig = {
  debug: config.debug,
  timeout: config.timeout,
  name: 'Extended Config'
};
```

### ❌ 避免使用的语法

```typescript
// 避免类属性初始化
class AppMgr {
  private name: string = 'AutoJS6 Demo'; // ❌
}

// 避免箭头函数属性
class AppMgr {
  handleClick = () => { // ❌
    console.log('Button clicked!');
  }
}

// 避免对象展开语法
const extendedConfig = { // ❌
  ...config,
  name: 'Extended Config'
};

// 避免模板字符串
console.log(`Application: ${this.name}`); // ❌

// 避免解构赋值
const { name, version } = config; // ❌

// 避免 const/let
const value = 123; // ❌
let counter = 0; // ❌
```

## 转换结果对比

### 原始 TypeScript 代码
```typescript
class AppMgr {
  private name: string = 'AutoJS6 Demo';
  
  handleClick = () => {
    console.log(`Button clicked: ${this.name}`);
  }
}
```

### 转换后的 ES5 代码
```javascript
var AppMgr = function () {
  function AppMgr() {
    this.name = 'AutoJS6 Demo';
    this.handleClick = function () {
      console.log('Button clicked: ' + this.name);
    };
  }
  return AppMgr;
}();
```

## 测试兼容性

构建完成后，生成的 `dist/main.js` 文件应该可以在 Rhino 1.8.0 中正常运行。

主要检查点：
- ✅ 没有 `class` 关键字
- ✅ 没有箭头函数
- ✅ 没有模板字符串
- ✅ 没有 `const`/`let`
- ✅ 没有对象展开语法
- ✅ 使用 `var` 声明变量
- ✅ 使用字符串拼接而不是模板字符串

## 推荐工作流程

1. **开发时**: 使用现代 TypeScript 语法编写代码
2. **构建时**: 使用 `npm run build:rhino` 生成 Rhino 兼容代码
3. **测试时**: 在 Rhino 1.8.0 环境中测试生成的代码
4. **部署时**: 使用转换后的 ES5 代码 