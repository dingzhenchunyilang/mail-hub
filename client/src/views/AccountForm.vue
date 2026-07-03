<template>
  <div class="h-full flex flex-col">
    <!-- 顶部导航 -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="btn btn-secondary btn-sm">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
          <h1 class="page-title">{{ isEditing ? '编辑账号' : '添加账号' }}</h1>
        </div>
      </div>
    </header>

    <!-- 表单内容 -->
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto">
        <!-- 邮箱预设模板 -->
        <div v-if="!isEditing" class="card p-6 mb-6">
          <h3 class="text-lg font-serif font-semibold mb-4">快速配置</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              v-for="preset in presets"
              :key="preset.name"
              @click="applyPreset(preset)"
              class="p-4 border border-line-soft rounded-card hover:border-ink transition-colors text-center bg-paper"
            >
              <div class="text-sm font-mono font-medium text-ink">{{ preset.name }}</div>
            </button>
          </div>
        </div>

        <!-- 账号表单 -->
        <div class="card p-6">
          <h3 class="text-lg font-serif font-semibold mb-6">账号信息</h3>

          <form @submit.prevent="submitForm">
            <!-- 基本信息 -->
            <div class="space-y-4 mb-8">
              <div>
                <label class="label">账号名称 <span class="text-stamp-red">*</span></label>
                <input v-model="form.name" type="text" class="input" placeholder="例如：工作邮箱" required />
              </div>

              <div>
                <label class="label">邮箱地址 <span class="text-stamp-red">*</span></label>
                <input v-model="form.email" type="email" class="input" placeholder="your@email.com" required />
              </div>

              <div>
                <label class="label">登录用户名 <span class="text-stamp-red">*</span></label>
                <input v-model="form.username" type="text" class="input" placeholder="通常是完整的邮箱地址" required />
                <p class="text-xs text-ink-faint mt-1">大多数邮箱使用完整邮箱地址作为用户名</p>
              </div>

              <div>
                <label class="label">密码/授权码 <span class="text-stamp-red">*</span></label>
                <input v-model="form.password" type="password" class="input" :placeholder="isEditing ? '留空则不修改' : '输入密码或授权码'" :required="!isEditing" />
                <p class="text-xs text-ink-faint mt-1">
                  Gmail/Outlook/QQ邮箱等需要使用"应用专用密码"或"授权码"，不是登录密码
                </p>
              </div>

              <div>
                <label class="label">邮件签名</label>
                <textarea v-model="form.signature" class="input h-24" placeholder="可选，添加邮件签名"></textarea>
              </div>
            </div>

            <!-- IMAP 设置 -->
            <div class="mb-8">
              <h4 class="section-title mb-4 pb-2 border-b border-line-soft">IMAP 设置（接收邮件）</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">IMAP 服务器 <span class="text-stamp-red">*</span></label>
                  <input v-model="form.imap_host" type="text" class="input" placeholder="imap.gmail.com" required />
                </div>
                <div>
                  <label class="label">端口</label>
                  <input v-model.number="form.imap_port" type="number" class="input" />
                </div>
                <div class="col-span-2">
                  <label class="flex items-center space-x-2">
                    <input v-model="form.imap_secure" type="checkbox" class="rounded border-line-soft text-ink focus:ring-ink-faint" />
                    <span class="text-sm text-ink">使用 SSL/TLS 加密</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- SMTP 设置 -->
            <div class="mb-8">
              <h4 class="section-title mb-4 pb-2 border-b border-line-soft">SMTP 设置（发送邮件）</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">SMTP 服务器 <span class="text-stamp-red">*</span></label>
                  <input v-model="form.smtp_host" type="text" class="input" placeholder="smtp.gmail.com" required />
                </div>
                <div>
                  <label class="label">端口</label>
                  <input v-model.number="form.smtp_port" type="number" class="input" />
                </div>
                <div class="col-span-2">
                  <label class="flex items-center space-x-2">
                    <input v-model="form.smtp_secure" type="checkbox" class="rounded border-line-soft text-ink focus:ring-ink-faint" />
                    <span class="text-sm text-ink">使用 SSL/TLS 加密</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <div class="flex justify-end space-x-3">
              <button type="button" @click="goBack" class="btn btn-secondary">取消</button>
              <button type="submit" :disabled="submitting" class="btn btn-primary">
                {{ submitting ? '保存中...' : (isEditing ? '保存修改' : '添加账号') }}
              </button>
            </div>
          </form>
        </div>

        <!-- 常见邮箱配置帮助 -->
        <div class="p-6 mt-6 bg-paper-dim rounded-card">
          <h3 class="text-lg font-serif font-semibold mb-4">常见邮箱配置参考</h3>
          <div class="space-y-4 text-sm">
            <div>
              <h4 class="font-medium text-ink font-mono">Gmail</h4>
              <p class="text-ink">IMAP: imap.gmail.com:993 (SSL) | SMTP: smtp.gmail.com:587 (STARTTLS)</p>
              <p class="text-ink-faint">需要开启"两步验证"后生成"应用专用密码"</p>
            </div>
            <div>
              <h4 class="font-medium text-ink font-mono">Outlook/Hotmail</h4>
              <p class="text-ink">IMAP: outlook.office365.com:993 (SSL) | SMTP: smtp.office365.com:587 (STARTTLS)</p>
            </div>
            <div>
              <h4 class="font-medium text-ink font-mono">QQ邮箱</h4>
              <p class="text-ink">IMAP: imap.qq.com:993 (SSL) | SMTP: smtp.qq.com:465 (SSL)</p>
              <p class="text-ink-faint">需要在设置中开启IMAP并获取授权码</p>
            </div>
            <div>
              <h4 class="font-medium text-ink font-mono">163邮箱</h4>
              <p class="text-ink">IMAP: imap.163.com:993 (SSL) | SMTP: smtp.163.com:465 (SSL)</p>
              <p class="text-ink-faint">需要在设置中开启IMAP/SMTP并获取授权码</p>
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
import { accountsApi } from '@/api';
import { useDialog } from '@/composables/useDialog';

const router = useRouter();
const route = useRoute();
const dialog = useDialog();

const isEditing = computed(() => !!route.params.id);
const submitting = ref(false);

const form = ref({
  name: '',
  email: '',
  username: '',
  password: '',
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  imap_secure: true,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  signature: '',
});

// 邮箱预设模板
const presets = [
  {
    name: 'Gmail',
    icon: '📧',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_secure: false,
  },
  {
    name: 'Outlook',
    icon: '📬',
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: false,
  },
  {
    name: 'QQ邮箱',
    icon: '📮',
    imap_host: 'imap.qq.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.qq.com',
    smtp_port: 465,
    smtp_secure: true,
  },
  {
    name: '163邮箱',
    icon: '📪',
    imap_host: 'imap.163.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.163.com',
    smtp_port: 465,
    smtp_secure: true,
  },
];

const applyPreset = (preset) => {
  form.value.imap_host = preset.imap_host;
  form.value.imap_port = preset.imap_port;
  form.value.imap_secure = preset.imap_secure;
  form.value.smtp_host = preset.smtp_host;
  form.value.smtp_port = preset.smtp_port;
  form.value.smtp_secure = preset.smtp_secure;
};

const loadAccount = async () => {
  if (!isEditing.value) return;

  try {
    const result = await accountsApi.get(route.params.id);
    if (result.success) {
      const account = result.data;
      form.value = {
        name: account.name,
        email: account.email,
        username: account.username,
        password: '', // 不加载密码
        imap_host: account.imap_host,
        imap_port: account.imap_port,
        imap_secure: account.imap_secure === 1,
        smtp_host: account.smtp_host,
        smtp_port: account.smtp_port,
        smtp_secure: account.smtp_secure === 1,
        signature: account.signature || '',
      };
    }
  } catch (error) {
    console.error('Failed to load account:', error);
    await dialog.alert('加载账号信息失败');
    router.back();
  }
};

const goBack = () => {
  router.push('/accounts');
};

const submitForm = async () => {
  submitting.value = true;

  try {
    const data = { ...form.value };

    // 编辑时如果密码为空，则不更新
    if (isEditing.value && !data.password) {
      delete data.password;
    }

    let result;
    if (isEditing.value) {
      result = await accountsApi.update(route.params.id, data);
    } else {
      result = await accountsApi.create(data);
    }

    if (result.success) {
      await dialog.alert(isEditing.value ? '账号已更新' : '账号已添加');
      router.push('/accounts');
    } else {
      await dialog.alert('保存失败: ' + result.message);
    }
  } catch (error) {
    await dialog.alert('保存失败: ' + error.message);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadAccount();
});
</script>
