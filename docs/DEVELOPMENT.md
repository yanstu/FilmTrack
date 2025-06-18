# FilmTrack 开发文档

## 📋 项目概述

FilmTrack 是一个现代化的个人影视管理平台，基于 Tauri 2.0 + Vue 3 + TypeScript 构建。项目旨在为影视爱好者提供完整的观影记录管理解决方案，支持影视搜索、状态追踪、进度管理和数据统计等功能。

## 🚀 技术栈

### 前端技术
- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **路由**: Vue Router 4.x
- **状态管理**: Pinia 2.x
- **UI框架**: Tailwind CSS 3.x
- **组件库**: HeadlessUI 2.x
- **图标**: Lucide Vue Next
- **HTTP客户端**: 原生 fetch API

### 桌面端技术
- **框架**: Tauri 2.0
- **后端语言**: Rust 1.70+
- **数据库**: SQLite (tauri-plugin-sql)
- **权限系统**: Tauri Capabilities v2

### 外部服务
- **影视数据**: TMDb API v3
- **图片服务**: TMDb Image API

## ✨ 核心功能特性

### 🔍 智能搜索系统
- **模糊搜索**: 支持标题部分匹配和拼音首字母搜索
- **实时搜索**: 防抖机制优化的实时搜索建议
- **结果高亮**: 自动高亮匹配的搜索关键词
- **语义评分**: 基于匹配类型的智能排序算法

### 📚 影视库管理
- **无限滚动**: 性能优化的大数据列表展示
- **状态管理**: 5种观看状态(在看/已看/想看/暂停/弃坑)
- **进度追踪**: 电视剧集数和季度进度管理
- **分类筛选**: 支持类型、状态等多维度筛选

### 🎨 图片缓存系统
- **双层缓存**: 文件缓存 + 内存缓存
- **Blob URL**: 使用 blob URL 替代 asset 协议
- **离线支持**: 本地缓存支持离线浏览
- **性能优化**: 避免重复下载和转换

### 📊 数据统计分析
- **实时统计**: 观影数量、完成率、平均评分
- **时间轴视图**: 观看历史的时间线展示
- **趋势分析**: 月度和年度观影趋势

## 📁 项目架构

### 目录结构

```
src/
├── components/             # 组件目录
│   ├── ui/                # 通用UI组件
│   │   ├── CachedImage.vue       # 缓存图片组件
│   │   ├── HeadlessSelect.vue    # 下拉选择组件
│   │   ├── Modal.vue             # 模态框组件
│   │   ├── StarRating.vue        # 星级评分组件
│   │   └── EditRecordModal.vue   # 编辑记录模态框
│   ├── business/          # 业务组件
│   │   ├── MovieCard.vue         # 影视卡片组件
│   │   └── TMDbMovieCard.vue     # TMDb搜索结果卡片
│   └── common/            # 通用组件
│       ├── Navigation.vue        # 导航组件
│       ├── TitleBar.vue          # 自定义标题栏
│       ├── LoadingOverlay.vue    # 加载遮罩
│       └── ErrorToast.vue        # 错误提示
├── views/                 # 页面组件
│   ├── Home.vue           # 首页 - 统计展示
│   ├── Library.vue        # 影视库 - 主要管理页面
│   ├── Record.vue         # 添加记录 - TMDb搜索添加
│   ├── History.vue        # 观看历史 - 时间轴视图
│   └── Detail.vue         # 详情页 - 单个作品详情
├── stores/                # Pinia状态管理
│   └── movie.ts           # 影视数据状态管理
├── services/              # 服务层
│   ├── database.ts        # SQLite数据库服务
│   └── tmdb.ts           # TMDb API服务
├── composables/           # 组合式函数
│   └── useInfiniteScroll.ts # 无限滚动Hook
├── utils/                 # 工具函数
│   ├── api.ts            # API工具和TMDb集成
│   ├── constants.ts      # 常量和工具函数
│   ├── imageCache.ts     # 图片缓存系统
│   └── search.ts         # 模糊搜索算法
├── types/                 # 类型定义
│   ├── index.ts          # 基础数据类型
│   └── tmdb.ts           # TMDb API类型
├── router/                # 路由配置
│   └── index.ts          # Vue Router配置
└── styles/                # 样式文件
    └── main.css          # 全局样式
```

### 后端结构

```
src-tauri/
├── src/
│   ├── main.rs           # 主程序入口
│   ├── services.rs       # 后端服务实现
│   └── lib.rs           # 库文件
├── capabilities/         # 权限配置
│   └── main.json        # 主权限配置文件
├── icons/               # 应用图标
└── tauri.conf.json      # Tauri配置文件
```

## 🔧 核心算法实现

### 模糊搜索算法 (`src/utils/search.ts`)

```typescript
export interface SearchOptions {
  searchFields?: string[];     // 搜索字段
  enablePinyin?: boolean;      // 启用拼音搜索
  minLength?: number;          // 最小搜索长度
  maxResults?: number;         // 最大结果数
}

export interface SearchResult<T> {
  item: T;                     // 原始数据项
  score: number;               // 相关性评分
  matches: MatchInfo[];        // 匹配信息
}

// 主搜索函数
export function fuzzySearch<T>(
  items: T[],
  query: string,
  options: SearchOptions = {}
): SearchResult<T>[]

// 拼音首字母提取
export function getPinyinInitials(text: string): string

// 搜索结果高亮
export function highlightMatch(text: string, query: string): string
```

**评分算法**:
- 精确匹配: 100分
- 起始匹配: 90分
- 包含匹配: 70分
- 拼音匹配: 60分
- 首字母匹配: 50分

### 无限滚动实现 (`src/composables/useInfiniteScroll.ts`)

```typescript
export interface LoadFunction<T> {
  (page: number, pageSize: number): Promise<{
    data: T[];
    hasMore: boolean;
    total?: number;
  }>;
}

export function useInfiniteScroll<T>(
  loadFunction: LoadFunction<T>,
  options: InfiniteScrollOptions = {}
) {
  // 返回响应式状态和方法
  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    hasMore: computed(() => hasMore.value),
    error: computed(() => error.value),
    loadMore,
    refresh,
    scrollToTop
  };
}
```

**优化特性**:
- 防抖加载: 防止重复触发
- 错误重试: 支持加载失败重试
- 滚动恢复: 支持位置记忆
- 内存优化: 虚拟滚动(可选)

### 图片缓存系统 (`src/utils/imageCache.ts`)

```typescript
// 双层缓存架构
interface CacheStrategy {
  fileCache: Map<string, string>;    // 文件路径缓存
  memoryCache: Map<string, string>;  // Blob URL内存缓存
}

// 核心缓存函数
export async function getCachedImageUrl(url: string): Promise<string>

// 预加载图片
export async function prefetchImages(urls: string[]): Promise<void>

// 清理缓存
export function clearImageCache(): void
```

**缓存流程**:
1. 检查内存缓存 → 命中返回 blob URL
2. 检查文件缓存 → 读取文件生成 blob URL
3. 下载图片 → 保存文件 + 生成 blob URL
4. 缓存清理 → 定期清理过期缓存

## 🗄️ 数据库设计

### 表结构设计

```sql
-- 影视作品表
CREATE TABLE movies (
  id TEXT PRIMARY KEY,              -- UUID主键
  title TEXT NOT NULL,              -- 标题
  original_title TEXT,              -- 原始标题
  year INTEGER,                     -- 年份
  type TEXT NOT NULL,               -- 类型(movie/tv)
  tmdb_id INTEGER UNIQUE,           -- TMDb ID
  poster_path TEXT,                 -- 海报路径
  backdrop_path TEXT,               -- 背景图路径
  overview TEXT,                    -- 简介
  status TEXT NOT NULL DEFAULT 'watching', -- 观看状态
  personal_rating REAL,             -- 个人评分(1-5)
  tmdb_rating REAL,                 -- TMDb评分
  notes TEXT,                       -- 备注
  watch_source TEXT,                -- 观看渠道
  
  -- 电视剧特有字段
  current_episode INTEGER DEFAULT 1,  -- 当前集数
  current_season INTEGER DEFAULT 1,   -- 当前季数
  total_episodes INTEGER,             -- 总集数
  total_seasons INTEGER,              -- 总季数
  air_status TEXT,                    -- 播出状态
  
  -- 时间戳
  date_added TEXT DEFAULT (datetime('now')),
  date_updated TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 索引优化
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_type ON movies(type);
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_date_updated ON movies(date_updated);
```

### 数据访问层 (`src/services/database.ts`)

```typescript
// 数据库服务类
export class DatabaseService {
  static async connect(): Promise<Database>
  static async ensureTableStructure(): Promise<void>
  static async initialize(): Promise<void>
}

// 影视数据访问对象
export class MovieDAO {
  static async getMovies(status?: string, limit?: number, offset?: number)
  static async getMovieById(id: string)
  static async addMovie(movie: Partial<Movie>)
  static async updateMovie(movie: Movie)
  static async deleteMovie(movieId: string)
}

// 统计数据访问对象
export class StatisticsDAO {
  static async getStatistics(): Promise<Statistics>
}
```

## ⚙️ 配置管理

### 应用配置 (`config/app.config.ts`)

```typescript
export const APP_CONFIG = {
  app: {
    name: 'FilmTrack',
    version: '0.1.0',
    author: 'FilmTrack Team'
  },
  tmdb: {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p'
  },
  features: {
    watchStatus: {
      watching: '在看',
      completed: '已看',
      planned: '想看',
      paused: '暂停',
      dropped: '弃坑'
    },
    mediaTypes: {
      movie: '电影',
      tv: '电视剧'
    }
  }
};
```

### Tauri权限配置 (`src-tauri/capabilities/main.json`)

```json
{
  "$schema": "https://schema.tauri.app/config/2/capability",
  "identifier": "main-capability",
  "description": "Main application capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-minimize",
    "core:window:allow-hide", 
    "core:window:allow-show",
    "core:window:allow-close",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "opener:default"
  ]
}
```

## 🛠️ 开发指南

### 环境准备

```bash
# 系统要求
Node.js 18+
Rust 1.70+
Git

# 安装全局依赖
npm install -g @tauri-apps/cli@latest

# 克隆项目
git clone https://github.com/yanstu/filmtrack.git
cd filmtrack

# 安装依赖
cnpm install
# 或
yarn install
```

### 开发流程

```bash
# 启动开发服务器
npm run tauri dev

# 代码格式化
npm run lint
npm run format

# 类型检查
npm run type-check

# 构建生产版本
npm run tauri build
```

### 新功能开发

#### 1. 添加新的页面组件

```typescript
// 1. 创建页面组件 src/views/NewPage.vue
<template>
  <div class="new-page">
    <!-- 页面内容 -->
  </div>
</template>

<script setup lang="ts">
// 页面逻辑
</script>

// 2. 添加路由 src/router/index.ts
{
  path: '/new-page',
  name: 'NewPage',
  component: () => import('../views/NewPage.vue')
}

// 3. 添加导航 src/components/common/Navigation.vue
```

#### 2. 扩展数据库模型

```typescript
// 1. 修改类型定义 src/types/index.ts
export interface Movie {
  // 现有字段...
  newField: string;
}

// 2. 更新数据库结构 src/services/database.ts
const alterCommands = [
  'ALTER TABLE movies ADD COLUMN new_field TEXT'
];

// 3. 更新DAO方法
static async addMovie(movie: Partial<Movie>) {
  // 包含新字段的插入逻辑
}
```

#### 3. 集成新的API服务

```typescript
// 1. 定义API接口 src/services/newService.ts
export class NewService {
  static async fetchData(): Promise<ApiResponse<Data[]>> {
    // API调用逻辑
  }
}

// 2. 添加到主API导出 src/utils/api.ts
export { NewService } from '../services/newService';

// 3. 在组件中使用
import { NewService } from '@/utils/api';
```

### 代码规范

#### TypeScript规范
- 使用严格的类型检查
- 为所有公共接口定义类型
- 避免使用 `any` 类型
- 使用联合类型替代枚举

#### Vue组件规范
- 使用Composition API
- 单文件组件结构: `<template>` → `<script setup>` → `<style>`
- 组件命名使用PascalCase
- Props和Events使用TypeScript接口定义

#### 样式规范
- 优先使用Tailwind CSS工具类
- 避免全局样式污染
- 使用CSS变量定义主题色彩
- 响应式设计优先

#### 文件命名规范
- 组件文件: PascalCase (e.g., `MovieCard.vue`)
- 工具文件: camelCase (e.g., `imageCache.ts`)
- 页面文件: PascalCase (e.g., `Library.vue`)
- 类型文件: camelCase (e.g., `index.ts`)

## 🚀 部署指南

### 构建配置

```bash
# 开发构建
npm run tauri dev

# 生产构建
npm run tauri build

# 指定平台构建
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin  
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### 发布流程

1. **版本更新**: 更新 `package.json` 和 `tauri.conf.json` 中的版本号
2. **构建测试**: 在目标平台进行完整构建测试
3. **创建Release**: 使用GitHub Actions自动化发布流程

## 🔧 故障排除

### 常见问题解决

#### 数据库权限错误
```
错误: sql.execute not allowed
解决: 检查 src-tauri/capabilities/main.json 权限配置
确保包含: sql:allow-execute, sql:allow-select等权限
```

#### 图片加载失败
```
错误: 图片显示placeholder
原因: TMDb API访问受限或网络问题
解决: 检查网络连接，验证API密钥有效性
```

#### 构建失败
```
错误: Rust编译错误
解决: 更新Rust工具链，检查依赖版本兼容性
```

### 调试技巧

1. **前端调试**: 使用浏览器开发者工具
2. **后端调试**: 查看终端Rust日志输出
3. **数据库调试**: 检查SQLite查询和连接状态
4. **网络调试**: 使用Network面板监控API请求

## 📚 参考资源

### 官方文档
- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Vue 3 Documentation](https://vuejs.org/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### API文档  
- [TMDb API Documentation](https://developers.themoviedb.org/3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### 社区资源
- [Tauri Discord](https://discord.com/invite/tauri)
- [Vue.js Community](https://vuejs.org/guide/extras/ways-of-using-vue.html)