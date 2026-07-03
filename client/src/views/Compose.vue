<template>
  <div class="h-full flex flex-col">
    <!-- 页头 -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="btn btn-ghost btn-sm">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回
          </button>
          <h1 class="page-title text-xl">{{ isReply ? '回复邮件' : isForward ? '转发邮件' : '写新邮件' }}</h1>
        </div>

        <div class="flex items-center space-x-3">
          <button @click="saveDraft" class="btn btn-secondary btn-sm">保存草稿</button>
          <button @click="sendEmail" :disabled="sending" class="btn btn-primary">
            <svg
              class="w-4 h-4 mr-2"
              :class="{ 'send-flying': sending }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 主体 -->
    <div class="flex-1 overflow-hidden flex">
      <!-- 表单 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="max-w-5xl 2xl:max-w-7xl mx-auto">
          <div class="card">
            <!-- 发件账号 -->
            <div class="form-field px-6 first:pt-6">
              <label class="label">发件账号</label>
              <select v-model="form.account_id" class="select">
                <option value="" disabled>选择发件账号</option>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ formatAccountName(account.name, account.email) }}
                </option>
              </select>
            </div>

            <!-- 收件人 -->
            <div class="form-field px-6 relative">
              <label class="label">收件人</label>
              <input
                v-model="form.to"
                type="text"
                class="input"
                placeholder="输入邮箱地址..."
                @input="onToInput"
                @focus="showSuggestions = true"
                @blur="hideSuggestions"
                @keydown.down.prevent="moveSelection(1)"
                @keydown.up.prevent="moveSelection(-1)"
                @keydown.enter.prevent="selectSuggestion"
                @keydown.esc="showSuggestions = false"
              />
              <!-- 自动补全 -->
              <div
                v-if="showSuggestions && filteredContacts.length > 0"
                class="absolute z-10 w-full mt-1 bg-paper border border-line-soft rounded-card max-h-48 overflow-y-auto"
              >
                <div
                  v-for="(contact, index) in filteredContacts"
                  :key="contact.email"
                  @mousedown.prevent="selectContact(contact)"
                  :class="[
                    'px-4 py-2.5 cursor-pointer flex items-center justify-between',
                    index === selectedIndex ? 'bg-paper-dim text-ink' : 'hover:bg-paper-dim'
                  ]"
                >
                  <div class="flex items-center">
                    <div class="avatar mr-3">
                      <span v-if="getAvatarChar(null, contact.email)" class="avatar-text">{{ getAvatarChar(null, contact.email) }}</span>
                      <svg v-else class="w-3.5 h-3.5 avatar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <span class="text-sm">{{ contact.email }}</span>
                  </div>
                  <span class="text-xs text-ink-faint font-mono">{{ contact.count }}次</span>
                </div>
              </div>
            </div>

            <!-- 主题 -->
            <div class="form-field px-6">
              <label class="label">主题</label>
              <input v-model="form.subject" type="text" class="input" placeholder="邮件主题" />
            </div>

            <!-- 正文 -->
            <div class="px-6 pb-6 pt-4">
              <div class="flex items-center justify-between mb-1.5">
                <label class="label mb-0">正文</label>
                <div v-if="aiConfigured" class="flex items-center space-x-2">
                  <button
                    @click="polishEmail"
                    :disabled="aiLoading || !form.text"
                    class="btn btn-secondary btn-sm text-stamp-red border-stamp-red"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI 润色
                  </button>
                  <select v-model="polishTone" class="select w-24 text-xs py-1">
                    <option value="formal">正式</option>
                    <option value="brief">简短</option>
                    <option value="friendly">友好</option>
                  </select>
                </div>
              </div>
              <textarea
                v-model="form.text"
                class="textarea min-h-[300px] 2xl:min-h-[500px]"
                placeholder="输入邮件内容..."
              ></textarea>
              <div v-if="aiLoading" class="mt-2 flex items-center text-xs text-stamp-red font-mono">
                <div class="spinner w-4 h-4 mr-2 border-stamp-red border-t-stamp-red"></div>
                AI 正在润色...
              </div>
            </div>

            <!-- 签名 -->
            <div v-if="selectedAccount?.signature" class="px-6 pb-6">
              <div class="p-4 bg-paper-dim rounded-card border border-line-soft">
                <p class="text-xs text-ink-faint mb-2 font-mono uppercase tracking-wider">签名预览</p>
                <div class="text-sm text-ink" v-html="selectedAccount.signature"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 联系人侧边栏 -->
      <div class="w-64 2xl:w-80 border-l border-line-soft bg-paper-dim overflow-y-auto">
        <div class="p-4">
          <h3 class="section-title mb-3">最近联系人</h3>

          <!-- 搜索 -->
          <div class="relative mb-3">
            <input
              v-model="contactSearch"
              type="text"
              class="input text-xs py-1.5 pl-8"
              placeholder="搜索联系人..."
            />
            <svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          <!-- 列表 -->
          <div v-if="loadingContacts" class="text-center py-6 text-ink-faint text-xs font-mono">
            加载中...
          </div>
          <div v-else-if="filteredSidebarContacts.length === 0" class="text-center py-6 text-ink-faint text-xs">
            暂无联系人
          </div>
          <div v-else class="space-y-0.5">
            <div
              v-for="contact in filteredSidebarContacts"
              :key="contact.email"
              @click="selectContact(contact)"
              class="flex items-center p-2 rounded-card cursor-pointer hover:bg-paper transition-colors"
            >
              <div class="avatar mr-2">
                <span v-if="getAvatarChar(null, contact.email)" class="avatar-text text-xs">{{ getAvatarChar(null, contact.email) }}</span>
                <svg v-else class="w-3.5 h-3.5 avatar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-ink truncate">{{ contact.email }}</p>
                <p class="text-[10px] text-ink-faint font-mono">{{ contact.count }}次通信</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { accountsApi, emailsApi, aiApi } from '@/api';
import { formatAccountName, getAvatarChar } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';

const router = useRouter();
const route = useRoute();
const dialog = useDialog();

const accounts = ref([]);
const sending = ref(false);
const aiConfigured = ref(false);
const aiLoading = ref(false);
const polishTone = ref('formal');
const recentContacts = ref([]);
const loadingContacts = ref(false);
const contactSearch = ref('');
const showSuggestions = ref(false);
const selectedIndex = ref(-1);

const form = ref({
  account_id: route.query.account_id || '',
  to: route.query.reply_to || '',
  subject: route.query.subject || '',
  text: route.query.body || '',
});

const isReply = computed(() => !!route.query.reply_to);
const isForward = computed(() => !!route.query.body && !route.query.reply_to);

const selectedAccount = computed(() => {
  return accounts.value.find(a => a.id === form.value.account_id);
});

const filteredContacts = computed(() => {
  if (!form.value.to) return recentContacts.value.slice(0, 5);
  const search = form.value.to.toLowerCase();
  return recentContacts.value.filter(c =>
    c.email.toLowerCase().includes(search)
  ).slice(0, 5);
});

const filteredSidebarContacts = computed(() => {
  if (!contactSearch.value) return recentContacts.value;
  const search = contactSearch.value.toLowerCase();
  return recentContacts.value.filter(c =>
    c.email.toLowerCase().includes(search)
  );
});

const onToInput = () => {
  showSuggestions.value = true;
  selectedIndex.value = -1;
};

const hideSuggestions = () => {
  setTimeout(() => { showSuggestions.value = false; }, 200);
};

const moveSelection = (delta) => {
  const len = filteredContacts.value.length;
  if (len === 0) return;
  selectedIndex.value = (selectedIndex.value + delta + len) % len;
};

const selectSuggestion = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < filteredContacts.value.length) {
    selectContact(filteredContacts.value[selectedIndex.value]);
  }
};

const selectContact = (contact) => {
  form.value.to = contact.email;
  showSuggestions.value = false;
  selectedIndex.value = -1;
};

const loadAccounts = async () => {
  try {
    const result = await accountsApi.list();
    if (result.success) {
      accounts.value = result.data.filter(a => a.is_active);
      if (!form.value.account_id && accounts.value.length > 0) {
        form.value.account_id = accounts.value[0].id;
      }
    }
  } catch (e) { console.error(e); }
};

const loadContacts = async () => {
  loadingContacts.value = true;
  try {
    const result = await emailsApi.contacts();
    if (result.success) recentContacts.value = result.data;
  } catch (e) { console.error(e); }
  finally { loadingContacts.value = false; }
};

const goBack = () => router.back();

const saveDraft = async () => {
  const drafts = JSON.parse(localStorage.getItem('mail-hub-drafts') || '[]');
  drafts.push({ ...form.value, saved_at: new Date().toISOString() });
  localStorage.setItem('mail-hub-drafts', JSON.stringify(drafts));
  await dialog.alert('草稿已保存');
};

const sendEmail = async () => {
  if (!form.value.account_id) { await dialog.alert('请选择发件账号'); return; }
  if (!form.value.to) { await dialog.alert('请输入收件人'); return; }
  if (!form.value.subject) { await dialog.alert('请输入邮件主题'); return; }

  sending.value = true;
  try {
    const result = await emailsApi.send({
      account_id: form.value.account_id,
      to: form.value.to,
      subject: form.value.subject,
      text: form.value.text,
      reply_to: route.query.reply_to,
      in_reply_to: route.query.in_reply_to,
    });
    if (result.success) {
      await dialog.alert('邮件已发送');
      router.push('/inbox');
    } else {
      await dialog.alert('发送失败: ' + result.message);
    }
  } catch (e) {
    await dialog.alert('发送失败: ' + e.message);
  } finally {
    sending.value = false;
  }
};

const loadAiStatus = async () => {
  try {
    const result = await aiApi.status();
    if (result.success) aiConfigured.value = result.data.configured;
  } catch (e) { console.error(e); }
};

const polishEmail = async () => {
  if (!form.value.text) { await dialog.alert('请先输入邮件内容'); return; }
  aiLoading.value = true;
  try {
    const result = await aiApi.polish(form.value.text, polishTone.value);
    if (result.success) form.value.text = result.data.polished;
    else await dialog.alert('AI 润色失败: ' + result.message);
  } catch (e) { await dialog.alert('AI 润色失败: ' + e.message); }
  finally { aiLoading.value = false; }
};

onMounted(() => {
  loadAccounts();
  loadAiStatus();
  loadContacts();
});
</script>
