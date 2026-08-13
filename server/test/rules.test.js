import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-hub-ad-rules-'));
process.env.DB_PATH = path.join(tempDir, 'mail-hub.db');

const { initDb, getDb } = await import('../models/database.js');
initDb();
const { RuleEngine, getRuleTemplates } = await import('../services/rules.js');

function addRule(overrides = {}) {
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO rules (
        id, name, is_active, priority, match_field, match_type, match_value, action_type, action_value
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      overrides.id ?? 'ad-rule',
      overrides.name ?? '广告识别',
      overrides.priority ?? 10,
      overrides.match_field ?? 'subject',
      overrides.match_type ?? 'contains',
      overrides.match_value ?? 'sale',
      overrides.action_type ?? 'tag',
      overrides.action_value ?? '广告'
    );
  } finally {
    db.close();
  }
}

test.beforeEach(() => {
  initDb();
  const db = getDb();
  try {
    db.exec('DELETE FROM rules; DELETE FROM ad_whitelist;');
  } finally {
    db.close();
  }
});

test('广告模板包含列表退订头规则', () => {
  const adUnsubscribeTemplate = getRuleTemplates().find((template) => template.name === '广告识别：退订关键词');

  assert.deepEqual(adUnsubscribeTemplate, {
    name: '广告识别：退订关键词',
    description: '邮件退订头含"unsubscribe" → 打标签"广告"',
    match_field: 'list_unsubscribe',
    match_type: 'regex',
    match_value: '(unsubscribe|opt[- ]?out)',
    action_type: 'tag',
    action_value: '广告',
    priority: 30,
    _group: '广告识别',
  });
});

test('广告模板不会仅因 no-reply 事务发件人而误标安全通知', () => {
  const senderTemplate = getRuleTemplates().find((template) => template.name === '广告识别：发件人地址特征');
  const engine = new RuleEngine();
  engine.rules = [{ id: 'sender-ad-template', ...senderTemplate, is_active: 1 }];

  const result = engine.applyRules({
    from_address: 'no-reply@accounts.google.com',
    subject: '您的账号启用了两步验证功能',
    body_text: '',
  });

  assert.deepEqual(result.actions, []);
});

test('广告模板覆盖中文券类营销主题', () => {
  const subjectTemplate = getRuleTemplates().find((template) => template.name === '广告识别：主题关键词');
  const engine = new RuleEngine();
  engine.rules = [
    {
      id: 'subject-ad-template',
      ...subjectTemplate,
      is_active: 1,
    },
  ];

  const result = engine.applyRules({
    from_address: 'service@send011.mail.bitget.com',
    subject: '100 USDT 合约网格体验券已到账',
    body_text: '',
  });

  assert.deepEqual(result.actions.map((action) => action.value), ['广告']);
});

test('广告规则能识别常见营销主题', () => {
  addRule({ match_type: 'regex', match_value: '(sale|discount|限时优惠)', priority: 10 });
  const engine = new RuleEngine();

  const result = engine.applyRules({
    from_address: 'offers@example.com',
    subject: 'Flash Sale: 50% OFF today',
    body_text: '',
  });

  assert.deepEqual(result.actions.map((action) => action.value), ['广告']);
});

test('广告规则能识别列表退订头，即使正文没有退订文字', () => {
  addRule({ match_field: 'list_unsubscribe', match_type: 'contains', match_value: 'unsubscribe', priority: 30 });
  const engine = new RuleEngine();

  const result = engine.applyRules({
    from_address: 'news@example.com',
    subject: 'Weekly digest',
    body_text: '本周内容摘要',
    list_unsubscribe: '<mailto:unsubscribe@example.com>',
  });

  assert.deepEqual(result.actions.map((action) => action.value), ['广告']);
});

test('已有非广告标签的邮件仍会进入广告规则处理队列', () => {
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO accounts (
        id, name, email, imap_host, smtp_host, username, password_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('account-1', '测试账号', 'test@example.com', 'imap.example.com', 'smtp.example.com', 'test@example.com', 'encrypted');
    db.prepare(`
      INSERT INTO emails (id, account_id, subject, from_address, received_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run('email-with-code-tag', 'account-1', 'Flash sale', 'offers@example.com');
    db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run('code-tag', '验证码');
    db.prepare('INSERT INTO email_tags (email_id, tag_id) VALUES (?, ?)').run('email-with-code-tag', 'code-tag');
  } finally {
    db.close();
  }
  addRule({ match_type: 'contains', match_value: 'sale' });
  const engine = new RuleEngine();

  const results = engine.processAllUnprocessed();

  assert.deepEqual(results.map((result) => result.emailId), ['email-with-code-tag']);
});

test('广告白名单会跳过广告标签规则', () => {
  addRule();
  const db = getDb();
  try {
    db.prepare('INSERT INTO ad_whitelist (id, from_address) VALUES (?, ?)').run('trusted', 'trusted@example.com');
  } finally {
    db.close();
  }
  const engine = new RuleEngine();

  const result = engine.applyRules({
    from_address: 'trusted@example.com',
    subject: 'Sale',
    body_text: '',
  });

  assert.deepEqual(result.actions, []);
});
