<template>
  <nav class="h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/50 w-24 flex flex-col">
    <!-- 导航菜单 -->
    <div class="flex-1 px-3 py-6 space-y-2">
      <router-link
        v-for="item in menuItems"
        :key="item.name"
        :to="item.route"
        class="nav-item block p-3 rounded-xl"
        :class="{ 'active': isActive(item.route) }"
      >
        <div class="nav-liquid-bg"></div>
        <div class="nav-item-content flex flex-col items-center space-y-1">
          <component :is="item.icon" :size="20" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </div>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  Home as HomeIcon,
  Film as FilmIcon,
  Plus as PlusIcon,
  History as HistoryIcon,
  Import as ImportIcon
} from 'lucide-vue-next';

const route = useRoute();

const menuItems = [
  {
    name: 'home',
    label: '首页',
    icon: HomeIcon,
    route: { name: 'Home' }
  },
      {
      name: 'library',
      label: '影视库',
      icon: FilmIcon,
      route: { name: 'Library' }
    },
  {
    name: 'record',
    label: '记录',
    icon: PlusIcon,
    route: { name: 'Record' }
  },
  {
    name: 'history',
    label: '历史',
    icon: HistoryIcon,
    route: { name: 'History' }
  },
  {
    name: 'import',
    label: '导入',
    icon: ImportIcon,
    route: { name: 'Import' }
  }
];

const isActive = (routeConfig: { name: string; path?: string }) => {
  return route.name === routeConfig.name;
};
</script>

<style scoped>
/* 局部仅保留导航容器特有规则；选中/悬停态样式统一在 main.css 的 .nav-item 链路里
   （macOS Sidebar 风：左侧蓝条 + 浅蓝底 + 蓝色文字）。 */
</style>