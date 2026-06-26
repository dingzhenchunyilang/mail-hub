<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="code-toast card"
      :class="{ 'code-toast--dismissed': dismissed }"
    >
      <!-- 关闭按钮 -->
      <button @click="dismiss" class="code-toast__close" title="关闭">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- 头部标签 -->
      <div class="code-toast__label">
        <svg class="w-3.5 h-3.5 text-stamp-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span>验证码</span>
        <span v-if="confidence === 'low'" class="badge text-[9px] py-0 ml-1">低置信</span>
      </div>

      <!-- 验证码主体 -->
      <div class="code-toast__code" @click="copyCode">
        {{ code }}
      </div>

      <!-- 来源信息 -->
      <div class="code-toast__info">
        <span class="code-toast__from" :title="fromAddress">
          {{ fromName || fromAddress }}
        </span>
        <span class="code-toast__time">{{ timeAgo }}</span>
      </div>

      <!-- 新鲜度进度条 -->
      <div class="code-toast__freshness">
        <div class="code-toast__freshness-bar" :style="{ width: freshnessPct + '%', background: freshnessColor }" />
      </div>

      <!-- 操作按钮 -->
      <div class="code-toast__actions">
        <button
          @click="copyCode"
          class="btn btn-primary btn-sm code-toast__copy-btn"
        >
          {{ copied ? '已复制!' : '复制验证码' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  id: String,
  code: String,
  confidence: { type: String, default: 'high' },
  fromName: String,
  fromAddress: String,
  accountName: String,
  detectedAt: String,
});

const emit = defineEmits(['dismiss']);

const visible = ref(false);
const dismissed = ref(false);
const copied = ref(false);
const freshnessMs = ref(0);

let showTimer = null;
let freshnessTimer = null;

const timeAgo = computed(() => {
  if (!props.detectedAt) return '';
  return dayjs(props.detectedAt).fromNow();
});

// 新鲜度: 10分钟内渐变
const freshnessPct = computed(() => {
  const elapsed = freshnessMs.value;
  const total = 10 * 60 * 1000; // 10分钟
  return Math.max(0, 100 - (elapsed / total) * 100);
});

const freshnessColor = computed(() => {
  const pct = freshnessPct.value;
  if (pct > 60) return 'var(--stamp-red, #C1432E)';
  if (pct > 30) return '#d4a037';
  return 'var(--ink-faint, #8C8878)';
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => {
      dismiss();
    }, 800);
  } catch {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = props.code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => dismiss(), 800);
  }
}

function dismiss() {
  dismissed.value = true;
  setTimeout(() => {
    visible.value = false;
    emit('dismiss', props.id);
  }, 200);
}

onMounted(() => {
  // 延迟一帧进入动画
  requestAnimationFrame(() => { visible.value = true; });

  // 60秒后自动消失
  showTimer = setTimeout(() => {
    dismiss();
  }, 60000);

  // 每秒更新新鲜度
  const startTime = props.detectedAt ? new Date(props.detectedAt).getTime() : Date.now();
  freshnessTimer = setInterval(() => {
    freshnessMs.value = Date.now() - startTime;
  }, 1000);
});

onUnmounted(() => {
  if (showTimer) clearTimeout(showTimer);
  if (freshnessTimer) clearInterval(freshnessTimer);
});
</script>

<style scoped>
.code-toast {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  width: 280px;
  padding: 1rem;
  z-index: 9999;
  background: var(--paper, #FAFAF7);
  box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
}

.code-toast__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: var(--ink-faint, #8C8878);
  padding: 2px;
  cursor: pointer;
  background: none;
  border: none;
}
.code-toast__close:hover { color: var(--ink, #1A1A1A); }

.code-toast__label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-faint, #8C8878);
  margin-bottom: 0.5rem;
}

.code-toast__code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--ink, #1A1A1A);
  cursor: pointer;
  padding: 0.375rem 0;
  border-top: 1px solid var(--line-soft, #D9D6CC);
  border-bottom: 1px solid var(--line-soft, #D9D6CC);
  text-align: center;
  user-select: all;
}
.code-toast__code:hover { background: rgba(193,67,46,0.04); }

.code-toast__info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--ink-faint, #8C8878);
}

.code-toast__from {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-toast__time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.625rem;
}

.code-toast__freshness {
  height: 3px;
  background: var(--line-soft, #D9D6CC);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}
.code-toast__freshness-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 1s linear;
}

.code-toast__actions {
  margin-top: 0.625rem;
  display: flex;
  justify-content: center;
}
.code-toast__copy-btn {
  width: 100%;
}

/* 过渡动画 */
.toast-enter-active { animation: toast-in 0.25s ease-out; }
.toast-leave-active { animation: toast-out 0.2s ease-in; }

@keyframes toast-in {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(40px); }
}
</style>
