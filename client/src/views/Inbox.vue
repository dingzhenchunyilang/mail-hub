<template>
  <div class="h-full flex flex-col overflow-hidden">
    <header class="page-header pb-1.5">
      <div class="card mail-command-strip p-2.5 lg:p-2.5">
        <div class="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex flex-wrap items-end gap-3">
              <h1 class="page-title">收件箱</h1>
              <span class="badge">单屏 {{ pagination.limit }} 封</span>
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:self-start">
            <div
              v-for="metric in heroMetrics"
              :key="metric.label"
              class="mail-kpi min-w-[108px]"
              :class="metric.toneClass"
            >
              <p class="mail-kpi-label">{{ metric.label }}</p>
              <p class="mail-kpi-value">{{ metric.value }}</p>
            </div>
          </div>
        </div>

        <div class="mt-2.5 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div class="grid gap-2 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <label class="block">
              <span class="label">账号范围</span>
              <select
                v-model="selectedAccount"
                class="select"
                @change="loadEmails"
              >
                <option value="">全部账号</option>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ formatAccountName(account.name, account.email) }}
                </option>
              </select>
            </label>

            <label class="block">
              <span class="label">搜索主题 / 发件人</span>
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索主题、发件人或内容片段"
                  class="input py-2 pl-10"
                  @keyup.enter="loadEmails"
                />
                <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </label>
          </div>

          <div class="action-cluster xl:justify-end">
            <button @click="loadEmails" class="btn btn-secondary btn-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              刷新
            </button>
            <button
              @click="syncAllAccounts"
              :disabled="syncing"
              class="btn btn-primary btn-sm"
            >
              <svg v-if="syncing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ syncing ? '同步中...' : '同步全部' }}
            </button>
            <button
              v-if="!boostActive"
              @click="startBoost(selectedAccount)"
              class="btn btn-secondary btn-sm"
              title="开启加速轮询模式（15秒/次，持续5分钟）"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              等待验证码
            </button>
            <button
              v-else
              @click="cancelBoost"
              class="btn btn-danger btn-sm"
            >
              <svg class="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              加速中 {{ boostTimeDisplay() }}
            </button>
          </div>
        </div>

        <div class="mt-2 flex flex-col gap-2 border-t border-line-soft pt-2 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filters"
              :key="f.key"
              @click="setFilter(f.key)"
              :class="['mail-filter-chip', filter === f.key ? 'is-active' : '']"
            >
              {{ f.label }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in commonTags.slice(0, 5)"
              :key="tag.id"
              @click="setTagFilter(tag.name)"
              :class="['mail-filter-chip', selectedTag === tag.name ? 'is-active' : '']"
            >
              #{{ tag.name }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <section class="flex-1 min-h-0 px-4 pb-2 lg:px-6 lg:pb-2">
      <div ref="tableShellRef" class="mail-table-shell">
        <div ref="tableToolbarRef" class="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
          <div v-if="selectedIds.length > 0" class="mail-summary-line">
            <span class="badge">已选 {{ selectedIds.length }} 封</span>
            <button @click="toggleSelectPage" class="btn btn-secondary btn-sm">
              {{ allPageSelected ? '取消本页' : '全选本页' }}
            </button>
            <button @click="batchMarkRead" class="btn btn-secondary btn-sm">标记已读</button>
            <button @click="batchMarkUnread" class="btn btn-secondary btn-sm">标记未读</button>
            <button @click="batchDelete" class="btn btn-danger btn-sm">删除</button>
            <button @click="clearSelection" class="btn btn-ghost btn-sm">取消</button>
          </div>
          <div v-else class="mail-toolbar-note">
            <span class="data-chip">共 {{ pagination.total }} 封</span>
            <span class="data-chip">第 {{ pagination.page }} / {{ pagination.pages || 1 }} 页</span>
            <span v-if="selectedTag" class="data-chip">标签 {{ selectedTag }}</span>
            <span v-if="searchQuery" class="data-chip">搜索 {{ searchQuery }}</span>
            <button @click="toggleSelectPage" class="btn btn-secondary btn-sm">
              {{ allPageSelected ? '取消本页' : '全选本页' }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="!canPrevPage()"
              class="btn btn-secondary btn-sm disabled:opacity-30"
            >上一页</button>
            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="!canNextPage()"
              class="btn btn-secondary btn-sm disabled:opacity-30"
            >下一页</button>
          </div>
        </div>

        <div v-if="loading" class="flex flex-1 flex-col overflow-hidden">
          <div class="mail-list-header hidden lg:grid items-center gap-x-3" style="grid-template-columns: 1.5rem 1.2rem 1.5rem 5.4rem 7.6rem minmax(0,1fr) 1rem 4rem 2.5rem">
            <span></span>
            <span></span>
            <span></span>
            <span>账号</span>
            <span>发件人</span>
            <span>主题摘要</span>
            <span></span>
            <span class="text-right">时间</span>
            <span></span>
          </div>
          <div class="hidden flex-1 lg:block">
            <div class="divide-y divide-line-soft/70">
              <div
                v-for="index in pagination.limit"
                :key="index"
                class="mail-skeleton-row"
                style="grid-template-columns: 1.5rem 1.2rem 1.5rem 5.4rem 7.6rem minmax(0,1fr) 1rem 4rem 2.5rem"
              >
                <div class="mail-skeleton-block h-3 w-3 rounded-full"></div>
                <div class="mail-skeleton-block h-2.5 w-2.5 rounded-full"></div>
                <div class="mail-skeleton-block h-4 w-4 rounded-full"></div>
                <div class="mail-skeleton-block w-16"></div>
                <div class="mail-skeleton-block w-20"></div>
                <div class="mail-skeleton-block w-full"></div>
                <div class="mail-skeleton-block h-3 w-3 rounded-full"></div>
                <div class="mail-skeleton-block ml-auto w-10"></div>
                <div class="mail-skeleton-block ml-auto h-4 w-6 rounded-[0.4rem]"></div>
              </div>
            </div>
          </div>
          <div class="space-y-3 overflow-hidden p-4 lg:hidden">
            <div
              v-for="index in Math.max(3, Math.min(pagination.limit, 5))"
              :key="`mobile-skeleton-${index}`"
              class="mail-mobile-card"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="mail-skeleton-block w-24"></div>
                  <div class="mail-skeleton-block w-4/5"></div>
                  <div class="mail-skeleton-block w-full"></div>
                </div>
                <div class="mail-skeleton-block w-10"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="emails.length === 0" class="empty-state">
          <div class="empty-state-icon">
            <svg class="h-10 w-10 text-line-soft" fill="none" viewBox="0 0 80 80" stroke="currentColor" stroke-width="1.2">
              <rect x="15" y="20" width="50" height="35" rx="8" />
              <line x1="15" y1="30" x2="65" y2="30" />
              <rect x="35" y="55" width="4" height="15" rx="2" />
              <line x1="60" y1="25" x2="60" y2="15" stroke-width="1.5" />
              <line x1="60" y1="15" x2="68" y2="15" stroke-width="1.5" />
              <path d="M68 15 L68 22 L63 18.5 Z" fill="none" stroke-width="1.1" />
            </svg>
          </div>
          <p class="empty-state-title">没有命中当前结果</p>
          <p class="empty-state-copy">
            没有命中当前筛选。可以换一个账号、清掉搜索词，或者先同步一次看看有没有新邮件。
          </p>
        </div>

        <div v-else class="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div
            ref="desktopColumnsRef"
            class="mail-list-header hidden lg:grid items-center gap-x-3"
            style="grid-template-columns: 1.5rem 1.2rem 1.5rem 5.4rem 7.6rem minmax(0,1fr) 1rem 4rem 2.5rem"
          >
            <label class="flex items-center justify-center" @click.stop>
              <input
                type="checkbox"
                :checked="allPageSelected"
                :aria-label="allPageSelected ? '取消选择本页邮件' : '选择本页全部邮件'"
                @change="toggleSelectPage"
                class="h-3.5 w-3.5 cursor-pointer rounded border border-line-soft bg-paper text-stamp-red accent-[var(--stamp-red)]"
              />
            </label>
            <span></span>
            <span></span>
            <span>账号</span>
            <span>发件人</span>
            <span>主题摘要</span>
            <span></span>
            <span class="text-right">时间</span>
            <span></span>
          </div>

          <div ref="desktopListRef" class="hidden min-h-0 flex-1 overflow-hidden lg:block">
            <div class="h-full divide-y divide-line-soft/70 overflow-hidden">
              <div
                v-for="email in emails"
                :key="email.id"
                :class="['mail-list-row group grid cursor-pointer items-center gap-x-3 px-4 py-[0.65rem]', !email.is_read ? 'is-unread' : '']"
                style="grid-template-columns: 1.5rem 1.2rem 1.5rem 5.4rem 7.6rem minmax(0,1fr) 1rem 4rem 2.5rem"
                @click="openEmail(email)"
              >
                <label class="flex items-center justify-center" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(email.id)"
                    @change="toggleSelect(email.id)"
                    class="h-3.5 w-3.5 cursor-pointer rounded border border-line-soft bg-paper text-stamp-red accent-[var(--stamp-red)]"
                  />
                </label>

                <span class="flex items-center justify-center">
                  <span
                    v-if="!email.is_read"
                    class="h-2.5 w-2.5 rounded-full border-2 border-stamp-red bg-surface"
                    title="未读"
                  />
                  <span
                    v-else
                    class="h-1.5 w-1.5 rounded-full bg-ink-faint/80"
                    title="已读"
                  />
                </span>

                <button
                  @click.stop="toggleStar(email)"
                  class="text-ink-faint transition-colors hover:text-stamp-red"
                >
                  <svg
                    v-if="email.is_starred"
                    class="h-4 w-4 text-stamp-red"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <svg
                    v-else
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                  </svg>
                </button>

                <span
                  class="data-chip justify-center truncate"
                  :title="formatAccountFull(email.account_name, email.account_email)"
                >
                  {{ formatAccountName(email.account_name, email.account_email) }}
                </span>

                <div class="min-w-0">
                  <p class="truncate text-[13px] font-semibold text-ink">
                    {{ email.from_name || email.from_address }}
                  </p>
                  <p class="truncate text-[11px] font-mono text-ink-faint">{{ email.from_address }}</p>
                </div>

                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="mail-row-subject" :class="{ 'font-semibold': !email.is_read }">{{ email.subject || '(无主题)' }}</p>
                    <span
                      v-for="tag in (email.tags || []).slice(0, 2)"
                      :key="tag.id"
                      class="mail-row-tag"
                    >
                      {{ tag.name }}
                    </span>
                  </div>
                  <p class="mail-row-preview">{{ cleanPreview(email.preview) }}</p>
                </div>

                <div class="text-center text-ink-faint">
                  <svg v-if="email.has_attachments" class="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                </div>

                <div class="text-right">
                  <p class="text-xs font-mono text-ink-faint">{{ formatTime(email.received_at) }}</p>
                </div>

                <div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    @click.stop="archiveEmail(email)"
                    class="mail-icon-action"
                    title="归档"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteEmail(email)"
                    class="mail-icon-action is-danger"
                    title="删除"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div ref="mobileListRef" class="space-y-3 overflow-y-auto p-4 lg:hidden">
            <button
              v-for="email in emails"
              :key="email.id"
              class="mail-mobile-card block w-full"
              @click="openEmail(email)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span v-if="!email.is_read" class="h-2.5 w-2.5 rounded-full bg-stamp-red"></span>
                    <p class="truncate text-sm font-semibold text-ink">{{ email.from_name || email.from_address }}</p>
                  </div>
                  <p class="mt-1 truncate text-sm" :class="{ 'font-semibold': !email.is_read }">{{ email.subject || '(无主题)' }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-ink-faint">{{ cleanPreview(email.preview) }}</p>
                </div>
                <span class="text-[11px] font-mono text-ink-faint">{{ formatTime(email.received_at) }}</span>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <span class="data-chip">{{ formatAccountName(email.account_name, email.account_email) }}</span>
                <div class="flex items-center gap-2">
                  <svg v-if="email.has_attachments" class="h-4 w-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  <button
                    @click.stop="toggleStar(email)"
                    class="rounded-full p-1 text-ink-faint"
                  >
                    <svg class="h-4 w-4" :class="email.is_starred ? 'text-stamp-red' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path v-if="email.is_starred" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </button>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { emailsApi, accountsApi, tagsApi, codesApi } from '@/api';
import { formatAccountName, formatAccountFull, formatTime } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const router = useRouter();
const route = useRoute();
const dialog = useDialog();

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
const tableShellRef = ref(null);
const tableToolbarRef = ref(null);
const desktopColumnsRef = ref(null);
const desktopListRef = ref(null);
const mobileListRef = ref(null);

const boostActive = ref(false);
const boostRemaining = ref(0);
const boostAccountId = ref('');
let boostCountdownTimer = null;
let resizeTimer = null;

const heroMetrics = computed(() => [
  {
    label: '本页',
    value: emails.value.length,
    toneClass: '',
  },
  {
    label: '未读',
    value: emails.value.filter((email) => !email.is_read).length,
    toneClass: 'text-[color:var(--accent)]',
  },
  {
    label: '星标',
    value: emails.value.filter((email) => email.is_starred).length,
    toneClass: '',
  },
  {
    label: '附件',
    value: emails.value.filter((email) => email.has_attachments).length,
    toneClass: '',
  },
]);

const currentPageIds = computed(() => emails.value.map((email) => email.id));

const allPageSelected = computed(() => {
  if (currentPageIds.value.length === 0) return false;
  return currentPageIds.value.every((id) => selectedIds.value.includes(id));
});

const filters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'starred', label: '标星' },
  { key: 'archived', label: '已归档' },
];

const cleanPreview = (text) => {
  if (!text) return '';
  return text
    .replace(/\[image:[^\]]*\]/gi, '')
    .replace(/\[图片[^\]]*\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 84);
};

const getMeasuredLimit = () => {
  if (typeof window === 'undefined') return null;

  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    const shellHeight = tableShellRef.value?.clientHeight || 0;
    const toolbarHeight = tableToolbarRef.value?.offsetHeight || 0;
    const columnsHeight = desktopColumnsRef.value?.offsetHeight || 0;
    const firstRow = desktopListRef.value?.querySelector('.mail-list-row');
    const rowHeight = firstRow?.offsetHeight || 56;
    const availableHeight = shellHeight - toolbarHeight - columnsHeight;

    if (availableHeight <= 0) return null;
    return Math.max(5, Math.min(15, Math.floor(availableHeight / rowHeight)));
  }

  const shellHeight = tableShellRef.value?.clientHeight || 0;
  const toolbarHeight = tableToolbarRef.value?.offsetHeight || 0;
  const firstCard = mobileListRef.value?.querySelector('.mail-mobile-card');
  const rowHeight = firstCard?.offsetHeight ? firstCard.offsetHeight + 12 : 138;
  const availableHeight = shellHeight - toolbarHeight - 12;

  if (availableHeight <= 0) return null;
  return Math.max(3, Math.min(7, Math.floor(availableHeight / rowHeight)));
};

const syncPageLimitFromViewport = () => {
  if (typeof window === 'undefined') return false;

  const measuredLimit = getMeasuredLimit();
  if (measuredLimit !== null) {
    if (pagination.value.limit !== measuredLimit) {
      pagination.value.limit = measuredLimit;
      pagination.value.page = 1;
      return true;
    }
    return false;
  }

  const isDesktop = window.innerWidth >= 1024;
  const availableHeight = window.innerHeight - (isDesktop ? 284 : 392);
  const rowHeight = isDesktop ? 54 : 134;
  const maxRows = isDesktop ? 12 : 6;
  const nextLimit = Math.max(4, Math.min(maxRows, Math.floor(availableHeight / rowHeight)));

  if (pagination.value.limit !== nextLimit) {
    pagination.value.limit = nextLimit;
    pagination.value.page = 1;
    return true;
  }
  return false;
};

const applyRouteQuery = () => {
  selectedAccount.value = typeof route.query.account_id === 'string' ? route.query.account_id : '';
  searchQuery.value = typeof route.query.search === 'string' ? route.query.search : '';
  selectedTag.value = '';

  if (route.query.archived === '1') {
    filter.value = 'archived';
  } else if (route.query.starred === '1') {
    filter.value = 'starred';
  } else if (route.query.unread === '1') {
    filter.value = 'unread';
  } else {
    filter.value = 'all';
  }
};

const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (syncPageLimitFromViewport()) {
      loadEmails();
    }
  }, 120);
};

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
  const minutes = Math.floor(boostRemaining.value / 60);
  const seconds = boostRemaining.value % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

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

const loadAccounts = async () => {
  try {
    const result = await accountsApi.list();
    if (result.success) accounts.value = result.data;
  } catch (e) {
    console.error(e);
  }
};

const syncAllAccounts = async () => {
  syncing.value = true;
  try {
    const result = await accountsApi.syncAll();
    if (result.success) {
      loadEmails();
    } else {
      await dialog.alert('同步失败: ' + result.message);
    }
  } catch (e) {
    await dialog.alert('同步失败: ' + e.message);
  } finally {
    syncing.value = false;
  }
};

const loadTags = async () => {
  try {
    const result = await tagsApi.list();
    if (result.success) commonTags.value = result.data;
  } catch (e) {
    console.error(e);
  }
};

const loadEmails = async () => {
  loading.value = true;
  const requestedLimit = pagination.value.limit;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };

    if (filter.value === 'archived') {
      params.is_archived = 1;
    } else if (filter.value !== 'starred') {
      params.is_archived = 0;
    }

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
          } catch {
            email.tags = [];
          }
          return email;
        })
      );

      if (selectedTag.value) {
        emails.value = emailsWithTags.filter((email) => email.tags.some((tag) => tag.name === selectedTag.value));
      } else {
        emails.value = emailsWithTags;
      }

      selectedIds.value = selectedIds.value.filter((id) => emails.value.some((email) => email.id === id));

      pagination.value = {
        ...result.pagination,
        limit: pagination.value.limit,
      };
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
    await nextTick();

    if (pagination.value.limit === requestedLimit && syncPageLimitFromViewport()) {
      loadEmails();
    }
  }
};

const setFilter = (newFilter) => {
  filter.value = newFilter;
  selectedTag.value = '';
  pagination.value.page = 1;
  loadEmails();
};

const setTagFilter = (tagName) => {
  selectedTag.value = selectedTag.value === tagName ? '' : tagName;
  pagination.value.page = 1;
  loadEmails();
};

const goToPage = (page) => {
  pagination.value.page = page;
  loadEmails();
};

const canPrevPage = () => pagination.value.page > 1;
const canNextPage = () => pagination.value.page < pagination.value.pages;

const openEmail = async (email) => {
  if (!email.is_read) {
    email.is_read = 1;
    try {
      await emailsApi.stats();
    } catch {}
  }

  router.push({
    path: `/inbox/${email.id}`,
    query: { back: route.fullPath },
  });
};

const toggleSelect = (id) => {
  const index = selectedIds.value.indexOf(id);
  if (index === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(index, 1);
};

const clearSelection = () => {
  selectedIds.value = [];
};

const toggleSelectPage = () => {
  const ids = currentPageIds.value;
  if (ids.length === 0) return;

  if (allPageSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
    return;
  }

  const nextSelected = new Set(selectedIds.value);
  ids.forEach((id) => nextSelected.add(id));
  selectedIds.value = Array.from(nextSelected);
};

const toggleStar = async (email) => {
  try {
    await emailsApi.toggleStar(email.id);
    email.is_starred = !email.is_starred;
  } catch (e) {
    console.error(e);
  }
};

const archiveEmail = async (email) => {
  try {
    await emailsApi.archive(email.id);
    loadEmails();
  } catch (e) {
    console.error(e);
  }
};

const deleteEmail = async (email) => {
  if (email.is_starred) {
    await dialog.alert('星标邮件不能删除，请先取消星标');
    return;
  }
  if (!await dialog.confirm('确定删除这封邮件吗？')) return;
  try {
    await emailsApi.delete(email.id);
    loadEmails();
  } catch (e) {
    console.error(e);
  }
};

const batchMarkRead = async () => {
  try {
    await emailsApi.batchMarkRead(selectedIds.value, true);
    clearSelection();
    loadEmails();
  } catch (e) {
    console.error(e);
  }
};

const batchMarkUnread = async () => {
  try {
    await emailsApi.batchMarkRead(selectedIds.value, false);
    clearSelection();
    loadEmails();
  } catch (e) {
    console.error(e);
  }
};

const batchDelete = async () => {
  const starred = emails.value.filter((email) => selectedIds.value.includes(email.id) && email.is_starred);
  if (starred.length > 0) {
    await dialog.alert(`${starred.length} 封星标邮件不能删除，请先取消星标`);
    return;
  }
  if (!await dialog.confirm(`确定删除选中的 ${selectedIds.value.length} 封邮件吗？`)) return;
  try {
    await emailsApi.batchDelete(selectedIds.value);
    clearSelection();
    loadEmails();
  } catch (e) {
    console.error(e);
  }
};

watch(
  () => route.query,
  () => {
    applyRouteQuery();
    pagination.value.page = 1;
    loadEmails();
  }
);

onMounted(() => {
  applyRouteQuery();
  syncPageLimitFromViewport();
  loadAccounts();
  loadTags();
  checkBoostStatus();
  loadEmails();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (boostCountdownTimer) clearInterval(boostCountdownTimer);
  if (resizeTimer) clearTimeout(resizeTimer);
  window.removeEventListener('resize', handleResize);
});
</script>
