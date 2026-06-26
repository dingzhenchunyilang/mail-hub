/**
 * 暗色模式 composable
 * - localStorage 持久化
 * - 自动跟随系统 prefers-color-scheme
 * - 切换时加过渡动画 class 防闪烁
 */
import { ref, watch, onMounted } from 'vue';

const STORAGE_KEY = 'mail-hub-theme';

// 全局共享状态（多个组件 import 同一个 ref）
const isDark = ref(false);

export function useDarkMode() {
  function applyTheme(dark) {
    const html = document.documentElement;
    // 加过渡 class
    html.classList.add('transitioning');
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    // 250ms 后移除过渡 class（与 CSS transition 时长一致）
    setTimeout(() => html.classList.remove('transitioning'), 280);
  }

  function toggle() {
    isDark.value = !isDark.value;
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light');
    applyTheme(isDark.value);
  }

  function setTheme(mode) {
    // mode: 'light' | 'dark' | 'system'
    if (mode === 'system') {
      localStorage.removeItem(STORAGE_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark.value = prefersDark;
    } else {
      isDark.value = mode === 'dark';
      localStorage.setItem(STORAGE_KEY, mode);
    }
    applyTheme(isDark.value);
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
      isDark.value = true;
    } else if (saved === 'light') {
      isDark.value = false;
    } else {
      // 无存储 → 跟随系统
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme(isDark.value);

    // 监听系统主题变化（仅在用户未手动选择时生效）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        isDark.value = e.matches;
        applyTheme(isDark.value);
      }
    });
  }

  return { isDark, toggle, setTheme, init };
}
