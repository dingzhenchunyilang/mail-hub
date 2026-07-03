import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const inboxSource = fs.readFileSync(new URL('../src/views/Inbox.vue', import.meta.url), 'utf8');

test('Inbox keeps a top sticky bulk action bar for selected emails', () => {
  assert.match(
    inboxSource,
    /v-if="selectedIds\.length > 0"[\s\S]*class="sticky top-0 z-10 bg-paper\/95 backdrop-blur border-b border-line-soft px-6 py-3"/
  );

  assert.match(inboxSource, /<button @click="toggleSelectPage" class="btn btn-secondary btn-sm">{{ allVisibleSelected \? '取消本页' : '本页全选' }}<\/button>/);
  assert.match(inboxSource, /<button @click="batchMarkRead" class="btn btn-secondary btn-sm">标记已读<\/button>/);
  assert.match(inboxSource, /<button @click="batchDelete" class="btn btn-danger btn-sm">删除<\/button>/);
});

test('Inbox renders pagination controls near the top toolbar as well as the bottom', () => {
  const matches = inboxSource.match(/上一页/g) || [];
  assert.ok(matches.length >= 2, 'expected pagination controls to appear in at least two places');

  assert.match(inboxSource, /const canPrevPage = \(\) => pagination\.value\.page > 1;/);
  assert.match(inboxSource, /const canNextPage = \(\) => pagination\.value\.page < pagination\.value\.pages;/);
});

test('Inbox supports page-scoped selection and uses page scrolling instead of inner scrolling', () => {
  assert.match(inboxSource, /const visibleEmailIds = \(\) => emails\.value\.map\(email => email\.id\);/);
  assert.match(inboxSource, /const allVisibleSelected = computed\(\(\) => visibleEmailIds\(\)\.length > 0 && visibleEmailIds\(\)\.every\(id => selectedIds\.value\.includes\(id\)\)\);/);
  assert.match(inboxSource, /const toggleSelectPage = \(\) => \{/);
  assert.doesNotMatch(inboxSource, /flex-1 overflow-y-auto overflow-x-hidden/);
});
