/**
 * FilmTrack 路由配置
 * @author yanstu
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// 导入页面组件
import Home from '../views/Home.vue';
import Library from '../views/Library.vue';
import Record from '../views/Record.vue';
import History from '../views/History.vue';
import Detail from '../views/Detail.vue';
import Import from '../views/Import/index.vue';

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/library',
    name: 'Library', 
    component: Library,
    meta: { title: '影视库' }
  },
  {
    path: '/record',
    name: 'Record',
    component: Record,
    meta: { title: '记录' }
  },
  {
    path: '/history',
    name: 'History',
    component: History,
    meta: { title: '历史' }
  },
  {
    path: '/detail/:id',
    name: 'Detail',
    component: Detail,
    props: true,
    meta: { title: '详情' }
  },
  {
    path: '/import',
    name: 'Import',
    component: Import,
    meta: { title: '数据导入导出' }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - FilmTrack`;
  }
  next();
});

export default router; 