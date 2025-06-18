# 开发文档

本文档为 FilmTrack 项目的技术开发文档，包含架构设计、API 接口、数据库结构等详细信息。

## 🏗 架构设计

### 总体架构

FilmTrack 采用前后端分离的桌面应用架构：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (Vue 3)   │    │  后端 (Tauri)   │    │  数据库 (SQLite) │
│                 │    │                 │    │                 │
│ - 用户界面      │◄──►│ - 系统 API      │◄──►│ - 影视数据      │
│ - 状态管理      │    │ - 窗口管理      │    │ - 用户设置      │
│ - 路由管理      │    │ - 托盘功能      │    │ - 观看记录      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │
          └───────────────────────┼─────────────────────────┐
                                  │                         │
                     ┌─────────────────┐      ┌─────────────────┐
                     │  TMDb API       │      │  本地文件系统   │
                     │                 │      │                 │
                     │ - 影视信息      │      │ - 图片缓存      │
                     │ - 图片资源      │      │ - 日志文件      │
                     └─────────────────┘      └─────────────────┘
```

### 技术栈详解

#### 前端技术栈
- **Vue 3**: 采用 Composition API，提供响应式数据和组件化开发
- **TypeScript**: 提供类型安全，减少运行时错误
- **Vite**: 快速的构建工具和开发服务器
- **Vue Router**: 前端路由管理
- **Pinia**: 现代化的状态管理库
- **Tailwind CSS**: 实用优先的 CSS 框架
- **HeadlessUI**: 无样式的可访问性组件库

#### 后端技术栈
- **Tauri**: 基于 Rust 的跨平台桌面应用框架
- **Rust**: 系统级编程语言，提供内存安全和高性能
- **SQLite**: 轻量级的嵌入式数据库
- **Serde**: Rust 序列化/反序列化框架

## 📁 项目结构详解

### 前端结构 (`src/`)

```
src/
├── components/           # Vue 组件
│   ├── business/         # 业务逻辑组件
│   │   ├── MovieCard.vue       # 电影卡片组件
│   │   └── TMDbMovieCard.vue   # TMDb 搜索结果卡片
│   ├── common/           # 通用组件
│   │   ├── TitleBar.vue        # 自定义标题栏
│   │   ├── Navigation.vue      # 侧边导航
│   │   ├── LoadingOverlay.vue  # 加载遮罩
│   │   └── ErrorToast.vue      # 错误提示
│   └── ui/               # UI 组件库
│       ├── Modal.vue           # 模态框组件
│       ├── HeadlessSelect.vue  # 下拉选择组件
│       └── SettingsModal.vue   # 设置模态框
├── views/                # 页面组件
│   ├── Home.vue          # 首页 - 数据统计
│   ├── Library.vue       # 库存 - 影视库管理
│   ├── Record.vue        # 记录 - 添加新影视
│   ├── History.vue       # 历史 - 观看历史
│   └── Detail.vue        # 详情 - 影视详情页
├── stores/               # Pinia 状态管理
│   └── movie.ts          # 影视数据状态管理
├── services/             # 业务服务层
│   └── database.ts       # 数据库服务
├── types/                # TypeScript 类型定义
│   ├── index.ts          # 基础类型定义
│   └── tmdb.ts           # TMDb API 类型定义
├── utils/                # 工具函数
│   ├── api.ts            # API 请求封装
│   ├── constants.ts      # 常量定义
│   └── modal.ts          # 模态框工具
├── styles/               # 样式文件
│   └── main.css          # 全局样式
└── main.ts               # 应用入口
```

### 后端结构 (`src-tauri/`)

```
src-tauri/
├── src/
│   └── main.rs           # Rust 主入口
├── capabilities/         # Tauri 权限配置
│   └── main.json         # 主要权限定义
├── icons/                # 应用图标
└── Cargo.toml            # Rust 依赖配置
```

## 🗄 数据库设计

### 数据库表结构

#### movies 表
```sql
CREATE TABLE movies (
    id TEXT PRIMARY KEY,              -- 唯一标识符
    tmdb_id INTEGER,                  -- TMDb ID
    title TEXT NOT NULL,              -- 标题
    original_title TEXT,              -- 原始标题
    overview TEXT,                    -- 简介
    poster_path TEXT,                 -- 海报路径
    backdrop_path TEXT,               -- 背景图路径
    release_date TEXT,                -- 发布日期
    vote_average REAL,                -- TMDb 评分
    vote_count INTEGER,               -- 投票数量
    popularity REAL,                  -- 热度
    type TEXT NOT NULL,               -- 类型 (movie/tv)
    year INTEGER,                     -- 年份
    runtime INTEGER,                  -- 时长（分钟）
    total_episodes INTEGER,           -- 总集数（电视剧）
    current_episode INTEGER,          -- 当前集数
    status TEXT NOT NULL DEFAULT 'watching',  -- 观看状态
    personal_rating REAL,             -- 个人评分 (0-5)
    notes TEXT,                       -- 个人笔记
    air_status TEXT,                  -- 播出状态
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);
```

### 观看状态枚举
- `watching`: 在看
- `completed`: 已看
- `planned`: 想看
- `paused`: 暂停
- `dropped`: 弃坑

### 播出状态枚举
- `airing`: 正在播出
- `ended`: 已完结
- `cancelled`: 已取消
- `planned`: 计划中

## 🔌 API 接口

### TMDb API 集成

#### 配置信息
```typescript
// config/app.config.ts
export const APP_CONFIG = {
  tmdb: {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    imageSizes: {
      poster: 'w500',
      backdrop: 'w1280'
    }
  }
}
```

#### 主要接口

**搜索电影**
```typescript
GET /search/movie?query={query}&page={page}
```

**搜索电视剧**
```typescript
GET /search/tv?query={query}&page={page}
```

**获取电影详情**
```typescript
GET /movie/{movie_id}?append_to_response=credits,videos,images
```

**获取电视剧详情**
```typescript
GET /tv/{tv_id}?append_to_response=credits,videos,images
```

### 本地数据库 API

#### 数据库服务 (`services/database.ts`)

**添加影视作品**
```typescript
async function addMovie(movie: Partial<Movie>): Promise<void>
```

**获取所有影视作品**
```typescript
async function getMovies(): Promise<Movie[]>
```

**更新影视作品**
```typescript
async function updateMovie(id: string, updates: Partial<Movie>): Promise<void>
```

**删除影视作品**
```typescript
async function deleteMovie(id: string): Promise<void>
```

**获取统计数据**
```typescript
async function getStats(): Promise<{
  total: number;
  completed: number;
  avgRating: number;
}>
```

## 🎯 状态管理

### Pinia Store (`stores/movie.ts`)

```typescript
export const useMovieStore = defineStore('movie', () => {
  // 状态
  const movies = ref<Movie[]>([]);
  const loading = ref(false);
  const error = ref<string>('');

  // 计算属性
  const moviesByStatus = computed(() => {
    return movies.value.reduce((acc, movie) => {
      const status = movie.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(movie);
      return acc;
    }, {} as Record<string, Movie[]>);
  });

  // 方法
  const fetchMovies = async () => {
    // 获取数据逻辑
  };

  const addMovie = async (movie: Partial<Movie>) => {
    // 添加数据逻辑
  };

  return {
    movies,
    loading,
    error,
    moviesByStatus,
    fetchMovies,
    addMovie
  };
});
```

## 🎨 UI 组件设计

### 设计原则
- **一致性**: 统一的设计语言和交互模式
- **可访问性**: 支持键盘导航和屏幕阅读器
- **响应式**: 适配不同屏幕尺寸
- **性能**: 虚拟化大列表，懒加载图片

### 主题系统
```css
/* 颜色变量 */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
}

/* 渐变背景 */
.gradient-bg {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
}
```

### 组件规范

#### 基础组件
- **按钮**: 主要、次要、危险操作样式
- **表单**: 输入框、选择器、开关
- **反馈**: 提示、加载、错误状态
- **导航**: 面包屑、分页、标签页

#### 业务组件
- **电影卡片**: 统一的卡片样式和交互
- **搜索框**: 支持防抖和历史记录
- **评分组件**: 星级评分交互
- **进度条**: 观看进度显示

## 🔧 工具函数

### API 请求封装 (`utils/api.ts`)
```typescript
// TMDb API 客户端
export const tmdbAPI = {
  search: {
    movie: (query: string, page = 1) => axios.get(`/search/movie`, { params: { query, page } }),
    tv: (query: string, page = 1) => axios.get(`/search/tv`, { params: { query, page } })
  },
  movie: {
    details: (id: number) => axios.get(`/movie/${id}?append_to_response=credits,videos,images`)
  },
  tv: {
    details: (id: number) => axios.get(`/tv/${id}?append_to_response=credits,videos,images`)
  }
};
```

### 常量定义 (`utils/constants.ts`)
```typescript
// 评分格式化
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

// 时间格式化
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

// 图片 URL 生成
export const getImageURL = (path: string, size = 'w500'): string => {
  if (!path) return '/placeholder-poster.jpg';
  return `${APP_CONFIG.tmdb.imageBaseUrl}/${size}${path}`;
};
```

## 📱 响应式设计

### 断点系统
```css
/* Tailwind CSS 断点 */
sm: 640px   /* 小屏幕 */
md: 768px   /* 中等屏幕 */
lg: 1024px  /* 大屏幕 */
xl: 1280px  /* 超大屏幕 */
2xl: 1536px /* 超超大屏幕 */
```

### 自适应策略
- **导航**: 大屏侧边栏，小屏底部标签栏
- **网格**: 响应式网格布局
- **图片**: 自适应图片尺寸
- **文字**: 可缩放的字体大小

## 🔐 安全考虑

### 数据安全
- **本地存储**: 所有数据存储在本地 SQLite 数据库
- **API 密钥**: TMDb API 密钥在客户端，考虑后续服务端代理
- **输入验证**: 所有用户输入进行验证和清理

### 权限管理
- **文件系统**: 仅访问应用数据目录
- **网络请求**: 仅允许 TMDb API 请求
- **系统集成**: 最小化系统权限

## 🚀 性能优化

### 前端优化
- **代码分割**: 路由级别的代码分割
- **图片优化**: WebP 格式，懒加载
- **虚拟滚动**: 大列表性能优化
- **缓存策略**: HTTP 缓存和本地缓存

### 数据库优化
- **索引**: 关键字段建立索引
- **查询优化**: 避免 N+1 查询
- **批量操作**: 大量数据批量处理

## 🧪 测试策略

### 单元测试
- **工具函数**: 覆盖所有工具函数
- **组件逻辑**: 组件核心逻辑测试
- **状态管理**: Store 状态变更测试

### 集成测试
- **API 集成**: TMDb API 集成测试
- **数据库**: 数据库操作测试
- **端到端**: 关键用户流程测试

### 测试工具
- **Vitest**: 单元测试框架
- **Vue Test Utils**: Vue 组件测试
- **Playwright**: 端到端测试（计划中）

## 📦 构建部署

### 开发环境
```bash
# 启动开发服务器
npm run tauri:dev

# 热重载前端
npm run dev
```

### 生产构建
```bash
# 类型检查
npm run type-check

# 构建应用
npm run tauri:build
```

### 发布流程
1. **版本更新**: 更新 package.json 和 Cargo.toml 版本号
2. **代码检查**: 运行 lint 和类型检查
3. **构建测试**: 本地构建验证
4. **创建标签**: Git 标签和发布说明
5. **自动构建**: GitHub Actions 自动构建多平台版本