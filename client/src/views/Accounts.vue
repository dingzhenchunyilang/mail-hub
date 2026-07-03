<template>
  <div class="h-full flex flex-col">
    <!-- 顶部导航 -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <h1 class="page-title">账号管理</h1>
        <router-link to="/accounts/add" class="btn btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          添加账号
        </router-link>
      </div>
    </header>

    <!-- 账号列表 -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-faint"></div>
      </div>

      <div v-else-if="accounts.length === 0" class="flex flex-col items-center justify-center h-64 text-ink-faint">
        <svg class="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        <p class="text-lg font-serif mb-2">还没有邮箱账号</p>
        <p class="text-sm">点击上方按钮添加第一个</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="account in accounts"
          :key="account.id"
          class="card p-6"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-4">
              <!-- 信封线稿图标 -->
              <div class="envelope-status" :class="{ disconnected: !account.is_active || account.last_error }">
                <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <!-- 账号信息 -->
              <div>
                <h3 class="text-lg font-serif font-semibold text-ink">{{ account.name }}</h3>
                <p class="text-sm text-ink-faint font-mono">{{ account.email }}</p>
                <div class="flex items-center space-x-4 mt-2">
                  <span :class="['badge', account.is_active ? '' : 'text-ink-faint']">
                    {{ account.is_active ? '已启用' : '已禁用' }}
                  </span>
                  <span v-if="account.last_sync_at" class="text-xs text-ink-faint font-mono">
                    上次同步: {{ formatTime(account.last_sync_at) }}
                  </span>
                  <span v-if="account.last_error" class="text-xs text-stamp-red">
                    错误: {{ account.last_error }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center space-x-2">
              <button
                @click="testConnection(account)"
                :disabled="testing === account.id"
                class="btn btn-secondary btn-sm"
              >
                <svg v-if="testing === account.id" class="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ testing === account.id ? '测试中...' : '测试连接' }}
              </button>
              <button
                @click="syncAccount(account)"
                :disabled="syncing === account.id"
                class="btn btn-secondary btn-sm"
              >
                <svg v-if="syncing === account.id" class="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ syncing === account.id ? '同步中...' : '立即同步' }}
              </button>
              <router-link :to="`/accounts/${account.id}/edit`" class="btn btn-secondary btn-sm">
                编辑
              </router-link>
              <button @click="toggleActive(account)" class="btn btn-secondary btn-sm">
                {{ account.is_active ? '禁用' : '启用' }}
              </button>
              <button @click="deleteAccount(account)" class="btn btn-danger btn-sm">
                删除
              </button>
            </div>
          </div>

          <!-- 连接测试结果 -->
          <div v-if="testResults[account.id]" class="mt-4 p-3 rounded-card" :class="testResults[account.id].success ? 'bg-paper-dim' : 'bg-paper-dim'">
            <p :class="['text-sm', testResults[account.id].success ? 'text-ink' : 'text-stamp-red']">
              {{ testResults[account.id].message }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { accountsApi } from '@/api';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const dialog = useDialog();

const accounts = ref([]);
const loading = ref(true);
const testing = ref(null);
const syncing = ref(null);
const testResults = ref({});

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).fromNow();
};

const loadAccounts = async () => {
  loading.value = true;
  try {
    const result = await accountsApi.list();
    if (result.success) {
      accounts.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load accounts:', error);
  } finally {
    loading.value = false;
  }
};

const testConnection = async (account) => {
  testing.value = account.id;
  testResults.value[account.id] = null;

  try {
    const result = await accountsApi.testImap(account.id);
    testResults.value[account.id] = result;
  } catch (error) {
    testResults.value[account.id] = {
      success: false,
      message: '测试失败: ' + error.message,
    };
  } finally {
    testing.value = null;
  }
};

const syncAccount = async (account) => {
  syncing.value = account.id;

  try {
    const result = await accountsApi.sync(account.id);
    if (result.success) {
      await dialog.alert('同步完成');
      loadAccounts();
    } else {
      await dialog.alert('同步失败: ' + result.message);
    }
  } catch (error) {
    await dialog.alert('同步失败: ' + error.message);
  } finally {
    syncing.value = null;
  }
};

const toggleActive = async (account) => {
  try {
    await accountsApi.update(account.id, { is_active: !account.is_active });
    loadAccounts();
  } catch (error) {
    await dialog.alert('操作失败: ' + error.message);
  }
};

const deleteAccount = async (account) => {
  if (!await dialog.confirm(`确定删除账号 "${account.name}" (${account.email}) 吗？\n\n删除后该账号的所有邮件也将被删除。`)) {
    return;
  }

  try {
    await accountsApi.delete(account.id);
    loadAccounts();
  } catch (error) {
    await dialog.alert('删除失败: ' + error.message);
  }
};

onMounted(() => {
  loadAccounts();
});
</script>
