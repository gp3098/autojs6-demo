#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎬 AutoJS6 Demo - 监视功能演示');
console.log('================================');
console.log('');
console.log('这个演示将展示如何使用Babel监视功能：');
console.log('1. 启动监视模式');
console.log('2. 修改源代码');
console.log('3. 自动重新构建');
console.log('4. 运行更新后的代码');
console.log('');
console.log('按 Ctrl+C 停止监视');
console.log('================================');
console.log('');

// 首先清理并构建
console.log('🧹 清理旧的构建文件...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

console.log('🔨 初始构建...');
const initialBuild = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

initialBuild.on('close', (code) => {
  if (code === 0) {
    console.log('✅ 初始构建完成');
    console.log('');
    console.log('🚀 启动监视模式...');
    console.log('现在你可以修改 src/main.ts 文件，保存后会自动重新构建');
    console.log('');
    
    // 启动监视模式
    const watcher = spawn('npm', ['run', 'build:watch'], { stdio: 'inherit' });
    
    watcher.on('close', (code) => {
      console.log(`\n🛑 监视模式已停止 (退出代码: ${code})`);
    });
    
    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('\n🛑 停止监视模式...');
      watcher.kill('SIGINT');
      process.exit(0);
    });
    
  } else {
    console.error('❌ 初始构建失败');
    process.exit(1);
  }
}); 