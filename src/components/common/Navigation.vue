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
.nav-item {
  position: relative;
  overflow: hidden;
}

/* 液态动画效果 */
.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease-out;
}

.nav-item:hover::before {
  left: 100%;
}

/* 选中状态的特殊效果 */
.nav-item.router-link-active {
  position: relative;
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  border-radius: 0.5rem;
  pointer-events: none;
}

/* 悬停时的微妙发光效果 */
.nav-item:hover {
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
}

/* 自定义滚动条 */
.navigation-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.navigation-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.navigation-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
}

.navigation-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>