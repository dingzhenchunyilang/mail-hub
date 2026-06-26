<template>
  <!-- 触发图标 (放在侧边栏底部) -->
  <div>
    <button
      @click="panelOpen = !panelOpen"
      class="code-trigger"
      :class="{ 'code-trigger--active': panelOpen, 'code-trigger--has-new': hasRecent }"
      title="验证码记录"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
      <span v-if="unreadCount > 0" class="code-trigger__badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <!-- 面板 -->
    <Transition name="panel">
      <div v-if="panelOpen" class="code-panel card">
        <!-- 头部 -->
        <div class="code-panel__header">
          <h3 class="code-panel__title">验证码记录</h3>
          <button @click="panelOpen = false" class="code-panel__close">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 内容 -->
        <div class="code-panel__body">
          <div v-if="loading" class="code-panel__empty">
            <div class="spinner mx-auto" />
          </div>

          <div v-else-if="records.length === 0" class="code-panel__empty">
            <svg class="w-10 h-10 text-line-soft mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p class="text-xs text-ink-faint text-center">暂无检测记录</p>
          </div>

          <div v-else class="divide-y divide-line-soft">
            <div
              v-for="record in records"
              :key="record.id"
              class="code-panel__item group"
            >
              <!-- 验证码 + 复制按钮 -->
              <div class="code-panel__item-row">
                <span class="code-panel__code" @click="copyCode(record)">{{ record.code }}</span>
                <div class="flex items-center space-x-1">
                  <button
                    @click="copyCode(record)"
                    class="code-panel__action-btn"
                    :title="record._copied ? '已复制' : '复制'"
                  >
                    <svg v-if="!record._copied" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 text-stamp-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button
                    @click="dismissRecord(record)"
                    class="code-panel__action-btn opacity-0 group-hover:opacity-100"
                    title="这不是验证码"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 来源 -->
              <div class="code-panel__item-meta">
                <span>{{ record.from_name || record.from_address }}</span>
                <span class="font-mono text-[10px]">{{ formatTime(record.detected_at) }}</span>
              </div>
              <div v-if="record.subject" class="code-panel__item-subject truncate text-[10px]">
                {{ record.subject }}
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div v-if="records.length > 0" class="code-panel__footer">
          <span class="text-[10px] font-mono text-ink-faint">最近 {{ records.length }} 条</span>
          <button @click="loadRecords" class="text-[10px] text-ink-faint hover:text-ink">刷新</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { codesApi } from '@/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const panelOpen = ref(false);
const loading = ref(false);
const records = ref([]);
const unreadCount = ref(0);
const hasRecent = ref(false);

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).fromNow();
};

async function loadRecords() {
  loading.value = true;
  try {
    const result = await codesApi.list({ limit: 10 });
    if (result.success) {
      records.value = result.data.map(r => ({ ...r, _copied: false }));
      // 5分钟内有新记录 → 标记为有新消息
      const recent = result.data.filter(r =>
        Date.now() - new Date(r.detected_at).getTime() < 5 * 60 * 1000
      );
      hasRecent.value = recent.length > 0;
      unreadCount.value = recent.length;
    }
  } catch (e) {
    console.error('[CodePanel] Load error:', e);
  } finally {
    loading.value = false;
  }
}

async function copyCode(record) {
  try {
    await navigator.clipboard.writeText(record.code);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = record.code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  record._copied = true;
  setTimeout(() => { record._copied = false; }, 1500);
}

async function dismissRecord(record) {
  try {
    await codesApi.dismiss(record.id);
    records.value = records.value.filter(r => r.id !== record.id);
    if (unreadCount.value > 0) unreadCount.value--;
  } catch (e) {
    console.error('[CodePanel] Dismiss error:', e);
  }
}

// 暴露方法给父组件
defineExpose({ loadRecords, addRecord });

function addRecord(record) {
  records.value.unshift({ ...record, _copied: false });
  if (records.value.length > 10) records.value.pop();
  hasRecent.value = true;
  unreadCount.value++;
}

onMounted(loadRecords);
</script>

<style scoped>
.code-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  color: var(--ink-faint, #8C8878);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.code-trigger:hover {
  color: var(--ink, #1A1A1A);
  background: var(--paper-dim, #F0EFEA);
  border-color: var(--line-soft, #D9D6CC);
}
.code-trigger--active {
  color: var(--ink, #1A1A1A);
  background: var(--paper-dim, #F0EFEA);
  border-color: var(--ink, #1A1A1A);
}
.code-trigger--has-new { color: var(--stamp-red, #C1432E); }

.code-trigger__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 14px;
  height: 14px;
  font-size: 9px;
  font-weight: 600;
  font-family: 'IBM Plex Mono', monospace;
  background: var(--stamp-red, #C1432E);
  color: var(--paper, #FAFAF7);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.code-panel {
  position: fixed;
  bottom: 3rem;
  left: 14rem;
  width: 320px;
  max-height: 480px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
}

.code-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--line-soft, #D9D6CC);
}

.code-panel__title {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-faint, #8C8878);
  font-weight: 500;
}

.code-panel__close {
  color: var(--ink-faint, #8C8878);
  padding: 2px;
  cursor: pointer;
  background: none;
  border: none;
}
.code-panel__close:hover { color: var(--ink, #1A1A1A); }

.code-panel__body {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.code-panel__empty {
  padding: 2rem 1rem;
}

.code-panel__item {
  padding: 0.625rem 1rem;
  transition: background 0.1s;
}
.code-panel__item:hover { background: var(--paper-dim, #F0EFEA); }

.code-panel__item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-panel__code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ink, #1A1A1A);
  cursor: pointer;
  user-select: all;
}

.code-panel__action-btn {
  padding: 3px;
  color: var(--ink-faint, #8C8878);
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.1s;
}
.code-panel__action-btn:hover { color: var(--ink, #1A1A1A); }

.code-panel__item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--ink-faint, #8C8878);
}

.code-panel__item-subject {
  color: var(--ink-faint, #8C8878);
  margin-top: 0.125rem;
}

.code-panel__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--line-soft, #D9D6CC);
}

/* 面板过渡 */
.panel-enter-active { animation: panel-in 0.2s ease-out; }
.panel-leave-active { animation: panel-out 0.15s ease-in; }

@keyframes panel-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes panel-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(12px); }
}
</style>
