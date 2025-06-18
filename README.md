# 🎬 FilmTrack

<div align="center">

![FilmTrack Logo](public/logo.png)

**个人影视管理平台 - 追踪您的观影足迹**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-orange)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3.x-green)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

[功能特性](#-功能特性) • [安装使用](#-安装使用) • [开发指南](#-开发指南) • [贡献指南](#-贡献指南) • [许可证](#-许可证)

</div>

## 📖 项目简介

FilmTrack 是一个基于 Tauri + Vue 3 开发的桌面应用程序，专为影视爱好者打造的个人影视管理平台。通过集成 TMDb API，为用户提供丰富的影视数据和优雅的管理体验。

### 🎯 设计理念

- **简洁优雅**：现代化的 UI 设计，流畅的交互体验
- **功能完整**：涵盖搜索、收藏、追踪、评分等核心功能
- **数据本地**：SQLite 本地数据库，保护隐私数据
- **跨平台**：基于 Tauri 框架，支持 Windows、macOS、Linux

## ✨ 功能特性

### 🔍 影视搜索与发现
- **TMDb 集成**：接入全球最大的影视数据库
- **智能搜索**：支持电影、电视剧模糊搜索
- **详细信息**：演员、导演、剧情、评分等完整信息
- **高清海报**：高质量的封面图片展示

### 📚 个人影视库
- **分类管理**：电影、电视剧分类浏览
- **状态追踪**：在看、已看、想看、暂停、弃坑
- **进度管理**：电视剧观看进度追踪
- **个人评分**：5星评分系统

### 📊 数据统计
- **观影统计**：总数、完成数、平均评分
- **时间轴**：观看历史时间线
- **数据可视化**：图表展示观影趋势

### ⚙️ 系统功能
- **托盘支持**：最小化到系统托盘
- **数据安全**：本地 SQLite 数据库
- **主题美化**：精美的渐变主题
- **响应式设计**：适配不同屏幕尺寸

## 🚀 安装使用

### 系统要求

- **操作系统**：Windows 10/11, macOS 10.15+, Linux
- **内存**：最少 4GB RAM
- **存储空间**：200MB 可用空间
- **网络**：需要互联网连接获取影视数据

### 下载安装

#### 方式一：下载发布版本（推荐）
1. 访问 [Releases 页面](https://github.com/yanstu/filmtrack/releases)
2. 下载适合您系统的安装包
3. 运行安装程序并按提示操作

#### 方式二：从源码构建
```bash
# 克隆仓库
git clone https://github.com/yanstu/filmtrack.git
cd filmtrack

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本
npm run tauri build
```

### 首次使用

1. **启动应用**：双击桌面图标或从开始菜单启动
2. **API 配置**：应用已预配置 TMDb API，开箱即用
3. **搜索影视**：点击"记录"开始搜索并添加您喜爱的影视作品
4. **数据管理**：在"库存"页面管理您的个人影视库

## 🛠 开发指南

### 技术栈

**前端框架**
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Vue Router](https://router.vuejs.org/) - Vue.js 官方路由

**UI 框架**
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [HeadlessUI](https://headlessui.com/) - 无样式组件库
- [Heroicons](https://heroicons.com/) - 精美的 SVG 图标

**桌面端**
- [Tauri](https://tauri.app/) - 现代桌面应用框架
- [Rust](https://www.rust-lang.org/) - 系统级编程语言

**数据管理**
- [SQLite](https://www.sqlite.org/) - 轻量级数据库
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库

**API 服务**
- [TMDb API](https://www.themoviedb.org/documentation/api) - 影视数据服务

### 开发环境设置

#### 前置要求
- Node.js 18+ 
- Rust 1.70+
- Git

#### 环境配置
```bash
# 1. 克隆项目
git clone https://github.com/yanstu/filmtrack.git
cd filmtrack

# 2. 安装前端依赖
npm install

# 3. 安装 Tauri CLI
npm install -g @tauri-apps/cli@latest

# 4. 运行开发服务器
npm run tauri dev
```

### 项目结构

```
filmtrack/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   │   ├── business/       # 业务组件
│   │   ├── common/         # 通用组件
│   │   └── ui/            # UI 组件
│   ├── views/             # 页面组件
│   ├── stores/            # Pinia 状态管理
│   ├── services/          # 业务服务
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── styles/            # 样式文件
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   ├── icons/             # 应用图标
│   └── capabilities/      # 权限配置
├── public/                # 静态资源
├── config/                # 配置文件
└── scripts/               # 脚本文件
```

### API 配置

项目使用 TMDb API 获取影视数据。API Key 已预配置，如需替换：

1. 在 [TMDb](https://www.themoviedb.org/settings/api) 申请 API Key
2. 修改 `config/app.config.ts` 中的 `tmdb.apiKey`

### 数据库

使用 SQLite 作为本地数据库，表结构：

- `movies` - 影视作品信息
- `settings` - 应用设置（未来版本）

### 构建发布

```bash
# 构建所有平台
npm run tauri build

# 构建指定平台
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## 🗺 下一步计划

### 🎯 近期计划 (v0.2.0)

- [ ] **豆瓣集成**：支持从豆瓣导入影视数据和评分
- [ ] **数据导入导出**：支持 CSV/JSON 格式的数据备份

### 🚀 中期计划 (v0.3.0)

- [ ] **多用户支持**：家庭成员独立账户管理
- [ ] **移动端应用**：iOS/Android 伴侣应用

### 🌟 长期愿景 (v1.0.0)

- [ ] **观影计划**：观影计划和提醒

## 🤝 贡献指南

我们欢迎各种形式的贡献！

### 贡献方式

- 🐛 **问题反馈**：提交 Bug 报告和功能建议
- 💻 **代码贡献**：提交代码改进和新功能
- 📝 **文档完善**：改进文档和教程
- 🌍 **国际化**：协助多语言翻译
- 🎨 **设计优化**：UI/UX 设计改进

### 开发流程

1. Fork 项目到您的 GitHub 账户
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 Composition API 最佳实践
- 使用 ESLint 和 Prettier 格式化代码
- 编写清晰的提交信息

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。