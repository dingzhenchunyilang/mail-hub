import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { testImapConnection } from '../services/imap.js';
import { testSmtpConnection } from '../services/smtp.js';
import { syncService } from '../services/sync.js';

const router = Router();

// 获取所有账号
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const accounts = db.prepare(
      'SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, is_active, last_sync_at, last_error, created_at FROM accounts ORDER BY created_at DESC'
    ).all();
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取单个账号
router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const account = db.prepare(
      'SELECT id, name, email, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, username, signature, is_active, last_sync_at, last_error, created_at FROM accounts WHERE id = ?'
    ).get(req.params.id);
    
    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 添加账号
router.post('/', async (req, res) => {
  const {
    name, email,
    imap_host, imap_port = 993, imap_secure = true,
    smtp_host, smtp_port = 587, smtp_secure = false,
    username, password,
    signature = ''
  } = req.body;

  if (!name || !email || !imap_host || !smtp_host || !username || !password) {
    return res.status(400).json({ success: false, message: '缺少必填字段' });
  }

  const db = getDb();
  try {
    const id = uuidv4();
    const passwordEncrypted = encrypt(password);

    db.prepare(`
      INSERT INTO accounts (id, name, email, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, username, password_encrypted, signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, imap_host, imap_port, imap_secure ? 1 : 0, smtp_host, smtp_port, smtp_secure ? 1 : 0, username, passwordEncrypted, signature);

    res.json({ success: true, data: { id, name, email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 更新账号
router.put('/:id', async (req, res) => {
  const {
    name, email,
    imap_host, imap_port, imap_secure,
    smtp_host, smtp_port, smtp_secure,
    username, password,
    signature, is_active
  } = req.body;

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    const passwordEncrypted = password ? encrypt(password) : existing.password_encrypted;

    db.prepare(`
      UPDATE accounts SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        imap_host = COALESCE(?, imap_host),
        imap_port = COALESCE(?, imap_port),
        imap_secure = COALESCE(?, imap_secure),
        smtp_host = COALESCE(?, smtp_host),
        smtp_port = COALESCE(?, smtp_port),
        smtp_secure = COALESCE(?, smtp_secure),
        username = COALESCE(?, username),
        password_encrypted = ?,
        signature = COALESCE(?, signature),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email, imap_host, imap_port, imap_secure !== undefined ? (imap_secure ? 1 : 0) : null, smtp_host, smtp_port, smtp_secure !== undefined ? (smtp_secure ? 1 : 0) : null, username, passwordEncrypted, signature, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 删除账号
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 测试 IMAP 连接
router.post('/:id/test-imap', async (req, res) => {
  const db = getDb();
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    const result = await testImapConnection({
      ...account,
      password: decrypt(account.password_encrypted),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 测试 SMTP 连接
router.post('/:id/test-smtp', async (req, res) => {
  const db = getDb();
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    const result = await testSmtpConnection({
      ...account,
      password: decrypt(account.password_encrypted),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 手动同步单个账号
router.post('/:id/sync', async (req, res) => {
  try {
    await syncService.syncSingleAccount(req.params.id);
    res.json({ success: true, message: '同步完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 同步所有账号
router.post('/sync-all', async (req, res) => {
  try {
    await syncService.syncAllAccounts();
    res.json({ success: true, message: '全部同步完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
