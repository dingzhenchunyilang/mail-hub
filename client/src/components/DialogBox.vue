<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="onOverlayClick">
        <div class="dialog-box">
          <!-- 标题 -->
          <div v-if="title" class="dialog-title">{{ title }}</div>

          <!-- 内容 -->
          <div class="dialog-body">
            <p class="dialog-message">{{ message }}</p>
            <!-- prompt 输入框 -->
            <input
              v-if="type === 'prompt'"
              ref="promptInput"
              v-model="promptValue"
              class="input mt-3"
              :placeholder="placeholder || ''"
              @keydown.enter="onConfirm"
            />
          </div>

          <!-- 按钮 -->
          <div class="dialog-actions">
            <button
              v-if="type === 'confirm' || type === 'prompt'"
              @click="onCancel"
              class="btn btn-secondary btn-sm"
            >
              {{ cancelText }}
            </button>
            <button
              @click="onConfirm"
              class="btn btn-primary btn-sm"
              ref="confirmBtn"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const visible = ref(false);
const type = ref('alert');
const title = ref('');
const message = ref('');
const confirmText = ref('确定');
const cancelText = ref('取消');
const placeholder = ref('');
const promptValue = ref('');
const closeOnOverlay = ref(false);
const promptInput = ref(null);

let resolveFn = null;

const show = (options) => {
  type.value = options.type || 'alert';
  title.value = options.title || '';
  message.value = options.message || '';
  confirmText.value = options.confirmText || '确定';
  cancelText.value = options.cancelText || '取消';
  placeholder.value = options.placeholder || '';
  promptValue.value = options.default || '';
  closeOnOverlay.value = options.closeOnOverlay ?? false;
  visible.value = true;

  nextTick(() => {
    if (type.value === 'prompt' && promptInput.value) {
      promptInput.value.focus();
    }
  });

  return new Promise((resolve) => {
    resolveFn = resolve;
  });
};

const onConfirm = () => {
  visible.value = false;
  if (type.value === 'prompt') {
    resolveFn?.(promptValue.value);
  } else {
    resolveFn?.(true);
  }
};

const onCancel = () => {
  visible.value = false;
  resolveFn?.(type.value === 'prompt' ? null : false);
};

const onOverlayClick = () => {
  if (closeOnOverlay.value) onCancel();
};

// 快捷方法
const alert = (message, title) => show({ type: 'alert', message, title });
const confirm = (message, title) => show({ type: 'confirm', message, title });
const prompt = (message, options) => show({ type: 'prompt', message, ...(options || {}) });

defineExpose({ show, alert, confirm, prompt });
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-box {
  background: var(--paper);
  border: 1px solid var(--line-soft);
  border-radius: 5px;
  width: 100%;
  max-width: 24rem;
  margin: 0 1rem;
  padding: 1.5rem;
}

.dialog-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.75rem;
}

.dialog-message {
  font-size: 0.875rem;
  color: var(--ink);
  line-height: 1.5;
  white-space: pre-wrap;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

/* 过渡动画 */
.dialog-enter-active {
  transition: opacity 0.15s ease;
}
.dialog-leave-active {
  transition: opacity 0.1s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
.dialog-enter-active .dialog-box {
  transition: transform 0.15s ease;
}
.dialog-enter-from .dialog-box {
  transform: scale(0.95);
}
</style>
