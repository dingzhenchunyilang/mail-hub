<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">规则管理</h1>
          <p class="text-xs text-ink-faint mt-1 font-mono">设置自动分类规则，邮件按规则自动打标签或归档</p>
        </div>
        <div class="flex space-x-3">
          <button @click="applyAllRules" class="btn btn-secondary">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            应用全部
          </button>
          <button @click="showTemplateModal = true" class="btn btn-secondary">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            模板
          </button>
          <button @click="openCreateModal" class="btn btn-primary">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新建规则
          </button>
        </div>
      </div>
    </header>

    <!-- Rules list -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="spinner" />
      </div>

      <div v-else-if="rules.length === 0" class="flex flex-col items-center justify-center h-64 text-ink-faint">
        <svg class="w-16 h-16 mb-4 text-line-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <p class="text-sm font-serif text-ink">还没有规则</p>
        <p class="text-xs mt-1 text-ink-faint">创建规则让邮件自动分类整理</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="card p-4 transition-colors"
          :class="{ 'opacity-40': !rule.is_active }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Toggle -->
              <button
                @click="toggleRule(rule)"
                :class="[
                  'relative inline-flex h-5 w-9 items-center rounded-full border transition-colors',
                  rule.is_active ? 'bg-ink border-ink' : 'bg-paper border-line-soft'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-3 w-3 transform rounded-full bg-paper transition-transform',
                    rule.is_active ? 'translate-x-4' : 'translate-x-0.5'
                  ]"
                />
              </button>

              <!-- Rule info -->
              <div>
                <h3 class="text-sm font-medium text-ink">{{ rule.name }}</h3>
                <p v-if="rule.description" class="text-xs text-ink-faint mt-0.5">{{ rule.description }}</p>
                <div class="flex items-center space-x-4 mt-1.5 text-[10px] font-mono text-ink-faint">
                  <span>{{ fieldLabels[rule.match_field] }} {{ typeLabels[rule.match_type] }} "{{ rule.match_value }}"</span>
                  <span>{{ actionLabels[rule.action_type] }}{{ rule.action_value ? ' -> ' + rule.action_value : '' }}</span>
                  <span>pri: {{ rule.priority }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-2">
              <button @click="editRule(rule)" class="btn btn-secondary btn-sm">编辑</button>
              <button @click="deleteRule(rule)" class="btn btn-danger btn-sm">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 广告白名单 -->
    <div class="border-t border-line-soft px-6 py-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-serif font-semibold text-ink">广告白名单</h2>
            <p class="text-[11px] text-ink-faint mt-0.5 font-mono">白名单中的发件人不会被广告规则标记</p>
          </div>
          <div class="flex items-center space-x-2">
            <input
              v-model="newWhitelistAddr"
              type="text"
              class="input text-xs"
              style="width: 240px;"
              placeholder="输入发件人地址，如 news@example.com"
              @keyup.enter="addWhitelist"
            />
            <button @click="addWhitelist" class="btn btn-secondary btn-sm">添加</button>
          </div>
        </div>

        <div v-if="whitelist.length === 0" class="text-xs text-ink-faint font-mono py-2">
          暂无白名单发件人
        </div>

        <div v-else class="flex flex-wrap gap-2">
          <span
            v-for="item in whitelist"
            :key="item.id"
            class="inline-flex items-center px-2.5 py-1 rounded-card text-[11px] font-mono border border-line-soft text-ink"
          >
            {{ item.from_address }}
            <span v-if="item.note" class="text-ink-faint ml-1">({{ item.note }})</span>
            <button @click="removeWhitelist(item)" class="ml-2 text-ink-faint hover:text-stamp-red">&times;</button>
          </span>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div v-if="showModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper border border-line-soft rounded-card w-full max-w-lg mx-4">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-serif font-semibold">{{ editingRule ? '编辑规则' : '新建规则' }}</h2>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="label">规则名称</label>
            <input v-model="form.name" type="text" class="input" placeholder="例如：重要邮件星标" />
          </div>
          <div>
            <label class="label">描述</label>
            <input v-model="form.description" type="text" class="input" placeholder="可选" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">匹配字段</label>
              <select v-model="form.match_field" class="input">
                <option value="subject">主题</option>
                <option value="from_address">发件人地址</option>
                <option value="from_name">发件人名称</option>
                <option value="body">正文</option>
                <option value="to_address">收件人</option>
              </select>
            </div>
            <div>
              <label class="label">匹配方式</label>
              <select v-model="form.match_type" class="input">
                <option value="contains">包含</option>
                <option value="equals">等于</option>
                <option value="starts_with">开头是</option>
                <option value="ends_with">结尾是</option>
                <option value="not_contains">不包含</option>
                <option value="regex">正则表达式</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">匹配值</label>
            <input v-model="form.match_value" type="text" class="input" placeholder="输入关键词" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">执行操作</label>
              <select v-model="form.action_type" class="input">
                <option value="tag">打标签</option>
                <option value="archive">归档</option>
                <option value="mark_read">标记已读</option>
                <option value="star">加星标</option>
              </select>
            </div>
            <div v-if="form.action_type === 'tag'">
              <label class="label">标签名称</label>
              <input v-model="form.action_value" type="text" class="input" placeholder="输入标签名" />
            </div>
          </div>
          <div>
            <label class="label">优先级（数字越大越先执行）</label>
            <input v-model.number="form.priority" type="number" class="input" min="0" max="100" />
          </div>
        </div>

        <div class="p-5 border-t border-line-soft flex justify-end space-x-3">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveRule" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- Template modal -->
    <div v-if="showTemplateModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper border border-line-soft rounded-card w-full max-w-2xl mx-4">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-serif font-semibold">选择规则模板</h2>
          <p class="text-xs text-ink-faint mt-1">点击模板快速创建规则</p>
        </div>

        <div class="p-5 space-y-2">
          <div
            v-for="template in templates"
            :key="template.name"
            class="p-3 border border-line-soft rounded-card hover:border-ink cursor-pointer transition-colors"
            @click="useTemplate(template)"
          >
            <h3 class="text-sm font-medium text-ink">{{ template.name }}</h3>
            <p class="text-xs text-ink-faint mt-0.5">{{ template.description }}</p>
            <div class="text-[10px] font-mono text-ink-faint mt-1.5">
              {{ fieldLabels[template.match_field] }} {{ typeLabels[template.match_type] }} "{{ template.match_value }}"
              -> {{ actionLabels[template.action_type] }}{{ template.action_value ? ' -> ' + template.action_value : '' }}
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-line-soft flex justify-end">
          <button @click="showTemplateModal = false" class="btn btn-secondary">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { rulesApi } from '@/api';
import { useDialog } from '@/composables/useDialog';

const dialog = useDialog();
const rules = ref([]);
const templates = ref([]);
const loading = ref(true);
const showModal = ref(false);
const whitelist = ref([]);
const newWhitelistAddr = ref('');
const showTemplateModal = ref(false);
const editingRule = ref(null);

const form = ref({
  name: '', description: '', match_field: 'subject', match_type: 'contains',
  match_value: '', action_type: 'tag', action_value: '', priority: 0,
});

const fieldLabels = { subject: '主题', from_address: '发件人', from_name: '发件人名', body: '正文', to_address: '收件人' };
const typeLabels = { contains: '包含', equals: '等于', starts_with: '开头是', ends_with: '结尾是', not_contains: '不包含', regex: '正则' };
const actionLabels = { tag: '打标签', archive: '归档', mark_read: '标记已读', star: '加星标' };

const loadRules = async () => {
  loading.value = true;
  try { const r = await rulesApi.list(); if (r.success) rules.value = r.data; }
  catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const loadTemplates = async () => {
  try { const r = await rulesApi.templates(); if (r.success) templates.value = r.data; }
  catch (e) { console.error(e); }
};

const openCreateModal = () => {
  editingRule.value = null;
  form.value = { name: '', description: '', match_field: 'subject', match_type: 'contains', match_value: '', action_type: 'tag', action_value: '', priority: 0 };
  showModal.value = true;
};

const editRule = (rule) => { editingRule.value = rule; form.value = { ...rule }; showModal.value = true; };
const closeModal = () => { showModal.value = false; editingRule.value = null; };

const saveRule = async () => {
  if (!form.value.name || !form.value.match_value) { await dialog.alert('请填写规则名称和匹配值'); return; }
  try {
    if (editingRule.value) await rulesApi.update(editingRule.value.id, form.value);
    else await rulesApi.create(form.value);
    closeModal(); loadRules();
  } catch (e) { await dialog.alert('保存失败: ' + e.message); }
};

const toggleRule = async (rule) => {
  try { await rulesApi.toggle(rule.id); rule.is_active = !rule.is_active; }
  catch (e) { await dialog.alert('操作失败: ' + e.message); }
};

const deleteRule = async (rule) => {
  if (!await dialog.confirm(`确定删除规则"${rule.name}"吗？`)) return;
  try { await rulesApi.delete(rule.id); loadRules(); }
  catch (e) { await dialog.alert('删除失败: ' + e.message); }
};

const applyAllRules = async () => {
  if (!await dialog.confirm('确定对所有邮件应用规则吗？')) return;
  try {
    const r = await rulesApi.applyAll();
    if (r.success) await dialog.alert(`规则应用完成，处理了 ${r.data.processed} 封邮件`);
  } catch (e) { await dialog.alert('应用失败: ' + e.message); }
};

const useTemplate = (t) => {
  form.value = { name: t.name, description: t.description, match_field: t.match_field, match_type: t.match_type, match_value: t.match_value, action_type: t.action_type, action_value: t.action_value || '', priority: t.priority || 0 };
  showTemplateModal.value = false; showModal.value = true;
};

// ── 白名单管理 ──

const loadWhitelist = async () => {
  try { const r = await rulesApi.getWhitelist(); if (r.success) whitelist.value = r.data; }
  catch (e) { console.error(e); }
};

const addWhitelist = async () => {
  const addr = newWhitelistAddr.value.trim();
  if (!addr) return;
  try {
    await rulesApi.addWhitelist(addr);
    newWhitelistAddr.value = '';
    loadWhitelist();
  } catch (e) { await dialog.alert('添加失败: ' + e.message); }
};

const removeWhitelist = async (item) => {
  if (!await dialog.confirm(`确定将 ${item.from_address} 从白名单移除？`)) return;
  try { await rulesApi.removeWhitelist(item.from_address); loadWhitelist(); }
  catch (e) { await dialog.alert('移除失败: ' + e.message); }
};

onMounted(() => { loadRules(); loadTemplates(); loadWhitelist(); });
</script>
