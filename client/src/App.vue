<template>
  <div class="relative h-[100dvh] overflow-hidden bg-paper text-ink">
    <button
      @click="mobileMenuOpen = !mobileMenuOpen"
      class="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-[0.8rem] border border-line-soft bg-surface text-ink lg:hidden"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
        <path v-if="!mobileMenuOpen" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
        <path v-else stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-30 bg-[color:var(--overlay)] lg:hidden"
      @click="mobileMenuOpen = false"
    />

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-40 w-72 p-3 transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div class="sidebar-shell">
        <div class="px-5 pb-4 pt-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="sidebar-brand-mark">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div class="min-w-0">
                <h1 class="text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--sidebar-ink)]">Mail Hub</h1>
              </div>
            </div>
            <span class="status-pill">ready</span>
          </div>
        </div>

        <nav class="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          <div class="app-sidebar-group">
            <p class="section-title px-3 pb-2 pt-1 !text-[color:var(--sidebar-muted)]">邮件工作区</p>
            <router-link
              v-for="item in mailNav"
              :key="item.to"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="navLinkClass(item.to)"
            >
              <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
              <span
                v-if="item.to === '/inbox' && stats.unread > 0"
                class="ml-auto rounded-[0.5rem] border border-[color:var(--sidebar-line)] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--sidebar-ink)]"
              >{{ stats.unread }}</span>
            </router-link>
          </div>

          <div class="app-sidebar-group">
            <p class="section-title px-3 pb-2 pt-1 !text-[color:var(--sidebar-muted)]">自动化与分拣</p>
            <router-link
              v-for="item in categoryNav"
              :key="item.to"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="navLinkClass(item.to)"
            >
              <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
            </router-link>
          </div>

          <div class="app-sidebar-group">
            <p class="section-title px-3 pb-2 pt-1 !text-[color:var(--sidebar-muted)]">系统</p>
            <router-link
              v-for="item in systemNav"
              :key="item.to"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="navLinkClass(item.to)"
            >
              <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </nav>

        <div class="px-4 pb-4">
          <div class="sidebar-footer-panel">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <p class="section-title !text-[color:var(--sidebar-muted)]">今日状态</p>
                <div class="sidebar-footer-grid mt-3">
                  <div class="sidebar-stat">
                    <p class="sidebar-stat-label">total</p>
                    <p class="sidebar-stat-value">{{ stats.total }}</p>
                  </div>
                  <div class="sidebar-stat">
                    <p class="sidebar-stat-label">unread</p>
                    <p class="sidebar-stat-value">{{ stats.unread }}</p>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-center gap-2">
                <CodeHistoryPanel ref="codePanelRef" />
                <button
                  @click="toggleDark"
                  class="theme-toggle"
                  :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
                >
                  <svg v-if="isDark" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="h-[100dvh] overflow-hidden lg:ml-72">
      <div class="h-full p-3 lg:p-3.5 lg:pl-0">
        <div class="surface-panel h-full overflow-hidden">
          <router-view />
        </div>
      </div>
    </main>

    <DialogBox ref="dialogRef" />

    <CodeToast
      v-if="currentToast"
      :key="currentToast.id"
      :id="currentToast.id"
      :code="currentToast.code"
      :confidence="currentToast.confidence"
      :from-name="currentToast.from_name"
      :from-address="currentToast.from_address"
      :account-name="currentToast.account_name"
      :detected-at="currentToast.detected_at"
      @dismiss="onToastDismiss"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { emailsApi } from '@/api';
import { setDialogRef } from '@/composables/useDialog';
import { useSSE } from '@/composables/useSSE';
import { useDarkMode } from '@/composables/useDarkMode';
import DialogBox from '@/components/DialogBox.vue';
import CodeToast from '@/components/CodeToast.vue';
import CodeHistoryPanel from '@/components/CodeHistoryPanel.vue';

const dialogRef = ref(null);
onMounted(() => {
  if (dialogRef.value) setDialogRef(dialogRef.value);
});

const route = useRoute();
const mobileMenuOpen = ref(false);

const { isDark, toggle: toggleDark, init: initDark } = useDarkMode();

const sse = useSSE();
const currentToast = ref(null);
const codePanelRef = ref(null);

onMounted(() => {
  initDark();
  sse.connect();
  sse.on('code_detected', (data) => {
    currentToast.value = data;
    if (codePanelRef.value) {
      codePanelRef.value.addRecord(data);
    }
  });
});

function onToastDismiss() {
  currentToast.value = null;
}

const stats = ref({
  total: 0,
  unread: 0,
});

const mailNav = [
  { to: '/inbox', label: '收件箱', icon: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z' },
  { to: '/compose', label: '写邮件', icon: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' },
  { to: '/sent', label: '已发送', icon: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5' },
];

const categoryNav = [
  { to: '/rules', label: '规则管理', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
  { to: '/tags', label: '标签管理', icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z' },
  { to: '/calendar', label: '日程表', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
];

const systemNav = [
  { to: '/accounts', label: '邮箱账号', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { to: '/favorites', label: '账号收藏夹', icon: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z' },
  { to: '/settings', label: '设置', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const isActive = (path) => route.path === path || route.path.startsWith(path + '/');

const navLinkClass = (path) => [
  'app-sidebar-link',
  isActive(path) ? 'is-active' : '',
];

let refreshTimer = null;

const refreshStats = async () => {
  try {
    const result = await emailsApi.stats();
    if (result.success) {
      stats.value = result.data;
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};

onMounted(() => {
  refreshStats();
  refreshTimer = setInterval(refreshStats, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

defineExpose({ refreshStats });
</script>
