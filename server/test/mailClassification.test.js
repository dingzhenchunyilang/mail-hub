import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-hub-ai-classification-'));
process.env.DB_PATH = path.join(tempDir, 'mail-hub.db');

const { initDb, getDb } = await import('../models/database.js');
const { AiService } = await import('../services/ai.js');

initDb();

test('邮件表保存重要性分类字段，默认普通', () => {
  const db = getDb();
  try {
    const column = db.prepare("SELECT name, dflt_value FROM pragma_table_info('emails') WHERE name = 'importance'").get();
    assert.ok(column);
    assert.equal(column.dflt_value, "'normal'");
  } finally { db.close(); }
});

test('AI 能解析重要性和广告分类 JSON', () => {
  const ai = new AiService();
  assert.deepEqual(ai.parseMailClassification('{"importance":"possible_important","is_ad":true}'), {
    importance: 'possible_important', is_ad: true,
  });
});

test('AI 分类结果异常时回退为普通且非广告', () => {
  const ai = new AiService();
  assert.deepEqual(ai.parseMailClassification('不是 JSON'), {
    importance: 'normal', is_ad: false,
  });
});

test('重要性提示词覆盖银行、交易、旅行和学校行动类邮件', async () => {
  const ai = new AiService();
  let messages;
  ai.chat = async (payload) => {
    messages = payload;
    return '{"importance":"normal","is_ad":false}';
  };

  await ai.classifyEmail({
    from_address: 'no-reply@dbs.com',
    subject: 'Your documents are ready for viewing',
    body_text: 'Please upload the required documents before the deadline.',
  });

  const prompt = messages.map((message) => message.content).join('\\n');
  assert.match(prompt, /银行|支付|交易|OTP|安全/);
  assert.match(prompt, /旅行|航班|订单|行程/);
  assert.match(prompt, /学校|课程|注册|成绩|项目|截止日期/);
  assert.match(prompt, /明确行动要求/);
});

test('广告提示词明确覆盖招聘推广、Newsletter、平台通知和促销', async () => {
  const ai = new AiService();
  let prompt;
  ai.chat = async (messages) => {
    prompt = messages.map((message) => message.content).join('\\n');
    return '{"importance":"normal","is_ad":false}';
  };

  await ai.classifyEmail({
    from_address: 'jobs@example.com',
    subject: 'Career event and special offer',
    body_text: 'Join our newsletter and explore opportunities.',
  });

  assert.match(prompt, /招聘|职业|课程推广|Newsletter|订阅资讯/);
  assert.match(prompt, /优惠|促销|返现|限时|推广/);
  assert.match(prompt, /事务性|订单确认|验证码|OTP.*不是广告/);
});

test('重要性分类要求普通为默认，闲聊和一般通知不能被放大', async () => {
  const ai = new AiService();
  let prompt;
  ai.chat = async (messages) => {
    prompt = messages.map((message) => message.content).join('\\n');
    return '{"importance":"normal","is_ad":false}';
  };

  await ai.classifyEmail({
    from_address: 'friend@example.com',
    subject: '你好',
    body_text: '最近怎么样？',
  });

  assert.match(prompt, /默认.*normal|normal.*默认/);
  assert.match(prompt, /闲聊|无明确行动/);
  assert.match(prompt, /不要仅因.*官方|不要仅因.*关键词/);
});
