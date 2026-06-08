/**
 * FilmTrackPro 路由配置
 * @author yanstu
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// 导入页面组件
const Home = () => import('../views/Home.vue');
const Library = () => import('../views/Library/index.vue');
const Record = () => import('../views/Record/index.vue');
const History = () => import('../views/History.vue');
const Detail = () => import('../views/Detail/index.vue');
const Import = () => import('../views/Import/index.vue');

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
  },
  {
    path: '/Record',
    redirect: '/record'
  },
  {
    path: '/Detail/:id',
    redirect: (to) => `/detail/${to.params.id}`
  },
  {
    path: '/Import',
    redirect: '/import'
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
    document.title = `${to.meta.title} - FilmTrackPro`;
  }
  next();
});

export default router; 
