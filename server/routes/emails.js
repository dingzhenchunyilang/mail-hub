import { Router } from 'express';
import { getDb } from '../models/database.js';
import { SmtpService } from '../services/smtp.js';
import { decrypt } from '../utils/crypto.js';

const router = Router();

// 获取最近联系人
router.get('/contacts', (req, res) => {
  const { search } = req.query;
  const db = getDb();
  try {
    let where = "WHERE folder = 'SENT' AND to_address IS NOT NULL AND to_address != ''";
    let params = [];

    if (search) {
      where += " AND to_address LIKE ?";
      params.push(`%${search}%`);
    }

    const contacts = db.prepare(`
      SELECT 
        to_address as email,
        COUNT(*) as count,
        MAX(received_at) as last_used
      FROM emails 
      ${where}
      GROUP BY to_address
      ORDER BY count DESC, last_used DESC
      LIMIT 20
    `).all(...params);

    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取已发送邮件列表
router.get('/sent', (req, res) => {
  const {
    page = 1,
    limit = 50,
    account_id,
    search,
    sort = 'received_at',
    order = 'DESC'
  } = req.query;

  const db = getDb();
  try {
    let where = ["e.is_deleted = 0", "e.folder = 'SENT'"];
    let params = [];

    if (account_id) {
      where.push('e.account_id = ?');
      params.push(account_id);
    }

    if (search) {
      where.push('(e.subject LIKE ? OR e.to_address LIKE ? OR e.preview LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = where.join(' AND ');

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM emails e WHERE ${whereClause}`
    ).get(...params);

    const emails = db.prepare(`
      SELECT 
        e.*,
        a.name as account_name,
        a.email as account_email
      FROM emails e
      LEFT JOIN accounts a ON e.account_id = a.id
      WHERE ${whereClause}
      ORDER BY e.${sort} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit)),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取邮件列表（支持分页、筛选、搜索）
router.get('/', (req, res) => {
  const {
    page = 1,
    limit = 50,
    account_id,
    folder = 'INBOX',
    is_read,
    is_starred,
    is_archived,
    search,
    sort = 'received_at',
    order = 'DESC'
  } = req.query;

  const db = getDb();
  try {
    let where = ['e.is_deleted = 0'];
    let params = [];

    if (account_id) {
      where.push('e.account_id = ?');
      params.push(account_id);
    }

    if (folder) {
      where.push('e.folder = ?');
      params.push(folder);
    }

    if (is_read !== undefined) {
      where.push('e.is_read = ?');
      params.push(parseInt(is_read));
    }

    if (is_starred !== undefined) {
      where.push('e.is_starred = ?');
      params.push(parseInt(is_starred));
    }

    if (is_archived !== undefined) {
      where.push('e.is_archived = ?');
      params.push(parseInt(is_archived));
    }

    if (search) {
      where.push('(e.subject LIKE ? OR e.from_address LIKE ? OR e.from_name LIKE ? OR e.preview LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = where.join(' AND ');

    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM emails e WHERE ${whereClause}`
    ).get(...params);

    // 获取列表
    const emails = db.prepare(`
      SELECT 
        e.*,
        a.name as account_name,
        a.email as account_email
      FROM emails e
      LEFT JOIN accounts a ON e.account_id = a.id
      WHERE ${whereClause}
      ORDER BY e.${sort} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit)),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 批量标记已读/未读
router.put('/batch/read', (req, res) => {
  const { ids, is_read } = req.body;
  const db = getDb();
  try {
    const stmt = db.prepare('UPDATE emails SET is_read = ? WHERE id = ?');
    const updateMany = db.transaction((emailIds) => {
      for (const id of emailIds) {
        stmt.run(is_read ? 1 : 0, id);
      }
    });
    updateMany(ids);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 批量删除（软删除 + 同步删除服务器）
router.put('/batch/delete', async (req, res) => {
  const { ids } = req.body;
  const db = getDb();
  try {
    // 检查是否有星标邮件
    const placeholders = ids.map(() => '?').join(',');
    const starred = db.prepare(`SELECT id FROM emails WHERE id IN (${placeholders}) AND is_starred = 1`).all(...ids);
    if (starred.length > 0) {
      return res.status(400).json({ success: false, message: '包含星标邮件，不能删除' });
    }

    const stmt = db.prepare('UPDATE emails SET is_deleted = 1 WHERE id = ?');
    for (const id of ids) {
      stmt.run(id);
    }

    // 同步删除服务器邮件
    for (const id of ids) {
      const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
      if (email && email.uid && email.folder) {
        try {
          const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(email.account_id);
          if (account) {
            const { ImapService } = await import('../services/imap.js');
            const imapService = new ImapService(account);
            await imapService.deleteEmail(email.folder, email.uid);
            console.log(`[Delete] Deleted email ${email.uid} from ${email.folder}`);
          }
        } catch (imapError) {
          console.error('[Delete] Failed to delete from server:', imapError.message);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取单封邮件详情
router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const email = db.prepare(`
      SELECT 
        e.*,
        a.name as account_name,
        a.email as account_email
      FROM emails e
      LEFT JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    // 标记为已读
    if (!email.is_read) {
      db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(req.params.id);
      email.is_read = 1;
    }

    res.json({ success: true, data: email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 标记已读/未读
router.put('/:id/read', (req, res) => {
  const { is_read } = req.body;
  const db = getDb();
  try {
    db.prepare('UPDATE emails SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 切换星标
router.put('/:id/star', (req, res) => {
  const db = getDb();
  try {
    const email = db.prepare('SELECT is_starred FROM emails WHERE id = ?').get(req.params.id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }
    db.prepare('UPDATE emails SET is_starred = ? WHERE id = ?').run(email.is_starred ? 0 : 1, req.params.id);
    res.json({ success: true, is_starred: !email.is_starred });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 归档邮件
router.put('/:id/archive', (req, res) => {
  const db = getDb();
  try {
    db.prepare('UPDATE emails SET is_archived = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 取消归档
router.put('/:id/unarchive', (req, res) => {
  const db = getDb();
  try {
    db.prepare('UPDATE emails SET is_archived = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 删除邮件（软删除 + 同步删除服务器）
router.put('/:id/delete', async (req, res) => {
  const db = getDb();
  try {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(req.params.id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    if (email.is_starred) {
      return res.status(400).json({ success: false, message: '星标邮件不能删除，请先取消星标' });
    }

    // 本地软删除
    db.prepare('UPDATE emails SET is_deleted = 1 WHERE id = ?').run(req.params.id);

    // 同步删除服务器邮件
    if (email.uid && email.folder) {
      try {
        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(email.account_id);
        if (account) {
          const { ImapService } = await import('../services/imap.js');
          const imapService = new ImapService(account);
          await imapService.deleteEmail(email.folder, email.uid);
          console.log(`[Delete] Deleted email ${email.uid} from ${email.folder}`);
        }
      } catch (imapError) {
        console.error('[Delete] Failed to delete from server:', imapError.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 发送邮件
router.post('/send', async (req, res) => {
  const { account_id, to, subject, text, html, reply_to, in_reply_to } = req.body;

  const db = getDb();
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({ success: false, message: '发件账号不存在' });
    }

    const smtpService = new SmtpService(account);
    const result = await smtpService.sendEmail({
      to,
      subject,
      text,
      html,
      replyTo: reply_to,
      inReplyTo: in_reply_to,
    });

    // 保存已发送邮件到数据库
    const { v4: uuidv4 } = await import('uuid');
    const emailId = uuidv4();
    db.prepare(`
      INSERT INTO emails (id, account_id, folder, from_address, from_name, to_address, subject, preview, body_text, body_html, received_at, is_read)
      VALUES (?, ?, 'SENT', ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)
    `).run(
      emailId,
      account_id,
      account.email,
      account.name,
      to,
      subject,
      (text || '').substring(0, 200),
      text || '',
      html || text || ''
    );

    // 同步到邮箱服务器的已发送文件夹
    try {
      const { ImapService } = await import('../services/imap.js');
      const imapService = new ImapService(account);
      
      // MIME 编码函数（处理中文等非ASCII字符）
      const encodeHeader = (str) => {
        if (!str) return '';
        // 检查是否包含非ASCII字符
        if (/[^\x00-\x7F]/.test(str)) {
          return `=?UTF-8?B?${Buffer.from(str).toString('base64')}?=`;
        }
        return str;
      };
      
      // 构造邮件内容
      const emailContent = [
        `From: ${encodeHeader(account.name)} <${account.email}>`,
        `To: ${to}`,
        `Subject: ${encodeHeader(subject)}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${emailId}@mail-hub.local>`,
        reply_to ? `In-Reply-To: ${reply_to}` : '',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="utf-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(text || '').toString('base64')
      ].filter(Boolean).join('\r\n');
      
      // QQ邮箱的已发送文件夹名可能是 "Sent Messages" 或 "已发送"
      const sentFolders = ['Sent Messages', '已发送', 'Sent', 'SENT'];
      let saved = false;
      
      for (const folder of sentFolders) {
        try {
          await imapService.appendEmail(folder, emailContent);
          saved = true;
          console.log(`[Send] Email saved to ${folder}`);
          break;
        } catch (e) {
          // 尝试下一个文件夹名
          continue;
        }
      }
      
      if (!saved) {
        console.log('[Send] Could not save to server sent folder, but email was sent');
      }
      
      await imapService.disconnect();
    } catch (imapError) {
      // IMAP 保存失败不影响发送结果
      console.error('[Send] Failed to save to server sent folder:', imapError.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取统计数据
router.get('/stats/overview', (req, res) => {
  const db = getDb();
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_deleted = 0').get();
    const unread = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_deleted = 0 AND is_read = 0').get();
    const starred = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_deleted = 0 AND is_starred = 1').get();
    const archived = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_deleted = 0 AND is_archived = 1').get();

    // 按账号分组未读数
    const unreadByAccount = db.prepare(`
      SELECT a.id, a.name, a.email, COUNT(e.id) as unread_count
      FROM accounts a
      LEFT JOIN emails e ON e.account_id = a.id AND e.is_deleted = 0 AND e.is_read = 0
      WHERE a.is_active = 1
      GROUP BY a.id
    `).all();

    res.json({
      success: true,
      data: {
        total: total.count,
        unread: unread.count,
        starred: starred.count,
        archived: archived.count,
        unread_by_account: unreadByAccount,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

export default router;
