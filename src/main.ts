/**
 * FilmTrack 应用入口文件
 * @author yanstu
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';

// 创建Pinia实例
const pinia = createPinia();

// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(router);
app.use(pinia);

// 挂载应用
app.mount('#app');
