import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

export default api;

// 账号相关 API
export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  testImap: (id) => api.post(`/accounts/${id}/test-imap`),
  testSmtp: (id) => api.post(`/accounts/${id}/test-smtp`),
  sync: (id) => api.post(`/accounts/${id}/sync`),
  syncAll: () => api.post('/accounts/sync-all'),
};

// 邮件相关 API
export const emailsApi = {
  list: (params) => api.get('/emails', { params }),
  sent: (params) => api.get('/emails/sent', { params }),
  contacts: (search) => api.get('/emails/contacts', { params: search ? { search } : {} }),
  get: (id) => api.get(`/emails/${id}`),
  markRead: (id, isRead) => api.put(`/emails/${id}/read`, { is_read: isRead }),
  batchMarkRead: (ids, isRead) => api.put('/emails/batch/read', { ids, is_read: isRead }),
  toggleStar: (id) => api.put(`/emails/${id}/star`),
  archive: (id) => api.put(`/emails/${id}/archive`),
  unarchive: (id) => api.put(`/emails/${id}/unarchive`),
  delete: (id) => api.put(`/emails/${id}/delete`),
  batchDelete: (ids) => api.put('/emails/batch/delete', { ids }),
  send: (data) => api.post('/emails/send', data),
  stats: () => api.get('/emails/stats/overview'),
};

// 规则相关 API
export const rulesApi = {
  list: () => api.get('/rules'),
  get: (id) => api.get(`/rules/${id}`),
  create: (data) => api.post('/rules', data),
  update: (id, data) => api.put(`/rules/${id}`, data),
  delete: (id) => api.delete(`/rules/${id}`),
  toggle: (id) => api.put(`/rules/${id}/toggle`),
  templates: () => api.get('/rules/templates'),
  applyAll: () => api.post('/rules/apply-all'),
};

// 标签相关 API
export const tagsApi = {
  list: () => api.get('/tags'),
  create: (data) => api.post('/tags', data),
  delete: (id) => api.delete(`/tags/${id}`),
  getEmailTags: (emailId) => api.get(`/emails/${emailId}/tags`),
  addEmailTag: (emailId, tagId) => api.post(`/emails/${emailId}/tags`, { tag_id: tagId }),
  removeEmailTag: (emailId, tagId) => api.delete(`/emails/${emailId}/tags/${tagId}`),
};

// 收藏夹相关 API
export const favoritesApi = {
  list: (params) => api.get('/favorites', { params }),
  get: (id) => api.get(`/favorites/${id}`),
  create: (data) => api.post('/favorites', data),
  update: (id, data) => api.put(`/favorites/${id}`, data),
  delete: (id) => api.delete(`/favorites/${id}`),
  platforms: () => api.get('/favorites/platforms'),
};

// 日程相关 API
export const eventsApi = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  upcoming: () => api.get('/events/upcoming'),
};

// AI 相关 API（长超时，推理模型响应慢）
const aiAxios = axios.create({
  baseURL: '/api',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});
aiAxios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export const aiApi = {
  status: () => api.get('/ai/status'),
  summarize: (email_id) => aiAxios.post('/ai/summarize', { email_id }),
  draftReply: (email_id, tone) => aiAxios.post('/ai/draft-reply', { email_id, tone }),
  polish: (text, tone) => aiAxios.post('/ai/polish', { text, tone }),
  summarizeThread: (email_ids) => aiAxios.post('/ai/summarize-thread', { email_ids }),
  extractEvents: (email_id) => aiAxios.post('/ai/extract-events', { email_id }),
};

// 设置 API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  test: () => api.post('/settings/test'),
};

// 验证码相关 API
export const codesApi = {
  list: (params) => api.get('/codes', { params }),
  dismiss: (id) => api.post(`/codes/${id}/dismiss`),
  delete: (id) => api.delete(`/codes/${id}`),
  ignoredSenders: () => api.get('/codes/ignored-senders'),
  removeIgnored: (address) => api.delete(`/codes/ignored-senders/${encodeURIComponent(address)}`),
  boost: (data) => api.post('/codes/boost', data),
  boostCancel: () => api.post('/codes/boost/cancel'),
  boostStatus: () => api.get('/codes/boost/status'),
};
