<template>
  <div class="h-full flex flex-col">
    <header class="page-header">
      <h1 class="page-title">设置</h1>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto space-y-6">

        <!-- AI 配置 -->
        <div class="card">
          <div class="px-6 py-4 border-b border-line-soft">
            <h2 class="text-lg font-serif font-semibold text-ink">AI 功能配置</h2>
            <p class="text-xs text-ink-faint mt-1">配置 AI 服务商后，邮件详情页会出现摘要、回复、日程识别等按钮</p>
          </div>

          <div class="p-6 space-y-4">
            <!-- 状态提示 -->
            <div
              class="flex items-center space-x-2 px-3 py-2 rounded-card text-xs font-mono"
              :class="config.has_key ? 'bg-paper-dim text-ink' : 'bg-paper-dim text-ink-faint'"
            >
              <span
                class="w-2 h-2 rounded-full"
                :class="config.has_key ? 'bg-green-600' : 'bg-ink-faint'"
              />
              <span>{{ config.has_key ? 'AI 已启用' : '未配置 API Key，AI 功能不可用' }}</span>
            </div>

            <!-- 服务商 -->
            <div>
              <label class="label">服务商</label>
              <select v-model="form.ai_provider" class="select">
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="dashscope">通义千问</option>
                <option value="mimo">MiMo</option>
              </select>
            </div>

            <!-- API Key -->
            <div>
              <label class="label">API Key</label>
              <input
                v-model="form.ai_api_key"
                type="password"
                class="input"
                :placeholder="config.has_key ? '已配置（留空不修改）' : 'sk-...'"
              />
              <p class="text-[10px] text-ink-faint mt-1 font-mono">
                <span v-if="form.ai_provider === 'openai'">OpenAI: platform.openai.com → API Keys</span>
                <span v-else-if="form.ai_provider === 'deepseek'">DeepSeek: platform.deepseek.com → API 密钥</span>
                <span v-else-if="form.ai_provider === 'mimo'">MiMo: api.mimo.ai → API Keys</span>
                <span v-else>通义千问: dashscope.console.aliyun.com → API-KEY</span>
              </p>
            </div>

            <!-- API 地址 -->
            <div>
              <label class="label">API 地址</label>
              <input v-model="form.ai_base_url" type="text" class="input font-mono text-sm" />
            </div>

            <!-- 模型 -->
            <div>
              <label class="label">模型</label>
              <input v-model="form.ai_model" type="text" class="input font-mono text-sm" />
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  v-for="m in suggestedModels"
                  :key="m"
                  @click="form.ai_model = m"
                  class="px-2 py-0.5 text-[10px] font-mono border border-line-soft rounded-card text-ink-faint hover:border-ink transition-colors"
                >
                  {{ m }}
                </button>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-line-soft flex items-center justify-between">
            <button @click="testConnection" :disabled="testing" class="btn btn-secondary btn-sm">
              {{ testing ? '测试中...' : '测试连接' }}
            </button>
            <div class="flex items-center space-x-3">
              <span v-if="testResult" class="text-xs font-mono" :class="testResult.success ? 'text-ink' : 'text-stamp-red'">
                {{ testResult.message }}
              </span>
              <button @click="save" :disabled="saving" class="btn btn-primary">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 预设快选 -->
        <div class="card p-6">
          <h3 class="section-title mb-3">快速预设</h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="preset in presets"
              :key="preset.name"
              @click="applyPreset(preset)"
              class="p-3 border border-line-soft rounded-card text-left hover:border-ink transition-colors"
            >
              <p class="text-sm font-medium text-ink">{{ preset.name }}</p>
              <p class="text-[10px] font-mono text-ink-faint mt-0.5">{{ preset.model }}</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { settingsApi } from '@/api';

const config = ref({ has_key: false, ai_provider: 'openai', ai_api_key: '', ai_base_url: '', ai_model: '' });
const form = ref({ ai_provider: 'openai', ai_api_key: '', ai_base_url: 'https://api.openai.com/v1', ai_model: 'gpt-4o-mini' });
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);

const presets = [
  { name: 'OpenAI', provider: 'openai', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', provider: 'deepseek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '通义千问', provider: 'dashscope', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { name: 'MiMo', provider: 'mimo', url: 'https://api.mimo.ai/v1', model: 'mimo-chat' },
];

const suggestedModels = computed(() => {
  const map = {
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    dashscope: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    mimo: ['mimo-chat', 'mimo-reasoning'],
  };
  return map[form.value.ai_provider] || [];
});

const loadConfig = async () => {
  try {
    const r = await settingsApi.get();
    if (r.success) {
      config.value = r.data;
      form.value.ai_provider = r.data.ai_provider;
      form.value.ai_base_url = r.data.ai_base_url;
      form.value.ai_model = r.data.ai_model;
      form.value.ai_api_key = '';
    }
  } catch (e) { console.error(e); }
};

const applyPreset = (preset) => {
  form.value.ai_provider = preset.provider;
  form.value.ai_base_url = preset.url;
  form.value.ai_model = preset.model;
};

watch(() => form.value.ai_provider, (p) => {
  const preset = presets.find(pr => pr.provider === p);
  if (preset) {
    form.value.ai_base_url = preset.url;
    if (!form.value.ai_model || suggestedModels.value.includes(form.value.ai_model) === false) {
      form.value.ai_model = preset.model;
    }
  }
});

const save = async () => {
  saving.value = true;
  testResult.value = null;
  try {
    const r = await settingsApi.update(form.value);
    if (r.success) {
      config.value = { ...config.value, has_key: r.data.configured };
      form.value.ai_api_key = '';
      await loadConfig();
      testResult.value = { success: true, message: '已保存' };
    } else {
      testResult.value = { success: false, message: r.message };
    }
  } catch (e) {
    testResult.value = { success: false, message: e.message };
  } finally {
    saving.value = false;
  }
};

const testConnection = async () => {
  testing.value = true;
  testResult.value = null;
  try {
    const r = await settingsApi.test();
    testResult.value = r;
  } catch (e) {
    testResult.value = { success: false, message: e.message };
  } finally {
    testing.value = false;
  }
};

onMounted(() => { loadConfig(); });
</script>
