<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="bg-paper border-b border-line-soft px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="btn btn-ghost btn-sm">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回
          </button>
          <h1 class="text-lg font-serif font-semibold text-ink truncate max-w-lg">{{ email.subject }}</h1>
        </div>

        <div class="flex items-center space-x-2">
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
          <div v-if="aiConfigured" class="border-l border-line-soft pl-2 ml-2 flex space-x-2">
            <button
              @click="summarizeEmail"
              :disabled="aiLoading"
              class="btn btn-secondary btn-sm"
            >
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
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
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-5 h-5 border-2 border-line-soft border-t-ink rounded-full animate-spin" />
    </div>

    <!-- Content -->
    <div v-else-if="email.id" class="flex-1 overflow-y-auto p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Email header card -->
        <div class="card p-6 mb-5">
          <h2 class="text-xl font-serif font-semibold text-ink mb-3">{{ email.subject }}</h2>
          <div class="flex items-center space-x-3 mb-4">
            <span class="badge text-[10px]">{{ formatAccountName(email.account_name, email.account_email) }}</span>
            <span class="text-xs font-mono text-ink-faint">{{ formatDate(email.received_at) }}</span>
          </div>

          <!-- Sender info -->
          <div class="flex items-center p-3 bg-paper-dim rounded-card">
            <div class="w-9 h-9 rounded-full border border-line-soft flex items-center justify-center mr-3">
              <span class="text-ink font-serif font-semibold text-sm">
                {{ (email.from_name || email.from_address || '?')[0].toUpperCase() }}
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

          <!-- Tags -->
          <div class="mt-4 pt-3 border-t border-line-soft">
            <div class="flex items-center justify-between mb-2">
              <span class="section-title">标签</span>
              <button @click="showTagModal = true" class="text-xs font-mono text-ink-faint hover:text-ink">+ 添加</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in emailTags"
                :key="tag.id"
                class="inline-flex items-center px-2 py-0.5 rounded-card text-[11px] font-mono border border-line-soft text-ink-faint"
              >
                {{ tag.name }}
                <button @click="removeTag(tag)" class="ml-1.5 text-ink-faint hover:text-stamp-red">&times;</button>
              </span>
              <span v-if="emailTags.length === 0" class="text-xs text-ink-faint">暂无标签</span>
            </div>
          </div>
        </div>

        <!-- Email body -->
        <div class="card p-6">
          <div v-if="email.body_html" class="prose prose-sm max-w-none email-content" v-html="sanitizedHtml" />
          <div v-else class="whitespace-pre-wrap text-sm text-ink leading-relaxed">{{ email.body_text }}</div>
        </div>

        <!-- AI Summary -->
        <div v-if="aiSummary" class="card p-5 mt-4 border-stamp-red">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono text-stamp-red font-medium uppercase tracking-wider">AI 摘要</span>
            <button @click="aiSummary = ''" class="text-ink-faint hover:text-ink">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-ink leading-relaxed">{{ aiSummary }}</p>
        </div>

        <!-- AI Loading -->
        <div v-if="aiLoading" class="card p-5 mt-4">
          <div class="flex items-center space-x-3">
            <div class="w-4 h-4 border-2 border-line-soft border-t-ink rounded-full animate-spin" />
            <span class="text-xs font-mono text-ink-faint">AI 处理中...</span>
          </div>
        </div>

        <!-- Suggested Events -->
        <div v-if="suggestedEvents.length > 0" class="card p-5 mt-4 border-stamp-red">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-mono text-stamp-red font-medium uppercase tracking-wider">识别到的日程</span>
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
              class="flex items-center justify-between p-3 bg-paper-dim rounded-card border border-line-soft"
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

    <!-- Error -->
    <div v-else class="flex-1 flex items-center justify-center text-ink-faint">
      <p class="text-sm">邮件加载失败</p>
    </div>

    <!-- Tag modal -->
    <div v-if="showTagModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper border border-line-soft rounded-card w-full max-w-md mx-4">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-serif font-semibold">添加标签</h2>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { emailsApi, tagsApi, aiApi, eventsApi } from '@/api';
import { formatAccountName } from '@/utils/display';
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

const sanitizedHtml = computed(() => {
  if (!email.value.body_html) return '';
  return email.value.body_html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
});

const loadEmail = async () => {
  loading.value = true;
  try {
    const result = await emailsApi.get(route.params.id);
    if (result.success) { email.value = result.data; loadEmailTags(); }
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

const goBack = () => router.push('/inbox');

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

onMounted(() => { loadEmail(); loadAllTags(); loadAiStatus(); });
</script>

<style scoped>
.email-content :deep(img) { max-width: 100%; height: auto; }
.email-content :deep(a) { color: #1A1A1A; text-decoration: underline; }
.email-content :deep(blockquote) { border-left: 2px solid #D9D6CC; padding-left: 1rem; margin-left: 0; color: #8C8878; }
</style>
