import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/inbox',
  },
  {
    path: '/inbox',
    name: 'Inbox',
    component: () => import('@/views/Inbox.vue'),
  },
  {
    path: '/inbox/:id',
    name: 'EmailDetail',
    component: () => import('@/views/EmailDetail.vue'),
  },
  {
    path: '/compose',
    name: 'Compose',
    component: () => import('@/views/Compose.vue'),
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('@/views/Accounts.vue'),
  },
  {
    path: '/accounts/add',
    name: 'AddAccount',
    component: () => import('@/views/AccountForm.vue'),
  },
  {
    path: '/accounts/:id/edit',
    name: 'EditAccount',
    component: () => import('@/views/AccountForm.vue'),
  },
  // 阶段二新增
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/views/Rules.vue'),
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
  },
  {
    path: '/tags',
    name: 'Tags',
    component: () => import('@/views/Tags.vue'),
  },
  // 阶段三新增
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/Calendar.vue'),
  },
  // 已发送
  {
    path: '/sent',
    name: 'Sent',
    component: () => import('@/views/Sent.vue'),
  },
  // 设置
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
