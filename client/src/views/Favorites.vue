<template>
  <div class="h-full flex flex-col">
    <!-- 顶部导航 -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">账号收藏夹</h1>
          <p class="text-sm text-ink-faint mt-1">记录各平台注册账号信息，纯记录用途</p>
        </div>
        <button @click="openCreateModal" class="btn btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          添加账号
        </button>
      </div>
    </header>

    <!-- 筛选和搜索 -->
    <div class="bg-paper border-b border-line-soft px-6 py-3">
      <div class="flex items-center space-x-4">
        <select v-model="selectedPlatform" class="input w-48" @change="loadFavorites">
          <option value="">全部平台</option>
          <option v-for="p in platforms" :key="p.platform" :value="p.platform">
            {{ p.platform }} ({{ p.count }})
          </option>
        </select>
        <div class="flex-1 relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索账号、用户名、备注..."
            class="input pl-10"
            @keyup.enter="loadFavorites"
          />
          <svg class="absolute left-3 top-2.5 w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <button @click="loadFavorites" class="btn btn-secondary">搜索</button>
      </div>
    </div>

    <!-- 收藏列表 -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-ink-faint"></div>
      </div>

      <div v-else-if="favorites.length === 0" class="flex flex-col items-center justify-center h-64 text-ink-faint">
        <svg class="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <p class="text-lg font-serif mb-2">还没有收藏的账号</p>
        <p class="text-sm">记录各平台的注册信息</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="fav in favorites"
          :key="fav.id"
          class="index-card p-4"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full border border-line-soft flex items-center justify-center">
                <span class="text-ink font-mono font-bold text-lg">{{ fav.platform[0].toUpperCase() }}</span>
              </div>
              <div>
                <h3 class="font-serif font-semibold text-ink">{{ fav.platform }}</h3>
                <p class="text-sm text-ink-faint">{{ fav.account_name }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-1">
              <button @click="editFavorite(fav)" class="btn btn-ghost btn-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button @click="deleteFavorite(fav)" class="btn btn-ghost btn-sm text-stamp-red">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div v-if="fav.username" class="flex items-center text-ink">
              <svg class="w-4 h-4 mr-2 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {{ fav.username }}
            </div>
            <div v-if="fav.email" class="flex items-center text-ink">
              <svg class="w-4 h-4 mr-2 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {{ fav.email }}
            </div>
            <div v-if="fav.phone" class="flex items-center text-ink">
              <svg class="w-4 h-4 mr-2 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              {{ fav.phone }}
            </div>
            <div v-if="fav.url" class="flex items-center text-ink">
              <svg class="w-4 h-4 mr-2 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.364" />
              </svg>
              <a :href="fav.url" target="_blank" class="text-ink underline truncate">{{ fav.url }}</a>
            </div>
            <div v-if="fav.notes" class="text-ink-faint mt-2 p-2 bg-paper-dim rounded-card text-xs font-mono">
              {{ fav.notes }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <div v-if="showModal" class="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div class="bg-paper rounded-card w-full max-w-lg mx-4 border border-line-soft">
        <div class="p-6 border-b border-line-soft">
          <h2 class="text-xl font-serif font-bold text-ink">{{ editingFavorite ? '编辑账号' : '添加账号' }}</h2>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="label">平台名称 <span class="text-stamp-red">*</span></label>
            <input v-model="form.platform" type="text" class="input" placeholder="例如：GitHub、淘宝、Steam" />
          </div>

          <div>
            <label class="label">账号/用户名 <span class="text-stamp-red">*</span></label>
            <input v-model="form.account_name" type="text" class="input" placeholder="你的用户名或账号名" />
          </div>

          <div>
            <label class="label">用户名（登录用）</label>
            <input v-model="form.username" type="text" class="input" placeholder="可选" />
          </div>

          <div>
            <label class="label">邮箱</label>
            <input v-model="form.email" type="email" class="input" placeholder="可选" />
          </div>

          <div>
            <label class="label">手机号</label>
            <input v-model="form.phone" type="tel" class="input" placeholder="可选" />
          </div>

          <div>
            <label class="label">平台网址</label>
            <input v-model="form.url" type="url" class="input" placeholder="https://..." />
          </div>

          <div>
            <label class="label">备注</label>
            <textarea v-model="form.notes" class="input h-20" placeholder="可选，记录其他信息"></textarea>
          </div>
        </div>

        <div class="p-6 border-t border-line-soft flex justify-end space-x-3">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveFavorite" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { favoritesApi } from '@/api';
import { useDialog } from '@/composables/useDialog';

const dialog = useDialog();
const favorites = ref([]);
const platforms = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editingFavorite = ref(null);
const selectedPlatform = ref('');
const searchQuery = ref('');

const form = ref({
  platform: '',
  account_name: '',
  username: '',
  email: '',
  phone: '',
  url: '',
  notes: '',
});

const loadFavorites = async () => {
  loading.value = true;
  try {
    const params = {};
    if (selectedPlatform.value) params.platform = selectedPlatform.value;
    if (searchQuery.value) params.search = searchQuery.value;

    const result = await favoritesApi.list(params);
    if (result.success) {
      favorites.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load favorites:', error);
  } finally {
    loading.value = false;
  }
};

const loadPlatforms = async () => {
  try {
    const result = await favoritesApi.platforms();
    if (result.success) {
      platforms.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load platforms:', error);
  }
};

const openCreateModal = () => {
  editingFavorite.value = null;
  form.value = {
    platform: '',
    account_name: '',
    username: '',
    email: '',
    phone: '',
    url: '',
    notes: '',
  };
  showModal.value = true;
};

const editFavorite = (fav) => {
  editingFavorite.value = fav;
  form.value = { ...fav };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingFavorite.value = null;
};

const saveFavorite = async () => {
  if (!form.value.platform || !form.value.account_name) {
    await dialog.alert('请填写平台名称和账号名');
    return;
  }

  try {
    if (editingFavorite.value) {
      await favoritesApi.update(editingFavorite.value.id, form.value);
    } else {
      await favoritesApi.create(form.value);
    }
    closeModal();
    loadFavorites();
    loadPlatforms();
  } catch (error) {
    await dialog.alert('保存失败: ' + error.message);
  }
};

const deleteFavorite = async (fav) => {
  if (!await dialog.confirm(`确定删除"${fav.platform} - ${fav.account_name}"吗？`)) return;
  try {
    await favoritesApi.delete(fav.id);
    loadFavorites();
    loadPlatforms();
  } catch (error) {
    await dialog.alert('删除失败: ' + error.message);
  }
};

onMounted(() => {
  loadFavorites();
  loadPlatforms();
});
</script>
