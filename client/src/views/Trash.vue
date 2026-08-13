<template>
  <div class="min-h-full flex flex-col">
    <header class="page-header">
      <h1 class="page-title">回收站</h1>
      <p class="text-xs text-ink-faint mt-1">删除邮件保留14天，验证码邮件识别后1小时自动进入回收站</p>
    </header>
    <section class="flex-1 p-4 lg:p-6">
      <div v-if="loading" class="text-sm text-ink-faint">加载中...</div>
      <div v-else-if="emails.length === 0" class="card p-10 text-center text-sm text-ink-faint">回收站为空</div>
      <div v-else class="card divide-y divide-line-soft">
        <div v-for="email in emails" :key="email.id" class="flex items-center gap-4 p-4">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-ink">{{ email.subject || '(无主题)' }}</p>
            <p class="truncate text-xs text-ink-faint">{{ email.from_name || email.from_address }} · 删除于 {{ formatDate(email.deleted_at) }}</p>
          </div>
          <button class="btn btn-secondary btn-sm" :disabled="restoring === email.id" @click="restore(email)">
            {{ restoring === email.id ? '恢复中...' : '恢复' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { emailsApi } from '@/api';

const emails = ref([]);
const loading = ref(true);
const restoring = ref(null);

function formatDate(value) {
  return value ? new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')).toLocaleString('zh-CN') : '-';
}

async function load() {
  loading.value = true;
  try {
    const result = await emailsApi.trash();
    emails.value = result.success ? result.data : [];
  } finally { loading.value = false; }
}

async function restore(email) {
  restoring.value = email.id;
  try {
    const result = await emailsApi.restore(email.id);
    if (result.success) emails.value = emails.value.filter(item => item.id !== email.id);
  } finally { restoring.value = null; }
}

onMounted(load);
</script>
