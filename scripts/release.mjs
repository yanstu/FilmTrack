#!/usr/bin/env node
/**
 * 本地出包 / 发布前校验脚本（跨平台）
 *
 * 用法：
 *   node scripts/release.mjs --check                # 仅校验版本一致性
 *   node scripts/release.mjs                        # 校验 + 类型检查 + 测试 + 构建当前平台
 *   node scripts/release.mjs --skip-tests           # 跳过测试直接构建
 *   node scripts/release.mjs --universal            # macOS 构建 universal 通用包
 *   node scripts/release.mjs --tag v0.5.1           # 额外校验 tag 与版本号一致
 *
 * 说明：跨平台安装包（Intel mac / Windows）请用 GitHub Actions（推送 v* 标签触发）。
 *      本地脚本只构建“当前操作系统”的产物。
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const tagArgIndex = process.argv.indexOf('--tag');
const tagArg = tagArgIndex >= 0 ? process.argv[tagArgIndex + 1] : null;

const log = (msg) => console.log(`\x1b[36m▶ ${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
const fail = (msg) => {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
};

// 1) 读取并校验版本一致性
const tauriConf = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
const cargoToml = readFileSync(join(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = (cargoToml.match(/^version\s*=\s*"([^"]+)"/m) || [])[1];
const tauriVersion = tauriConf.version;

log('校验版本一致性');
if (!tauriVersion || !cargoVersion) {
  fail('未能读取版本号');
}
if (tauriVersion !== cargoVersion) {
  fail(`版本不一致：tauri.conf.json=${tauriVersion} / Cargo.toml=${cargoVersion}`);
}
ok(`版本一致：${tauriVersion}`);

if (tagArg) {
  const expected = `v${tauriVersion}`;
  if (tagArg !== expected) {
    fail(`tag 与版本不一致：tag=${tagArg}，期望=${expected}`);
  }
  ok(`tag 校验通过：${tagArg}`);
}

if (args.has('--check')) {
  ok('仅校验模式完成');
  process.exit(0);
}

// 2) 类型检查 + 测试
const run = (cmd) => {
  log(cmd);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
};

run('npm run type-check');

if (!args.has('--skip-tests')) {
  run('npm test');
} else {
  console.log('（已跳过测试）');
}

// 3) 构建当前平台产物
let buildCmd = 'npm run tauri:build';
if (args.has('--universal')) {
  if (process.platform !== 'darwin') {
    fail('--universal 仅适用于 macOS');
  }
  buildCmd += ' -- --target universal-apple-darwin';
}
run(buildCmd);

ok('本地构建完成，产物见 src-tauri/target/release/bundle/');
