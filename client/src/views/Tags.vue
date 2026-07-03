<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">标签管理</h1>
          <p class="text-xs text-ink-faint mt-1 font-mono">管理邮件标签，标签由规则自动生成或手动添加</p>
        </div>
        <button @click="showCreateModal = true" class="btn btn-primary">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建标签
        </button>
      </div>
    </header>

    <!-- Tags list -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="spinner" />
      </div>

      <div v-else-if="tags.length === 0" class="flex flex-col items-center justify-center h-64 text-ink-faint">
        <svg class="w-16 h-16 mb-4 text-line-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        <p class="text-sm font-serif text-ink">还没有标签</p>
        <p class="text-xs mt-1 text-ink-faint">标签会由规则自动生成，或手动创建</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="card p-4 transition-colors hover:border-ink"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div
                class="w-3 h-3 rounded-full border border-line-soft"
                :style="{ backgroundColor: tag.color }"
              />
              <div>
                <h3 class="text-sm font-medium text-ink">{{ tag.name }}</h3>
                <p class="text-[11px] font-mono text-ink-faint">{{ tag.email_count || 0 }} 封邮件</p>
              </div>
            </div>
            <button
              @click="deleteTag(tag)"
              class="p-1.5 text-ink-faint hover:text-stamp-red transition-colors"
              title="删除标签"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper border border-line-soft rounded-card w-full max-w-md mx-4">
        <div class="p-5 border-b border-line-soft">
          <h2 class="text-lg font-serif font-semibold">新建标签</h2>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="label">标签名称</label>
            <input v-model="newTag.name" type="text" class="input" placeholder="输入标签名称" />
          </div>
          <div>
            <label class="label">标签颜色</label>
            <div class="flex items-center space-x-3">
              <input v-model="newTag.color" type="color" class="h-8 w-16 rounded-card cursor-pointer border border-line-soft" />
              <span class="text-xs font-mono text-ink-faint">{{ newTag.color }}</span>
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-line-soft flex justify-end space-x-3">
          <button @click="showCreateModal = false" class="btn btn-secondary">取消</button>
          <button @click="createTag" class="btn btn-primary">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { tagsApi } from '@/api';
import { useDialog } from '@/composables/useDialog';

const dialog = useDialog();
const tags = ref([]);
const loading = ref(true);
const showCreateModal = ref(false);

const newTag = ref({ name: '', color: '#1A1A1A' });

const loadTags = async () => {
  loading.value = true;
  try { const r = await tagsApi.list(); if (r.success) tags.value = r.data; }
  catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const createTag = async () => {
  if (!newTag.value.name) { await dialog.alert('请输入标签名称'); return; }
  try {
    await tagsApi.create(newTag.value);
    showCreateModal.value = false;
    newTag.value = { name: '', color: '#1A1A1A' };
    loadTags();
  } catch (e) { await dialog.alert('创建失败: ' + e.message); }
};

const deleteTag = async (tag) => {
  if (!await dialog.confirm(`确定删除标签"${tag.name}"吗？\n该标签将从所有邮件中移除。`)) return;
  try { await tagsApi.delete(tag.id); loadTags(); }
  catch (e) { await dialog.alert('删除失败: ' + e.message); }
};

onMounted(() => { loadTags(); });
</script>
