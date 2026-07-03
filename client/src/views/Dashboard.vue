<template>
  <div class="h-full flex flex-col">
    <header class="page-header">
      <h1 class="page-title">总览</h1>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-5xl 2xl:max-w-7xl mx-auto space-y-6">

        <!-- 第一段：待处理事项 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- 未读邮件 -->
          <router-link to="/inbox" class="card p-5 hover:border-ink transition-colors group">
            <p class="section-title mb-2">未读邮件</p>
            <p class="text-3xl font-mono font-bold text-ink">{{ stats.unread }}</p>
            <div v-if="stats.unread_by_account && stats.unread_by_account.length > 1" class="mt-2 space-y-0.5">
              <p
                v-for="acc in stats.unread_by_account.filter(a => a.unread_count > 0)"
                :key="acc.id"
                class="text-[11px] font-mono text-ink-faint"
              >
                {{ formatAccountName(acc.name, acc.email) }}: {{ acc.unread_count }}
              </p>
            </div>
            <div v-if="stats.unread === 0" class="mt-2 flex items-center space-x-2 text-ink-faint">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="text-xs">全部已读</span>
            </div>
          </router-link>

          <!-- 标星邮件 -->
          <router-link to="/inbox?starred=1" class="card p-5 hover:border-ink transition-colors group">
            <p class="section-title mb-2">标星邮件</p>
            <p class="text-3xl font-mono font-bold text-ink">{{ stats.starred }}</p>
            <div v-if="stats.starred === 0" class="mt-2 flex items-center space-x-2 text-ink-faint">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              <span class="text-xs">暂无标星</span>
            </div>
          </router-link>

          <!-- 待确认日程 -->
          <router-link
            to="/calendar"
            class="card p-5 hover:border-ink transition-colors group"
            :class="{ 'border-stamp-red': pendingEventsCount > 0 }"
          >
            <p class="section-title mb-2">待确认日程</p>
            <p class="text-3xl font-mono font-bold" :class="pendingEventsCount > 0 ? 'text-stamp-red' : 'text-ink'">{{ pendingEventsCount }}</p>
            <div v-if="pendingEventsCount === 0" class="mt-2 flex items-center space-x-2 text-ink-faint">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              <span class="text-xs">暂无待确认</span>
            </div>
          </router-link>
        </div>

        <!-- 第二段：验证码 + 今日日程 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 最新验证码 -->
          <div class="card p-5">
            <p class="section-title mb-3">最新验证码</p>
            <div v-if="latestCode" class="space-y-3">
              <p class="text-3xl font-mono font-bold text-ink tracking-widest select-all">{{ latestCode.code }}</p>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-ink-faint font-mono">{{ latestCode.from_name || latestCode.from_address }}</p>
                  <p class="text-[10px] text-ink-faint font-mono mt-0.5">{{ formatCodeTime(latestCode.detected_at) }}</p>
                </div>
                <button @click="copyCode" class="btn btn-secondary btn-sm">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 text-ink-faint">
              <svg class="w-10 h-10 mb-2 text-line-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
              <p class="text-xs">暂无验证码</p>
            </div>
          </div>

          <!-- 今日日程 -->
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p class="section-title">今日日程</p>
              <router-link to="/calendar" class="text-[10px] font-mono text-ink-faint hover:text-ink">查看更多</router-link>
            </div>
            <div v-if="todayEvents.length > 0" class="space-y-2">
              <div
                v-for="event in todayEvents.slice(0, 5)"
                :key="event.id"
                class="p-2.5 rounded-card border text-sm"
                :class="event.source === 'ai' ? 'ai-suggestion' : 'manual-event'"
              >
                <p class="font-medium text-ink text-[13px]">{{ event.title }}</p>
                <p class="text-[11px] font-mono text-ink-faint mt-0.5">
                  {{ event.all_day ? '全天' : formatEventTime(event.start_time) }}
                  <span v-if="event.source === 'ai'" class="ml-1 text-stamp-red">AI</span>
                </p>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 text-ink-faint">
              <svg class="w-10 h-10 mb-2 text-line-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
              <p class="text-xs">今日无日程安排</p>
            </div>
          </div>
        </div>

        <!-- 第三段：账号健康状态 -->
        <div>
          <p class="section-title mb-3">账号状态</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            <div
              v-for="acc in accounts"
              :key="acc.id"
              class="card p-4 flex items-center space-x-3"
              :class="{ 'border-stamp-red': getAccountStatus(acc) !== 'normal' }"
            >
              <div
                class="w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                :class="getAccountStatus(acc) === 'normal' ? 'border-line-soft text-ink' : 'border-stamp-red text-stamp-red'"
              >
                {{ getAvatarChar(acc.name || acc.email) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{{ formatAccountName(acc.name, acc.email) }}</p>
                <p class="text-[11px] font-mono" :class="getAccountStatus(acc) === 'normal' ? 'text-ink-faint' : 'text-stamp-red'">
                  {{ getAccountStatusLabel(acc) }}
                </p>
              </div>
            </div>
          </div>
          <div v-if="accounts.length === 0" class="card p-6 flex flex-col items-center justify-center text-ink-faint">
            <svg class="w-10 h-10 mb-2 text-line-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            <p class="text-xs">暂未添加邮箱账号</p>
            <router-link to="/accounts/add" class="text-xs text-ink underline mt-1">添加账号</router-link>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { emailsApi, eventsApi, codesApi, accountsApi } from '@/api';
import { getAvatarChar, formatAccountName } from '@/utils/display';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const stats = ref({ unread: 0, starred: 0, unread_by_account: [] });
const latestCode = ref(null);
const todayEvents = ref([]);
const accounts = ref([]);
const pendingEventsCount = ref(0);
const copied = ref(false);

const formatCodeTime = (t) => t ? dayjs(t).format('HH:mm') : '';
const formatEventTime = (t) => t ? dayjs(t).format('HH:mm') : '';

const loadStats = async () => {
  try { const r = await emailsApi.stats(); if (r.success) stats.value = r.data; }
  catch (e) { console.error(e); }
};

const loadLatestCode = async () => {
  try {
    const r = await codesApi.list({ limit: 1 });
    if (r.success && r.data && r.data.length > 0) {
      const code = r.data[0];
      // 检查是否过期（30分钟内）
      const age = Date.now() - new Date(code.detected_at).getTime();
      if (age < 30 * 60 * 1000) {
        latestCode.value = code;
      }
    }
  } catch (e) { console.error(e); }
};

const loadTodayEvents = async () => {
  try {
    const r = await eventsApi.list({});
    if (r.success) {
      const today = dayjs().format('YYYY-MM-DD');
      todayEvents.value = (r.data || []).filter(e => {
        return dayjs(e.start_time).format('YYYY-MM-DD') === today;
      });
    }
  } catch (e) { console.error(e); }
};

const loadAccounts = async () => {
  try { const r = await accountsApi.list(); if (r.success) accounts.value = r.data || []; }
  catch (e) { console.error(e); }
};

const loadPendingEvents = async () => {
  try {
    const r = await eventsApi.list({});
    if (r.success) {
      pendingEventsCount.value = (r.data || []).filter(e => e.source === 'ai').length;
    }
  } catch (e) { console.error(e); }
};

const copyCode = async () => {
  if (!latestCode.value) return;
  try {
    await navigator.clipboard.writeText(latestCode.value.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (e) { console.error(e); }
};

const getAccountStatus = (acc) => {
  if (acc.last_error) return 'error';
  if (!acc.last_sync_at) return 'unknown';
  const age = Date.now() - new Date(acc.last_sync_at).getTime();
  if (age > 30 * 60 * 1000) return 'stale'; // 30分钟未同步
  return 'normal';
};

const getAccountStatusLabel = (acc) => {
  const status = getAccountStatus(acc);
  if (status === 'error') return '授权失效';
  if (status === 'unknown') return '未同步';
  if (status === 'stale') return '同步异常';
  return '正常';
};

onMounted(() => {
  loadStats();
  loadLatestCode();
  loadTodayEvents();
  loadAccounts();
  loadPendingEvents();
});
</script>
