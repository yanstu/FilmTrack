<!-- 此文件已被模块化重构，请使用src/views/Import/index.vue -->
<script setup lang="ts">
// 重定向到新的模块化组件
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  router.replace('/import');
});
</script>
