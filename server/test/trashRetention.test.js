import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-hub-trash-'));
process.env.DB_PATH = path.join(tempDir, 'mail-hub.db');
process.env.DISABLE_SYNC = 'true';
const { initDb, getDb } = await import('../models/database.js');
initDb();

const { getTrashExpiry, getCodeExpiry } = await import('../services/retention.js');

test('回收站邮件保留14天，验证码邮件保留1小时', () => {
  assert.equal(getTrashExpiry('2026-08-07T00:00:00.000Z'), '2026-08-21T00:00:00.000Z');
  assert.equal(getCodeExpiry('2026-08-07T00:00:00.000Z'), '2026-08-07T01:00:00.000Z');
});

test('邮件表包含删除时间，验证码记录包含删除计划时间', () => {
  const db = getDb();
  try {
    assert.ok(db.prepare("SELECT name FROM pragma_table_info('emails') WHERE name = 'deleted_at'").get());
    assert.ok(db.prepare("SELECT name FROM pragma_table_info('detected_codes') WHERE name = 'delete_after'").get());
  } finally { db.close(); }
});
