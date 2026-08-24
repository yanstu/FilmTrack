

# 🎬 FilmTrackPro · 影迹

<div align="center">

![FilmTrackPro Logo](public/logo.png)

**个人影视管理平台 · 追踪你的观影足迹，记录每一段美好时光**

[![Release](https://img.shields.io/github/v/release/yanstu/FilmTrack?display_name=tag&sort=semver&color=2563eb)](https://github.com/yanstu/FilmTrack/releases)
[![Downloads](https://img.shields.io/github/downloads/yanstu/FilmTrack/total?color=10b981)](https://github.com/yanstu/FilmTrack/releases)
[![Build](https://github.com/yanstu/FilmTrack/actions/workflows/release.yml/badge.svg)](https://github.com/yanstu/FilmTrack/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[![Tauri](https://img.shields.io/badge/Tauri-2.x-orange)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3.x-green)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

[功能特性](#-功能概览) · [下载安装](#-下载安装) · [界面预览](#-界面预览) · [从源码构建](#-从源码构建) · [开发指南](#-开发指南)

</div>

## 📖 项目简介

FilmTrackPro（影迹）是一个基于 **Tauri 2 + Vue 3** 的跨平台桌面应用，专为影视爱好者打造的个人观影进度管理平台。

它解决多平台观影的几个核心痛点：进度难以统一、常常忘记看到哪一集、观看源零散难找。影迹帮你精确记录每部作品的观看进度、片源、评分和笔记，还能在应用内直接匹配片源、切换线路在线观看，成为你观影路上的好帮手。

数据全部保存在本地 SQLite，不依赖云端账号，干净、私密、随手可备份。

## ✨ 功能概览

### 🎞️ 影视记录

- 通过 TMDb 搜索电影 / 剧集，自动补齐封面、简介、演员、导演、评分等信息
- 支持 `在看 / 已看 / 想看 / 暂停 / 弃坑` 等常用状态
- 记录个人评分、观看日期、观看平台、备注和短评
- 支持批量删除、标题搜索与影视库分类浏览

### 📺 剧集进度

- 电视剧季集管理，记录当前季、当前集和总集数
- 详情页一键标记下一集，跨季时自动进入下一季
- 多季剧同时维护当前季进度与累计观看进度
- 支持重刷记录，历史页按真实观看日期分组展示

### 🌐 在线播放（重点）

- 详情页内置在线播放：自动为作品匹配可用片源，整理出可播放的线路与剧集
- 支持手动切换片源 / 线路；当前线路失败时自动回退到下一条线路或片源，形成闭环
- 自动记忆并续播上次进度；设置里可配置默认片单、匹配策略与优先线路（设置只管默认，按影片在详情页切换）

### 🏠 首页与历史

- 首页提供总量、完成数、平均评分、本月观看、年度观看等统计
- 首页自动整理「观影待办」和未来 7 天的更新提醒
- 历史页提供时间轴浏览，可按关键词、状态、类型和日期范围筛选
- 历史页顶部「观看活跃度热力图」一眼看清近一年的观看分布，**悬停查看当天日期与观看的作品**
- 历史展示优先使用真实观看时间，避免导入记录被错误归到当天

### 📥 数据导入导出

- 支持从豆瓣导入个人条目，保留评分、观看时间、短评以及季数信息
- 导入时尽量匹配 TMDb，补齐海报、简介和季集资料
- 豆瓣导入跨页面保留进度和日志，切换页面后返回仍能继续查看
- 支持 `CSV / JSON` 导出与恢复，便于备份本地数据

### 🖥️ 桌面体验

- 本地 SQLite 数据库保存数据，不依赖云端服务
- 图片缓存、数据库空间查看与缓存清理
- 最小化到系统托盘、窗口尺寸记忆、手动检查更新
- 全应用响应式适配（窗口 800px → 超宽都从容）
- 匿名使用统计可选开启，仅用于统计应用启动等匿名事件

## ⬇️ 下载安装

前往 **[Releases 页面](https://github.com/yanstu/FilmTrack/releases)** 下载最新版本：

| 平台 | 安装包 | 说明 |
| --- | --- | --- |
| 🍎 macOS | `FilmTrackPro_x.y.z_universal.dmg` | universal 通用包，Intel 与 Apple Silicon 均可 |
| 🪟 Windows | `FilmTrackPro_x.y.z_x64-setup.exe` / `_x64_en-US.msi` | 任选其一，x64 |

### 安装与首启（重要）

应用目前**未做代码签名**，首次启动可能被系统安全机制拦截，按下面方式放行即可（一次即可，之后正常打开）：

- **macOS**：若提示「已损坏」或「无法验证开发者」，在终端执行
  ```bash
  xattr -dr com.apple.quarantine /Applications/FilmTrackPro.app
  ```
  或在「访达」中右键应用 → 打开 → 再次确认打开。
- **Windows**：若出现「Windows 已保护你的电脑」(SmartScreen)，点击 **更多信息 → 仍要运行**。

## 📸 界面预览

<div align="center">

### 🏠 首页
![主页界面](screenshot/home.png)
*首页集中展示统计卡片、观影待办、更新提醒和正在追剧列表。*

### 📚 个人影视库
![影视库界面](screenshot/library.png)
*影视库支持按类型和状态浏览，也支持搜索和批量管理。*

### 📝 添加记录
![添加记录界面](screenshot/add_record.png)
*智能搜索与详细信息录入，支持 TMDb 数据自动填充。*

### 🌐 豆瓣导入
![豆瓣导入界面](screenshot/douban_import.png)
*一键导入豆瓣观影记录，智能匹配 TMDb 数据并保留个人评分。*

### 🎬 作品详情页
![作品详情页](screenshot/detail.png)
*详情页集中展示作品信息、季集进度、在线播放、重刷记录和继续观看入口。*

### 📊 观影历史
![历史界面](screenshot/history.png)
*历史页按时间轴回看观影足迹，顶部热力图概览近一年活跃度，并支持检索筛选。*

</div>

## 🚀 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 (Composition API) · TypeScript · Tailwind CSS · Pinia · Vite |
| 桌面端 | Tauri 2 · Rust |
| 数据 | SQLite（`tauri-plugin-sql`） |
| 数据源 | TMDb API |

## 🛠 从源码构建

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18（[npm](https://www.npmjs.com/) ≥ 8）
- [Rust](https://www.rust-lang.org/tools/install)（stable）
- Tauri 2 各平台系统依赖参见 [官方前置条件](https://tauri.app/start/prerequisites/)

### 步骤

```bash
# 克隆仓库
git clone https://github.com/yanstu/FilmTrack.git
cd FilmTrack

# 安装依赖
npm install

# 开发模式运行
npm run tauri:dev

# 构建当前平台安装包
npm run tauri:build
```

### 本地出包脚本

仓库内置 `scripts/release.mjs`，在构建前自动校验版本一致性并跑测试：

```bash
npm run release:check          # 仅校验 tauri.conf.json 与 Cargo.toml 版本一致
npm run release:local          # 校验 + 类型检查 + 测试 + 构建当前平台
npm run release:mac-universal  # macOS 构建 universal 通用包
```

> 跨平台安装包（Intel mac / Windows）由 GitHub Actions 统一产出，本地脚本只构建当前操作系统的产物。

## 📦 发布流程（维护者）

发布完全自动化，由 [`.github/workflows/release.yml`](.github/workflows/release.yml) 驱动：

1. 升级版本号：同时修改 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml`（保持一致，可用 `npm run release:check` 校验）。
2. 提交改动并打标签推送：
   ```bash
   git commit -am "release: v0.5.1"
   git tag v0.5.1
   git push origin pro --tags
   ```
3. 工作流自动在 **macOS + Windows** runner 上构建，并把安装包发布到一个 **Release 草稿**。
4. 到 [Releases](https://github.com/yanstu/FilmTrack/releases) 检查产物、补充更新说明后点击 **Publish** 即可。

> 也可在 Actions 页面手动触发（workflow_dispatch）。安装包未签名，无需任何签名证书密钥。

## 💻 开发指南

### 项目结构

```
FilmTrack/
├── .github/workflows/      # CI：发布工作流（release.yml）
├── scripts/                # 本地出包/校验脚本
├── src/                    # 前端源码
│   ├── components/         # Vue 组件（business / common / ui）
│   ├── views/              # 页面组件
│   ├── stores/             # Pinia 状态管理
│   ├── services/           # 业务服务（数据库 / TMDb / 播放源 / 更新）
│   ├── utils/              # 工具函数
│   ├── composables/        # 组合式函数
│   └── types/              # TypeScript 类型定义
├── src-tauri/              # Tauri 后端
│   ├── src/                # Rust 源码
│   ├── capabilities/       # 权限配置
│   └── icons/              # 应用图标
├── config/                 # 应用配置
└── tests/                  # 单元/契约测试
```

### 常用命令

```bash
npm run type-check   # 类型检查
npm test             # 运行单元/契约测试
npm run lint         # 运行 ESLint
npm run format       # Prettier 格式化
```

## 🙏 致谢

感谢以下项目和服务：

- [TMDb](https://www.themoviedb.org/) — 提供优质的影视数据 API
- [Tauri](https://tauri.app/) — 现代化的桌面应用框架
- [Vue.js](https://vuejs.org/) — 渐进式 JavaScript 框架
- [Tailwind CSS](https://tailwindcss.com/) — 实用优先的 CSS 框架

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。
