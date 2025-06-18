/**
 * FilmTrack 应用入口文件
 * @author yanstu
 */

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/main.css';

// 导入页面组件
import Home from './views/Home.vue';
import Library from './views/Library.vue';
import Record from './views/Record.vue';
import History from './views/History.vue';
import Detail from './views/Detail.vue';

// 路由配置
const routes = [
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

// 创建Pinia实例
const pinia = createPinia();

// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(router);
app.use(pinia);

// 挂载应用
app.mount('#app');
