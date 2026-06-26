<template>
  <div class="h-full flex flex-col">
    <!-- 页头 -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="page-title">已发送</h1>
          <select
            v-model="selectedAccount"
            class="select w-36 text-xs py-1.5"
            @change="loadEmails"
          >
            <option value="">全部账号</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ formatAccountName(account.name, account.email) }}
            </option>
          </select>
        </div>

        <div class="flex items-center space-x-3">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索已发送..."
              class="input w-44 text-xs py-1.5 pl-8"
              @keyup.enter="loadEmails"
            />
            <svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <button @click="loadEmails" class="btn btn-secondary btn-sm">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            刷新
          </button>
        </div>
      </div>
    </header>

    <!-- 邮件列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="spinner" />
      </div>

      <div v-else-if="emails.length === 0" class="empty-state">
        <svg class="w-20 h-20 mb-5 text-line-soft" fill="none" viewBox="0 0 80 80" stroke="currentColor" stroke-width="1">
          <rect x="15" y="20" width="50" height="35" rx="2" />
          <line x1="15" y1="30" x2="65" y2="30" />
          <path d="M15 20 L40 8 L65 20" stroke-width="1" />
          <rect x="35" y="55" width="4" height="15" />
          <line x1="40" y1="38" x2="40" y2="26" stroke-width="1.5" />
          <polyline points="35,30 40,26 45,30" fill="none" stroke-width="1.5" />
        </svg>
        <p class="empty-state-title">发件箱空空如也</p>
        <p class="empty-state-desc">发出的信都会留一份在这里</p>
      </div>

      <div v-else>
        <!-- 列头 -->
        <div
          class="grid items-center px-6 py-2 border-b border-line-soft text-[10px] font-mono text-ink-faint uppercase tracking-wider"
          style="grid-template-columns: 2rem 6rem 12rem 1fr 5rem 2rem; gap: 0 1rem"
        >
          <span></span>
          <span>账号</span>
          <span>收件人</span>
          <span>主题</span>
          <span class="text-right">时间</span>
          <span></span>
        </div>

        <div class="divide-y divide-line-soft">
          <div
            v-for="email in emails"
            :key="email.id"
            class="email-item group grid items-center px-6 py-3.5 cursor-pointer"
            style="grid-template-columns: 2rem 6rem 12rem 1fr 5rem 2rem; gap: 0 1rem"
            @click="openEmail(email)"
          >
            <!-- Checkbox -->
            <label class="flex items-center justify-center" @click.stop>
              <input
                type="checkbox"
                :checked="selectedIds.includes(email.id)"
                @change="toggleSelect(email.id)"
                class="w-3.5 h-3.5 rounded-sm border border-line-soft bg-paper text-ink accent-ink cursor-pointer"
              />
            </label>

            <!-- 账号标签 -->
            <span
              class="badge text-[10px] justify-center truncate"
              :title="formatAccountFull(email.account_name, email.account_email)"
            >
              {{ formatAccountName(email.account_name, email.account_email) }}
            </span>

            <!-- 收件人 -->
            <div class="overflow-hidden">
              <p class="text-sm text-ink truncate" :title="email.to_address">{{ email.to_address }}</p>
            </div>

            <!-- 主题 + 预览 -->
            <div class="overflow-hidden">
              <div class="flex items-center space-x-2">
                <p class="text-sm text-ink truncate">{{ email.subject }}</p>
                <span v-if="email.is_bounced" class="badge badge-stamp text-[10px] flex-shrink-0">已退回</span>
              </div>
              <p class="text-xs text-ink-faint truncate mt-0.5">{{ cleanPreview(email.preview, email.body_text) }}</p>
            </div>

            <!-- 时间 -->
            <div class="text-right">
              <p class="text-xs font-mono text-ink-faint">{{ formatTime(email.received_at) }}</p>
            </div>

            <!-- 删除 -->
            <button
              @click.stop="deleteEmail(email)"
              class="p-1 text-ink-faint hover:text-stamp-red opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.pages > 1" class="flex items-center justify-between px-6 py-3 border-t border-line-soft">
        <div class="text-xs font-mono text-ink-faint">
          {{ pagination.total }} 封 / {{ pagination.page }}-{{ pagination.pages }}
        </div>
        <div class="flex space-x-2">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="btn btn-secondary btn-sm disabled:opacity-30"
          >上一页</button>
          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.pages"
            class="btn btn-secondary btn-sm disabled:opacity-30"
          >下一页</button>
        </div>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedIds.length > 0" class="bg-paper border-t border-line-soft px-6 py-3">
      <div class="flex items-center space-x-4">
        <span class="text-xs font-mono text-ink-faint">已选 {{ selectedIds.length }} 封</span>
        <button @click="batchDelete" class="btn btn-danger btn-sm">批量删除</button>
        <button @click="clearSelection" class="btn btn-ghost btn-sm">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { emailsApi, accountsApi } from '@/api';
import { formatAccountName, formatAccountFull } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const router = useRouter();
const dialog = useDialog();

const emails = ref([]);
const accounts = ref([]);
const loading = ref(false);
const selectedAccount = ref('');
const searchQuery = ref('');
const selectedIds = ref([]);
const pagination = ref({ page: 1, limit: 50, total: 0, pages: 0 });

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  const now = dayjs();
  if (date.isSame(now, 'day')) return date.format('HH:mm');
  if (date.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
  if (date.isSame(now, 'year')) return date.format('M/D');
  return date.format('YY/M/D');
};

const cleanPreview = (text, bodyText) => {
  const source = text || bodyText || '';
  if (!source) return '';
  return source
    .replace(/\[image:[^\]]*\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
};

const loadAccounts = async () => {
  try {
    const result = await accountsApi.list();
    if (result.success) accounts.value = result.data;
  } catch (e) { console.error(e); }
};

const loadEmails = async () => {
  loading.value = true;
  try {
    const params = { page: pagination.value.page, limit: pagination.value.limit };
    if (selectedAccount.value) params.account_id = selectedAccount.value;
    if (searchQuery.value) params.search = searchQuery.value;
    const result = await emailsApi.sent(params);
    if (result.success) {
      emails.value = result.data;
      pagination.value = result.pagination;
    }
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const goToPage = (page) => { pagination.value.page = page; loadEmails(); };
const openEmail = (email) => router.push(`/inbox/${email.id}`);

const toggleSelect = (id) => {
  const i = selectedIds.value.indexOf(id);
  if (i === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(i, 1);
};
const clearSelection = () => { selectedIds.value = []; };

const deleteEmail = async (email) => {
  if (email.is_starred) { await dialog.alert('星标邮件不能删除，请先取消星标'); return; }
  if (!await dialog.confirm('确定删除这封邮件吗？')) return;
  try { await emailsApi.delete(email.id); loadEmails(); }
  catch (e) { console.error(e); }
};

const batchDelete = async () => {
  const starred = emails.value.filter(e => selectedIds.value.includes(e.id) && e.is_starred);
  if (starred.length > 0) { await dialog.alert(`${starred.length} 封星标邮件不能删除，请先取消星标`); return; }
  if (!await dialog.confirm(`确定删除选中的 ${selectedIds.value.length} 封邮件吗？`)) return;
  try { await emailsApi.batchDelete(selectedIds.value); clearSelection(); loadEmails(); }
  catch (e) { console.error(e); }
};

onMounted(() => { loadAccounts(); loadEmails(); });
</script>
