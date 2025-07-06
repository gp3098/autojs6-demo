#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting development mode...');
console.log('📁 Watching src/ for changes...');
console.log('📦 Building to dist/...');
console.log('⚡ Auto-restart enabled\n');

// 启动Babel监视模式
const babel = spawn('npx', ['babel', 'src', '--extensions', '.ts,.tsx', '--out-dir', 'dist', '--watch', '--verbose'], {
  stdio: 'inherit',
  shell: true
});

babel.on('close', (code) => {
  console.log(`\n🛑 Babel process exited with code ${code}`);
  process.exit(code);
});

babel.on('error', (err) => {
  console.error('❌ Babel error:', err);
  process.exit(1);
});

// 监听进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development server...');
  babel.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping development server...');
  babel.kill('SIGTERM');
  process.exit(0);
}); 