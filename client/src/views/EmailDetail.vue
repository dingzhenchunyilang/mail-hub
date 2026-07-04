<template>
  <div class="h-full flex flex-col">
    <header class="page-header pb-3">
      <div class="card flex flex-col gap-4 p-5 lg:p-5">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <button @click="goBack" class="btn btn-ghost btn-sm">
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回
            </button>
            <div class="min-w-0">
              <h1 class="max-w-lg truncate text-xl font-semibold tracking-[-0.03em] text-ink 2xl:max-w-2xl">{{ email.subject }}</h1>
            </div>
          </div>

          <div class="toolbar-actions">
            <button @click="reply" class="btn btn-secondary btn-sm">
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              回复
            </button>
            <button @click="forward" class="btn btn-secondary btn-sm">
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
              转发
            </button>
            <button @click="toggleStar" class="btn btn-ghost btn-sm">
              <svg
                :class="['w-4 h-4', email.is_starred ? 'text-stamp-red' : '']"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path v-if="email.is_starred" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </button>
            <button @click="archiveEmail" class="btn btn-ghost btn-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </button>
            <button @click="deleteEmail" class="btn btn-danger btn-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>

          <!-- AI buttons -->
            <div v-if="aiConfigured" class="ml-1 flex flex-wrap items-center gap-2 border-l border-line-soft pl-3">
              <button
                @click="summarizeEmail"
                :disabled="aiLoading"
                class="btn btn-secondary btn-sm"
              >
                <svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                摘要
              </button>
              <button
                @click="draftReply"
                :disabled="aiLoading"
                class="btn btn-secondary btn-sm"
              >
                AI 回复
              </button>
              <button
                @click="extractEvents"
                :disabled="aiLoading"
                class="btn btn-secondary btn-sm"
              >
                识别日程
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="spinner" />
    </div>

    <div v-else-if="email.id" class="flex-1 overflow-y-auto p-5 lg:p-6">
      <div class="max-w-4xl 2xl:max-w-6xl mx-auto">
        <div class="card mb-5 p-6">
          <h2 class="mb-3 text-xl font-semibold tracking-[-0.03em] text-ink">{{ email.subject }}</h2>
          <div class="mb-4 flex items-center space-x-3">
            <span class="badge text-[10px]">{{ formatAccountName(email.account_name, email.account_email) }}</span>
            <span class="text-xs font-mono text-ink-faint">{{ formatDate(email.received_at) }}</span>
          </div>

          <div class="mail-detail-meta flex items-center rounded-card border border-line-soft p-3">
            <div class="mr-3 flex h-9 w-9 items-center justify-center rounded-full border border-line-soft">
              <span class="text-sm font-semibold text-ink">
                {{ getAvatarChar(email.from_name || email.from_address) }}
              </span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-ink">{{ email.from_name || email.from_address }}</p>
              <p class="text-[11px] font-mono text-ink-faint">{{ email.from_address }}</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] font-mono text-ink-faint">to: {{ email.to_address }}</p>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-line-soft">
            <div class="mb-2 flex items-center justify-between">
              <span class="section-title">标签</span>
              <button @click="showTagModal = true" class="text-xs font-mono text-ink-faint hover:text-ink">+ 添加</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in emailTags"
                :key="tag.id"
                class="mail-detail-tag inline-flex items-center px-2 py-0.5 rounded-card text-[11px] font-mono border border-line-soft text-ink-faint"
              >
                {{ tag.name }}
                <button @click="removeTag(tag)" class="ml-1.5 text-ink-faint hover:text-stamp-red">&times;</button>
              </span>
              <span v-if="emailTags.length === 0" class="text-xs text-ink-faint">暂无标签</span>
            </div>
            <div v-if="hasAdTag" class="mt-2 pt-2 border-t border-line-soft">
              <button
                @click="whitelistSender"
                class="text-[11px] font-mono text-ink-faint hover:text-ink transition-colors"
              >
                不再标记 {{ email.from_address }} 为广告
              </button>
            </div>
          </div>
        </div>

        <div v-if="translationResult" class="card mb-4 flex items-center justify-between px-4 py-2">
          <div class="flex items-center space-x-1">
            <button
              @click="viewMode = 'original'"
              :class="[
                'mail-view-tab px-3 py-1 rounded-card text-xs font-mono transition-colors',
                viewMode === 'original'
                  ? 'is-active'
                  : 'text-ink-faint hover:text-ink'
              ]"
            >仅原文</button>
            <button
              @click="viewMode = 'parallel'"
              :class="[
                'mail-view-tab px-3 py-1 rounded-card text-xs font-mono transition-colors',
                viewMode === 'parallel'
                  ? 'is-active'
                  : 'text-ink-faint hover:text-ink'
              ]"
            >对照</button>
            <button
              @click="viewMode = 'translated'"
              :class="[
                'mail-view-tab px-3 py-1 rounded-card text-xs font-mono transition-colors',
                viewMode === 'translated'
                  ? 'is-active'
                  : 'text-ink-faint hover:text-ink'
              ]"
            >仅译文</button>
          </div>
          <div class="flex items-center space-x-2">
            <span v-if="translationResult.cached" class="text-[10px] font-mono text-ink-faint">缓存</span>
            <button
              @click="forceTranslate"
              :disabled="translating"
              class="text-[10px] font-mono text-ink-faint hover:text-ink"
            >重新翻译</button>
          </div>
        </div>

        <div v-if="translating && !translationResult" class="card p-6">
          <div class="space-y-4">
            <div v-for="i in 6" :key="i" class="mail-translation-skeleton h-4 rounded animate-pulse" :style="{ width: `${90 - i * 10}%` }" />
          </div>
          <p class="text-xs font-mono text-ink-faint mt-4">翻译中，请稍候...</p>
        </div>

        <div v-else-if="!translationResult || viewMode === 'original'" class="card p-6">
          <div v-if="email.body_html" class="prose prose-sm max-w-none email-content" v-html="sanitizedHtml" />
          <div v-else class="whitespace-pre-wrap text-sm text-ink leading-relaxed">{{ email.body_text }}</div>
        </div>

        <div v-else-if="viewMode === 'parallel' && translationResult" class="card overflow-hidden">
          <div class="hidden md:grid md:grid-cols-2">
            <div class="mail-reading-pane p-6 space-y-4 border-r border-line-soft">
              <div
                v-for="(para, i) in translationResult.paragraphs"
                :key="'o-' + i"
                class="relative"
              >
                <span class="mail-pane-label absolute -top-3 left-0 text-[9px] font-mono text-ink-faint px-1 select-none">原文</span>
                <div class="text-sm text-ink leading-relaxed translation-para" v-html="para.original_html" />
              </div>
            </div>
            <div class="mail-reading-pane p-6 space-y-4">
              <div
                v-for="(para, i) in translationResult.paragraphs"
                :key="'t-' + i"
                class="mail-reading-block relative rounded-card p-4"
              >
                <span class="mail-pane-label absolute -top-3 left-3 text-[9px] font-mono text-ink-faint px-1 select-none">译文</span>
                <div class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ para.translated_text }}</div>
              </div>
            </div>
          </div>

          <div class="md:hidden p-4 space-y-3">
            <template v-for="(para, i) in translationResult.paragraphs" :key="'m-' + i">
              <div class="mail-reading-pane relative rounded-card p-3">
                <span class="mail-pane-label absolute -top-2 left-2 text-[9px] font-mono text-ink-faint px-1 select-none">原文</span>
                <div class="text-sm text-ink leading-relaxed translation-para mt-1" v-html="para.original_html" />
              </div>
              <div class="mail-reading-block relative rounded-card p-3">
                <span class="mail-pane-label absolute -top-2 left-4 text-[9px] font-mono text-ink-faint px-1 select-none">译文</span>
                <div class="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-1">{{ para.translated_text }}</div>
              </div>
            </template>
          </div>
        </div>

        <div v-else-if="viewMode === 'translated' && translationResult" class="card p-6">
          <div class="space-y-4">
            <div
              v-for="(para, i) in translationResult.paragraphs"
              :key="'to-' + i"
              class="mail-reading-block rounded-card p-4"
            >
              <div class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ para.translated_text }}</div>
            </div>
          </div>
        </div>

        <div v-if="translationError" class="card mt-4 border-[color:rgba(209,67,67,0.18)] bg-[color:rgba(209,67,67,0.04)] p-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-stamp-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span class="text-sm text-stamp-red">{{ translationError }}</span>
            </div>
            <button @click="translationError = ''" class="text-ink-faint hover:text-ink">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="aiSummary" class="card mt-4 border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono font-medium uppercase tracking-[0.08em] text-[color:var(--accent)]">AI 摘要</span>
            <button @click="aiSummary = ''" class="text-ink-faint hover:text-ink">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-ink leading-relaxed">{{ aiSummary }}</p>
        </div>

        <div v-if="aiLoading" class="card p-5 mt-4">
          <div class="flex items-center space-x-3">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-line-soft border-t-[color:var(--accent)]" />
            <span class="text-xs font-mono text-ink-faint">AI 处理中...</span>
          </div>
        </div>

        <div v-if="suggestedEvents.length > 0" class="card mt-4 border-[color:var(--accent)] p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-mono font-medium uppercase tracking-[0.08em] text-[color:var(--accent)]">识别到的日程</span>
            <button @click="suggestedEvents = []" class="text-ink-faint hover:text-ink">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-3">
            <div
              v-for="(event, idx) in suggestedEvents"
              :key="idx"
              class="mail-reading-pane flex items-center justify-between rounded-card border border-line-soft p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink">{{ event.title }}</p>
                <p class="text-xs font-mono text-ink-faint mt-0.5">
                  {{ event.start_time ? formatEventTime(event.start_time) : '时间待定' }}
                  <span v-if="event.notes"> · {{ event.notes }}</span>
                </p>
              </div>
              <button
                @click="addEventToCalendar(event)"
                class="btn btn-primary btn-sm ml-3 flex-shrink-0"
                :disabled="event._added"
              >
                {{ event._added ? '已添加' : '添加到日程' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-ink-faint">
      <p class="text-sm">邮件加载失败</p>
    </div>

    <div v-if="showTagModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay)]">
      <div class="mail-floating-panel mx-4 w-full max-w-md rounded-card border border-line-soft">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-semibold tracking-[-0.03em]">添加标签</h2>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="label">选择标签</label>
            <select v-model="selectedTagId" class="input">
              <option value="">请选择标签</option>
              <option v-for="tag in availableTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
          </div>
          <p class="text-xs text-ink-faint">
            没有想要的标签？去 <router-link to="/tags" class="text-ink underline">标签管理</router-link> 创建
          </p>
        </div>
        <div class="p-5 border-t border-line-soft flex justify-end space-x-3">
          <button @click="showTagModal = false" class="btn btn-secondary">取消</button>
          <button @click="addTag" class="btn btn-primary">添加</button>
        </div>
      </div>
    </div>

    <div v-if="translationConfigured && email.id && !loading" class="fixed bottom-6 right-6 z-40 flex items-end space-x-2">
      <div
        v-if="showTranslatePanel"
        class="mail-floating-panel mb-1 space-y-2 rounded-card border border-line-soft p-3 shadow-lg"
        style="min-width: 160px;"
      >
        <select
          v-model="targetLang"
          @change="onTargetLangChange"
          class="mail-floating-select w-full rounded-card border border-line-soft px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-[color:var(--accent)]"
          style="font-family: 'JetBrains Mono', monospace;"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="ko">한국어</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
        </select>
        <button
          @click="doTranslate(); showTranslatePanel = false"
          :disabled="translating"
          class="btn btn-primary btn-sm w-full"
        >
          {{ translating ? '翻译中...' : '开始翻译' }}
        </button>
        <button
          v-if="translationResult"
          @click="forceTranslate(); showTranslatePanel = false"
          :disabled="translating"
          class="btn btn-secondary btn-sm w-full text-xs"
        >
          重新翻译
        </button>
      </div>

      <button
        @click="showTranslatePanel = !showTranslatePanel"
        :disabled="translating"
        class="mail-translate-fab flex h-12 w-12 items-center justify-center rounded-[0.875rem] border transition-all duration-200"
        :class="translationResult
          ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-paper hover:bg-[color:var(--accent-strong)] hover:border-[color:var(--accent-strong)]'
          : 'border-line-soft text-ink shadow-md hover:border-[color:var(--accent)]'"
        :title="translating ? '翻译中...' : '翻译'"
      >
        <svg v-if="translating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { emailsApi, tagsApi, aiApi, eventsApi, translationApi, rulesApi } from '@/api';
import { formatAccountName, getAvatarChar } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
const router = useRouter();
const route = useRoute();
const dialog = useDialog();

const email = ref({});
const emailTags = ref([]);
const allTags = ref([]);
const loading = ref(true);
const showTagModal = ref(false);
const selectedTagId = ref('');
const aiConfigured = ref(false);
const aiLoading = ref(false);
const aiSummary = ref('');
const suggestedEvents = ref([]);

// 翻译状态
const translationConfigured = ref(false);
const translating = ref(false);
const showTranslatePanel = ref(false);
const translationError = ref('');
const translationResult = ref(null); // { paragraphs, source_lang, target_lang, cached }
const targetLang = ref('zh');
const viewMode = ref('original'); // 'original' | 'parallel' | 'translated'

const formatDate = (d) => d ? dayjs(d).format('YYYY年M月D日 HH:mm:ss') : '';

const formatEventTime = (t) => {
  if (!t) return '';
  const d = dayjs(t);
  return d.format('M月D日 HH:mm');
};

const availableTags = computed(() => {
  const ids = emailTags.value.map(t => t.id);
  return allTags.value.filter(t => !ids.includes(t.id));
});

const hasAdTag = computed(() => emailTags.value.some(t => t.name === '广告'));

const whitelistSender = async () => {
  try {
    await rulesApi.addWhitelist(email.value.from_address, email.value.from_name || '');
    // 移除已有的广告标签
    const adTag = emailTags.value.find(t => t.name === '广告');
    if (adTag) {
      await tagsApi.removeEmailTag(email.value.id, adTag.id);
      emailTags.value = emailTags.value.filter(t => t.id !== adTag.id);
    }
    await dialog.alert(`${email.value.from_address} 已加入广告白名单，后续邮件不会再被标记为广告`);
  } catch (e) { await dialog.alert('操作失败: ' + e.message); }
};

const sanitizedHtml = computed(() => {
  if (!email.value.body_html) return '';
  return email.value.body_html
    // 移除 script 标签
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除 IE 条件注释（VML 样式藏在里面）
    .replace(/<!--\[if[\s\S]*?endif\]-->/gi, '')
    // 移除 Outlook VML 元素
    .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '')
    .replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '');
});

const loadEmail = async () => {
  loading.value = true;
  try {
    const result = await emailsApi.get(route.params.id);
    if (result.success) {
      email.value = result.data;
      loadEmailTags();
      detectDefaultTargetLang();
      checkTranslationCache();
    }
    else { await dialog.alert('邮件加载失败: ' + result.message); }
  } catch (e) { await dialog.alert('邮件加载失败'); }
  finally { loading.value = false; }
};

const loadEmailTags = async () => {
  try {
    const r = await tagsApi.getEmailTags(route.params.id);
    if (r.success) emailTags.value = r.data;
  } catch (e) { console.error(e); }
};

const loadAllTags = async () => {
  try {
    const r = await tagsApi.list();
    if (r.success) allTags.value = r.data;
  } catch (e) { console.error(e); }
};

const goBack = () => {
  if (typeof route.query.back === 'string' && route.query.back) {
    router.push(route.query.back);
    return;
  }
  router.push('/inbox');
};

const reply = () => {
  router.push({
    path: '/compose',
    query: { reply_to: email.value.from_address, subject: `Re: ${email.value.subject}`, account_id: email.value.account_id, in_reply_to: email.value.message_id },
  });
};

const forward = () => {
  router.push({
    path: '/compose',
    query: {
      subject: `Fwd: ${email.value.subject}`,
      body: `\n\n---------- 转发的邮件 ----------\n发件人: ${email.value.from_name} <${email.value.from_address}>\n日期: ${formatDate(email.value.received_at)}\n主题: ${email.value.subject}\n\n${email.value.body_text}`,
      account_id: email.value.account_id,
    },
  });
};

const toggleStar = async () => {
  try { await emailsApi.toggleStar(email.value.id); email.value.is_starred = !email.value.is_starred; }
  catch (e) { console.error(e); }
};
const archiveEmail = async () => {
  try { await emailsApi.archive(email.value.id); router.push('/inbox'); }
  catch (e) { console.error(e); }
};
const deleteEmail = async () => {
  if (email.value.is_starred) { await dialog.alert('星标邮件不能删除，请先取消星标'); return; }
  if (!await dialog.confirm('确定删除这封邮件吗？')) return;
  try { await emailsApi.delete(email.value.id); router.push('/inbox'); }
  catch (e) { console.error(e); }
};

const addTag = async () => {
  if (!selectedTagId.value) { await dialog.alert('请选择标签'); return; }
  try {
    await tagsApi.addEmailTag(route.params.id, selectedTagId.value);
    showTagModal.value = false; selectedTagId.value = ''; loadEmailTags();
  } catch (e) { await dialog.alert('添加失败: ' + e.message); }
};

const removeTag = async (tag) => {
  try { await tagsApi.removeEmailTag(route.params.id, tag.id); loadEmailTags(); }
  catch (e) { await dialog.alert('移除失败: ' + e.message); }
};

const loadAiStatus = async () => {
  try {
    const r = await aiApi.status();
    if (r.success) aiConfigured.value = r.data.configured;
  } catch (e) { console.error(e); }
  try {
    const r = await translationApi.status();
    if (r.success) translationConfigured.value = r.data.configured;
  } catch (e) { console.error(e); }
};

const summarizeEmail = async () => {
  aiLoading.value = true; aiSummary.value = '';
  try {
    const r = await aiApi.summarize(email.value.id);
    if (r.success) aiSummary.value = r.data.summary;
    else await dialog.alert('AI 摘要失败: ' + r.message);
  } catch (e) { await dialog.alert('AI 摘要失败: ' + e.message); }
  finally { aiLoading.value = false; }
};

const draftReply = async () => {
  const tone = prompt('回复语调：\n1. formal - 正式\n2. brief - 简短\n3. friendly - 友好', 'formal');
  if (!tone) return;
  aiLoading.value = true;
  try {
    const r = await aiApi.draftReply(email.value.id, tone);
    if (r.success) {
      router.push({
        path: '/compose',
        query: { reply_to: email.value.from_address, subject: `Re: ${email.value.subject}`, account_id: email.value.account_id, in_reply_to: email.value.message_id, body: r.data.draft },
      });
    } else await dialog.alert('AI 帮写失败: ' + r.message);
  } catch (e) { await dialog.alert('AI 帮写失败: ' + e.message); }
  finally { aiLoading.value = false; }
};

const extractEvents = async () => {
  aiLoading.value = true;
  suggestedEvents.value = [];
  try {
    const r = await aiApi.extractEvents(email.value.id);
    if (r.success) {
      suggestedEvents.value = (r.data.events || []).map(e => ({ ...e, _added: false }));
      if (suggestedEvents.value.length === 0) {
        await dialog.alert('这封邮件中没有识别到日程信息');
      }
    } else await dialog.alert('识别失败: ' + r.message);
  } catch (e) { await dialog.alert('识别失败: ' + e.message); }
  finally { aiLoading.value = false; }
};

const addEventToCalendar = async (event) => {
  try {
    const data = {
      title: event.title,
      start_time: event.start_time ? new Date(event.start_time).toISOString() : new Date().toISOString(),
      end_time: event.end_time ? new Date(event.end_time).toISOString() : null,
      notes: event.notes || '',
      source: 'ai',
    };
    const r = await eventsApi.create(data);
    if (r.success) {
      event._added = true;
    } else await dialog.alert('添加失败: ' + r.message);
  } catch (e) { await dialog.alert('添加失败: ' + e.message); }
};

// ── 翻译功能 ──

// 自动检测默认目标语言
const detectDefaultTargetLang = () => {
  const text = email.value.body_text || email.value.preview || email.value.subject || '';
  const sample = text.substring(0, 500);
  const cjkCount = (sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const totalCount = sample.replace(/\s/g, '').length;
  if (totalCount > 0 && cjkCount / totalCount > 0.3) {
    targetLang.value = 'en'; // 中文 → 英文
  } else {
    targetLang.value = 'zh'; // 其他 → 中文
  }
};

// 检查是否有缓存翻译
const checkTranslationCache = async () => {
  if (!email.value.id) return;
  try {
    const r = await translationApi.getCached(email.value.id, targetLang.value);
    if (r.success && r.data) {
      translationResult.value = r.data;
      viewMode.value = 'parallel';
    }
  } catch (e) { /* 无缓存，忽略 */ }
};

// 执行翻译
const doTranslate = async (forceRefresh = false) => {
  if (!translationConfigured.value) {
    await dialog.alert('翻译服务未配置，请在设置中配置翻译 API Key');
    return;
  }

  translating.value = true;
  translationError.value = '';

  try {
    const r = await translationApi.translate(email.value.id, targetLang.value, forceRefresh);
    if (r.success) {
      translationResult.value = r.data;
      viewMode.value = 'parallel';
    } else {
      translationError.value = r.message || '翻译失败，请检查 API 配置或重试';
    }
  } catch (e) {
    translationError.value = e.message || '翻译失败，请检查 API 配置或重试';
  } finally {
    translating.value = false;
  }
};

// 切换目标语言时自动检查缓存
const onTargetLangChange = async () => {
  translationResult.value = null;
  translationError.value = '';
  viewMode.value = 'original';
  await checkTranslationCache();
};

// 重新翻译（强制刷新缓存）
const forceTranslate = () => doTranslate(true);

onMounted(() => { loadEmail(); loadAllTags(); loadAiStatus(); });
</script>

<style scoped>
.mail-detail-meta,
.mail-reading-pane {
  background: rgba(245, 247, 251, 0.92);
}

.mail-detail-tag,
.mail-reading-block {
  background: rgba(248, 250, 253, 0.9);
}

.mail-view-tab {
  background: transparent;
}

.mail-view-tab:hover {
  background: var(--paper-dim);
}

.mail-view-tab.is-active {
  background: var(--ink);
  color: var(--paper);
}

.mail-translation-skeleton {
  background: var(--paper-dim);
}

.mail-pane-label {
  background: var(--surface);
}

.mail-floating-panel {
  background: var(--surface);
}

.mail-floating-select {
  background: var(--surface-muted);
}

.mail-translate-fab {
  background: var(--surface);
}

.email-content :deep(img) { max-width: 100%; height: auto; }
.email-content :deep(a) { color: var(--ink); text-decoration: underline; }
.email-content :deep(blockquote) { border-left: 2px solid var(--line-soft); padding-left: 1rem; margin-left: 0; color: var(--ink-faint); }
.email-content :deep(table),
.email-content :deep(tbody),
.email-content :deep(tr),
.email-content :deep(td),
.email-content :deep(th),
.email-content :deep(div),
.email-content :deep(section),
.email-content :deep(article) {
  background: transparent !important;
}

.email-content :deep([style*="background"]),
.email-content :deep([bgcolor]) {
  background: transparent !important;
  background-color: transparent !important;
}

.email-content :deep(body),
.email-content :deep(p),
.email-content :deep(span),
.email-content :deep(td),
.email-content :deep(th),
.email-content :deep(div),
.email-content :deep(li),
.email-content :deep(h1),
.email-content :deep(h2),
.email-content :deep(h3),
.email-content :deep(h4),
.email-content :deep(h5),
.email-content :deep(h6) {
  color: var(--ink) !important;
}

.translation-para :deep(p) { margin: 0 0 0.5em 0; }
.translation-para :deep(p:last-child) { margin-bottom: 0; }
.translation-para :deep(a) { color: var(--accent); text-decoration: underline; }
.translation-para :deep(blockquote) { border-left: 2px solid var(--line-soft); padding-left: 0.75rem; color: var(--ink-faint); }
.translation-para :deep(ul), .translation-para :deep(ol) { padding-left: 1.5rem; margin: 0.25em 0; }
.translation-para :deep(li) { margin: 0.15em 0; }
.translation-para :deep(strong) { font-weight: 600; }
.translation-para :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; background: var(--paper-dim); padding: 0.1em 0.3em; border-radius: 3px; }
.translation-para :deep(pre) { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; background: var(--paper-dim); padding: 0.75rem; border-radius: 5px; overflow-x: auto; }

:global(.dark) .mail-detail-meta,
:global(.dark) .mail-reading-pane {
  background: rgba(16, 27, 41, 0.9);
}

:global(.dark) .mail-detail-tag,
:global(.dark) .mail-reading-block {
  background: rgba(18, 29, 44, 0.94);
}

:global(.dark) .mail-view-tab:hover {
  background: rgba(18, 29, 44, 0.96);
}

:global(.dark) .mail-view-tab.is-active {
  background: rgba(226, 232, 240, 0.12);
  color: var(--ink);
}

:global(.dark) .mail-translation-skeleton {
  background: rgba(36, 50, 70, 0.9);
}

:global(.dark) .mail-pane-label {
  background: rgba(10, 17, 27, 0.96);
}

:global(.dark) .mail-floating-panel {
  background: linear-gradient(180deg, rgba(14, 24, 38, 0.98), rgba(10, 17, 27, 0.96));
}

:global(.dark) .mail-floating-select,
:global(.dark) .mail-translate-fab {
  background: rgba(16, 27, 41, 0.94);
}
</style>
