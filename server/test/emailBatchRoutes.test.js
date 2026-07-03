import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-hub-batch-routes-'));
process.env.DB_PATH = path.join(tempDir, 'mail-hub.db');

const { initDb, getDb } = await import('../models/database.js');
const { default: emailsRouter } = await import('../routes/emails.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/emails', emailsRouter);
  return app;
}

function seedEmail(overrides = {}) {
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO accounts (
        id, name, email, imap_host, imap_port, imap_secure,
        smtp_host, smtp_port, smtp_secure, username, password_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'acc-1',
      'Test Account',
      'test@example.com',
      'imap.example.com',
      993,
      1,
      'smtp.example.com',
      587,
      0,
      'test@example.com',
      'encrypted'
    );
  } catch {}

  db.prepare(`
    INSERT INTO emails (
      id, account_id, folder, from_address, from_name, subject, preview,
      body_text, body_html, received_at, is_read, is_starred, is_archived,
      is_deleted, has_attachments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
  `).run(
    overrides.id ?? 'email-1',
    'acc-1',
    overrides.folder ?? 'INBOX',
    'sender@example.com',
    'Sender',
    'Subject',
    'Preview',
    'Body',
    '<p>Body</p>',
    overrides.is_read ?? 0,
    overrides.is_starred ?? 0,
    overrides.is_archived ?? 0,
    overrides.is_deleted ?? 0,
    overrides.has_attachments ?? 0
  );

  db.close();
}

function readEmail(id) {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
  } finally {
    db.close();
  }
}

test.before(() => {
  initDb();
});

test('PUT /emails/batch/read updates selected emails instead of matching /:id/read', async () => {
  seedEmail({ id: 'batch-read-target', is_read: 0 });
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/emails/batch/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['batch-read-target'], is_read: true }),
    });

    assert.equal(response.status, 200);

    const email = readEmail('batch-read-target');
    assert.equal(email.is_read, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('PUT /emails/batch/delete soft-deletes selected emails instead of matching /:id/delete', async () => {
  seedEmail({ id: 'batch-delete-target', is_deleted: 0 });
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/emails/batch/delete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['batch-delete-target'] }),
    });

    assert.equal(response.status, 200);

    const email = readEmail('batch-delete-target');
    assert.equal(email.is_deleted, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
