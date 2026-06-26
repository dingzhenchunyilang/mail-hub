<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="bg-paper border-b border-line-soft px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-display text-ink font-serif">收件箱</h1>
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
              placeholder="搜索邮件..."
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
          <button
            @click="syncAllAccounts"
            :disabled="syncing"
            class="btn btn-primary btn-sm"
          >
            <svg v-if="syncing" class="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ syncing ? '同步中...' : '一键同步' }}
          </button>

          <!-- 等待验证码按钮 -->
          <div class="relative">
            <button
              v-if="!boostActive"
              @click="startBoost(selectedAccount)"
              class="btn btn-secondary btn-sm"
              title="开启加速轮询模式（15秒/次，持续5分钟）"
            >
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              等待验证码
            </button>
            <button
              v-else
              @click="cancelBoost"
              class="btn btn-sm relative"
              style="background: var(--stamp-red); color: var(--paper); border-color: var(--stamp-red);"
              title="点击取消加速模式"
            >
              <svg class="w-4 h-4 mr-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              加速中 {{ boostTimeDisplay() }}
            </button>
          </div>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="flex items-center space-x-1 mt-4">
        <button
          v-for="f in filters"
          :key="f.key"
          @click="setFilter(f.key)"
          :class="[
            'px-3 py-1.5 text-xs font-mono transition-colors duration-100',
            filter === f.key
              ? 'text-ink border-b-2 border-ink'
              : 'text-ink-faint hover:text-ink'
          ]"
        >
          {{ f.label }}
        </button>
        <div class="border-l border-line-soft h-4 mx-2" />
        <div class="flex items-center space-x-2">
          <button
            v-for="tag in commonTags.slice(0, 5)"
            :key="tag.id"
            @click="setTagFilter(tag.name)"
            :class="[
              'px-2 py-1 text-xs font-mono transition-colors duration-100 rounded-card',
              selectedTag === tag.name
                ? 'bg-ink text-paper'
                : 'text-ink-faint border border-line-soft hover:border-ink'
            ]"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
    </header>

    <!-- Email list -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="w-5 h-5 border-2 border-line-soft border-t-ink rounded-full animate-spin" />
      </div>

      <!-- Empty state -->
      <div v-else-if="emails.length === 0" class="flex flex-col items-center justify-center h-64 text-ink-faint">
        <svg class="w-20 h-20 mb-5 text-line-soft" fill="none" viewBox="0 0 80 80" stroke="currentColor" stroke-width="1">
          <!-- Mailbox with flag down -->
          <rect x="15" y="20" width="50" height="35" rx="2" />
          <line x1="15" y1="30" x2="65" y2="30" />
          <rect x="35" y="55" width="4" height="15" />
          <line x1="60" y1="25" x2="60" y2="15" stroke-width="1.5" />
          <line x1="60" y1="15" x2="68" y2="15" stroke-width="1.5" />
          <!-- Little flag down -->
          <path d="M68 15 L68 22 L63 18.5 Z" fill="none" stroke-width="1" />
        </svg>
        <p class="text-sm font-serif text-ink">信箱很安静</p>
        <p class="text-xs mt-1 text-ink-faint">小旗放下了，等新信到来就会升起</p>
        <p class="text-xs mt-1 text-ink-faint">试试先添加邮箱账号并同步</p>
      </div>

      <!-- Email items -->
      <div v-else>
        <!-- 列头 -->
        <div
          class="grid items-center px-6 py-2 border-b border-line-soft text-[10px] font-mono text-ink-faint uppercase tracking-wider gap-x-3"
          style="grid-template-columns: 1.75rem 1.5rem 1.75rem 7rem 8rem minmax(0,1fr) 1.25rem 4rem 2rem"
        >
          <span></span>
          <span></span>
          <span></span>
          <span>账号</span>
          <span>发件人</span>
          <span>主题</span>
          <span></span>
          <span class="text-right">时间</span>
          <span></span>
        </div>

        <div class="divide-y divide-line-soft">
        <div
          v-for="email in emails"
          :key="email.id"
          class="email-item group grid items-center px-6 py-3.5 cursor-pointer gap-x-3"
          style="grid-template-columns: 1.75rem 1.5rem 1.75rem 7rem 8rem minmax(0,1fr) 1.25rem 4rem 2rem"
          :class="{ 'font-medium': !email.is_read }"
          @click="openEmail(email)"
        >
          <!-- Checkbox (clearly a checkbox, not a dot) -->
          <label class="flex items-center justify-center" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.includes(email.id)"
              @change="toggleSelect(email.id)"
              class="w-3.5 h-3.5 rounded-sm border border-line-soft bg-paper text-ink accent-ink cursor-pointer"
            />
          </label>

          <!-- Read/unread indicator: hollow = unread, filled = read -->
          <span class="flex items-center justify-center">
            <span
              v-if="!email.is_read"
              class="w-2 h-2 rounded-full border-[1.5px] border-stamp-red"
              title="未读"
            />
            <span
              v-else
              class="w-1.5 h-1.5 rounded-full bg-ink-faint"
              title="已读"
            />
          </span>

          <!-- Star / important: line-art seal icon -->
          <button
            @click.stop="toggleStar(email)"
            class="text-ink-faint hover:text-stamp-red transition-colors"
          >
            <svg
              v-if="email.is_starred"
              class="w-4 h-4 text-stamp-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          <!-- Account label: always show name, tooltip with name+email -->
          <span
            class="badge text-[10px] justify-center truncate cursor-default"
            :title="formatAccountFull(email.account_name, email.account_email)"
          >
            {{ formatAccountName(email.account_name, email.account_email) }}
          </span>

          <!-- Sender -->
          <div class="min-w-0">
            <p class="text-sm truncate">{{ email.from_name || email.from_address }}</p>
            <p class="text-[11px] font-mono text-ink-faint truncate">{{ email.from_address }}</p>
          </div>

          <!-- Subject + preview + tags -->
          <div class="min-w-0">
            <div class="flex items-center space-x-2">
              <p class="text-sm truncate" :class="{ 'font-semibold': !email.is_read }">{{ email.subject }}</p>
              <span
                v-for="tag in (email.tags || []).slice(0, 3)"
                :key="tag.id"
                class="inline-flex items-center px-1.5 py-0.5 rounded-card text-[10px] font-mono border border-line-soft text-ink-faint"
              >
                {{ tag.name }}
              </span>
            </div>
            <p class="text-xs text-ink-faint truncate mt-0.5">{{ cleanPreview(email.preview) }}</p>
          </div>

          <!-- Attachment icon -->
          <div v-if="email.has_attachments" class="text-ink-faint">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </div>
          <div v-else></div>

          <!-- Timestamp -->
          <div class="text-right">
            <p class="text-xs font-mono text-ink-faint">{{ formatTime(email.received_at) }}</p>
          </div>

          <!-- Actions (hover) -->
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="archiveEmail(email)"
              class="p-1.5 text-ink-faint hover:text-ink"
              title="归档"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </button>
            <button
              @click.stop="deleteEmail(email)"
              class="p-1.5 text-ink-faint hover:text-stamp-red"
              title="删除"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
        </div>
      </div>

      <!-- Pagination -->
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

    <!-- Batch action bar -->
    <div v-if="selectedIds.length > 0" class="bg-paper border-t border-line-soft px-6 py-3">
      <div class="flex items-center space-x-4">
        <span class="text-xs font-mono text-ink-faint">已选 {{ selectedIds.length }} 封</span>
        <button @click="batchMarkRead" class="btn btn-secondary btn-sm">标记已读</button>
        <button @click="batchMarkUnread" class="btn btn-secondary btn-sm">标记未读</button>
        <button @click="batchDelete" class="btn btn-danger btn-sm">删除</button>
        <button @click="clearSelection" class="btn btn-ghost btn-sm">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { emailsApi, accountsApi, tagsApi, codesApi } from '@/api';
import { formatAccountName, formatAccountFull, getAvatarChar } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const router = useRouter();
const dialog = useDialog();

onUnmounted(() => {
  if (boostCountdownTimer) clearInterval(boostCountdownTimer);
});

const emails = ref([]);
const accounts = ref([]);
const commonTags = ref([]);
const loading = ref(false);
const syncing = ref(false);
const selectedAccount = ref('');
const searchQuery = ref('');
const filter = ref('all');
const selectedTag = ref('');
const selectedIds = ref([]);
const pagination = ref({ page: 1, limit: 50, total: 0, pages: 0 });

// ── 等待验证码（加速轮询） ──
const boostActive = ref(false);
const boostRemaining = ref(0);
const boostAccountId = ref('');
let boostCountdownTimer = null;

const startBoost = async (accountId) => {
  try {
    const result = await codesApi.boost({
      account_id: accountId || undefined,
      duration_seconds: 300,
    });
    if (result.success) {
      boostActive.value = true;
      boostRemaining.value = 300;
      boostAccountId.value = accountId || '';
      startBoostCountdown();
    }
  } catch (e) {
    console.error('[Boost] Start error:', e);
  }
};

const cancelBoost = async () => {
  try {
    await codesApi.boostCancel();
  } catch {}
  stopBoost();
};

const stopBoost = () => {
  boostActive.value = false;
  boostRemaining.value = 0;
  boostAccountId.value = '';
  if (boostCountdownTimer) {
    clearInterval(boostCountdownTimer);
    boostCountdownTimer = null;
  }
};

const startBoostCountdown = () => {
  if (boostCountdownTimer) clearInterval(boostCountdownTimer);
  boostCountdownTimer = setInterval(() => {
    boostRemaining.value = Math.max(0, boostRemaining.value - 1);
    if (boostRemaining.value <= 0) {
      stopBoost();
    }
  }, 1000);
};

const boostTimeDisplay = () => {
  const m = Math.floor(boostRemaining.value / 60);
  const s = boostRemaining.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// 启动时检查是否已有加速模式
const checkBoostStatus = async () => {
  try {
    const result = await codesApi.boostStatus();
    if (result.success && result.data.active) {
      boostActive.value = true;
      boostRemaining.value = result.data.remaining_seconds;
      boostAccountId.value = result.data.account_id || '';
      startBoostCountdown();
    }
  } catch {}
};

const filters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'starred', label: '标星' },
  { key: 'archived', label: '已归档' },
];

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  const now = dayjs();
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm');
  } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天';
  } else if (date.isSame(now, 'year')) {
    return date.format('M/D');
  } else {
    return date.format('YY/M/D');
  }
};

// 清理预览文本中的HTML残留和格式噪音
const cleanPreview = (text) => {
  if (!text) return '';
  return text
    .replace(/\[image:[^\]]*\]/gi, '')      // [image: Google] 等图片占位符
    .replace(/\[图片[^\]]*\]/gi, '')         // [图片] 中文占位符
    .replace(/<[^>]+>/g, '')                  // 残留HTML标签
    .replace(/&[a-z]+;/gi, ' ')              // HTML实体 &nbsp; 等
    .replace(/\s+/g, ' ')                    // 多个空白合并
    .trim()
    .substring(0, 80);                       // 限制长度
};

const loadAccounts = async () => {
  try {
    const result = await accountsApi.list();
    if (result.success) accounts.value = result.data;
  } catch (e) { console.error(e); }
};

const syncAllAccounts = async () => {
  syncing.value = true;
  try {
    const result = await accountsApi.syncAll();
    if (result.success) { loadEmails(); }
    else { await dialog.alert('同步失败: ' + result.message); }
  } catch (e) { await dialog.alert('同步失败: ' + e.message); }
  finally { syncing.value = false; }
};

const loadTags = async () => {
  try {
    const result = await tagsApi.list();
    if (result.success) commonTags.value = result.data;
  } catch (e) { console.error(e); }
};

const loadEmails = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      is_archived: filter.value === 'archived' ? 1 : 0,
    };
    if (selectedAccount.value) params.account_id = selectedAccount.value;
    if (filter.value === 'unread') params.is_read = 0;
    else if (filter.value === 'starred') params.is_starred = 1;
    if (searchQuery.value) params.search = searchQuery.value;

    const result = await emailsApi.list(params);
    if (result.success) {
      const emailsWithTags = await Promise.all(
        result.data.map(async (email) => {
          try {
            const tagsResult = await tagsApi.getEmailTags(email.id);
            email.tags = tagsResult.success ? tagsResult.data : [];
          } catch { email.tags = []; }
          return email;
        })
      );
      if (selectedTag.value) {
        emails.value = emailsWithTags.filter(e => e.tags.some(t => t.name === selectedTag.value));
      } else {
        emails.value = emailsWithTags;
      }
      pagination.value = result.pagination;
    }
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const setFilter = (newFilter) => {
  filter.value = newFilter;
  selectedTag.value = '';
  pagination.value.page = 1;
  loadEmails();
};

const setTagFilter = (tagName) => {
  selectedTag.value = selectedTag.value === tagName ? '' : tagName;
  loadEmails();
};

const goToPage = (page) => {
  pagination.value.page = page;
  loadEmails();
};

const openEmail = async (email) => {
  // 立即更新本地未读状态（乐观更新）
  if (!email.is_read) {
    email.is_read = 1;
    // 刷新侧边栏统计
    try {
      const statsResult = await emailsApi.stats();
      // stats are refreshed by App.vue timer, just update local
    } catch {}
  }
  router.push(`/inbox/${email.id}`);
};
const toggleSelect = (id) => {
  const i = selectedIds.value.indexOf(id);
  if (i === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(i, 1);
};
const clearSelection = () => { selectedIds.value = []; };

const toggleStar = async (email) => {
  try {
    await emailsApi.toggleStar(email.id);
    email.is_starred = !email.is_starred;
  } catch (e) { console.error(e); }
};

const archiveEmail = async (email) => {
  try { await emailsApi.archive(email.id); loadEmails(); }
  catch (e) { console.error(e); }
};

const deleteEmail = async (email) => {
  if (email.is_starred) { await dialog.alert('星标邮件不能删除，请先取消星标'); return; }
  if (!await dialog.confirm('确定删除这封邮件吗？')) return;
  try { await emailsApi.delete(email.id); loadEmails(); }
  catch (e) { console.error(e); }
};

const batchMarkRead = async () => {
  try { await emailsApi.batchMarkRead(selectedIds.value, true); clearSelection(); loadEmails(); }
  catch (e) { console.error(e); }
};
const batchMarkUnread = async () => {
  try { await emailsApi.batchMarkRead(selectedIds.value, false); clearSelection(); loadEmails(); }
  catch (e) { console.error(e); }
};
const batchDelete = async () => {
  const starred = emails.value.filter(e => selectedIds.value.includes(e.id) && e.is_starred);
  if (starred.length > 0) { await dialog.alert(`${starred.length} 封星标邮件不能删除，请先取消星标`); return; }
  if (!await dialog.confirm(`确定删除选中的 ${selectedIds.value.length} 封邮件吗？`)) return;
  try { await emailsApi.batchDelete(selectedIds.value); clearSelection(); loadEmails(); }
  catch (e) { console.error(e); }
};

onMounted(() => {
  loadAccounts();
  loadEmails();
  loadTags();
  checkBoostStatus();
});
</script>
