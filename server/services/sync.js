import { CronJob } from 'cron';
import { getDb } from '../models/database.js';
import { ImapService } from './imap.js';
import { ruleEngine } from './rules.js';
import { v4 as uuidv4 } from 'uuid';
import { detectCode, setKeywords } from './codeDetector.js';
import { sseManager } from './sse.js';

export class SyncService {
  constructor() {
    this.jobs = new Map();
    this.syncInterval = process.env.SYNC_INTERVAL || '*/5 * * * *'; // 默认5分钟
    // 加速模式
    this.boostTimer = null;
    this.boostAccountId = null;
    this.boostEndTime = null;
    this.boostJob = null;
  }

  start() {
    console.log(`[SyncService] Starting with interval: ${this.syncInterval}`);
    
    // 启动时立即同步一次
    this.syncAllAccounts();
    
    // 创建定时任务
    this.mainJob = new CronJob(this.syncInterval, () => {
      this.syncAllAccounts();
    });
    
    this.mainJob.start();
    console.log('[SyncService] Scheduler started');
  }

  stop() {
    if (this.mainJob) {
      this.mainJob.stop();
    }
    console.log('[SyncService] Scheduler stopped');
  }

  async syncAllAccounts() {
    const db = getDb();
    const accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1').all();
    db.close();

    console.log(`[SyncService] Syncing ${accounts.length} accounts...`);

    for (const account of accounts) {
      try {
        await this.syncAccount(account);
      } catch (error) {
        console.error(`[SyncService] Error syncing ${account.email}:`, error.message);
      }
    }

    // 同步完成后应用规则 + 检测验证码
    this.applyRulesToNewEmails();
    this.detectVerificationCodesFromRecent();
  }

  async syncAccount(account) {
    const db = getDb();
    
    try {
      // 获取最后同步时间
      const lastEmail = db.prepare(
        'SELECT received_at FROM emails WHERE account_id = ? ORDER BY received_at DESC LIMIT 1'
      ).get(account.id);
      
      const sinceDate = lastEmail?.received_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const imap = new ImapService(account);
      const emails = await imap.fetchRecentEmails(sinceDate);
      
      let newCount = 0;
      const newEmailIds = [];
      
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO emails (
          id, account_id, message_id, uid, folder,
          from_address, from_name, to_address,
          subject, preview, body_text, body_html,
          received_at, is_read, has_attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateAccountStmt = db.prepare(
        "UPDATE accounts SET last_sync_at = datetime('now'), last_error = NULL WHERE id = ?"
      );

      for (const email of emails) {
        // 检查是否已存在（通过 message_id 或 uid + account_id）
        const existing = db.prepare(
          'SELECT id FROM emails WHERE (message_id = ? AND message_id IS NOT NULL) OR (uid = ? AND account_id = ?)'
        ).get(email.message_id, email.uid, account.id);

        if (!existing) {
          const emailId = uuidv4();
          insertStmt.run(
            emailId,
            account.id,
            email.message_id,
            email.uid,
            'INBOX',
            email.from_address,
            email.from_name,
            email.to_address,
            email.subject,
            email.preview,
            email.body_text,
            email.body_html,
            email.received_at,
            email.is_read,
            email.has_attachments
          );
          newEmailIds.push(emailId);
          newCount++;
        }
      }

      updateAccountStmt.run(account.id);
      db.close();

      if (newCount > 0) {
        console.log(`[SyncService] ${account.email}: ${newCount} new emails`);
        return newEmailIds;
      }
      
      return [];
    } catch (error) {
      const db2 = getDb();
      db2.prepare('UPDATE accounts SET last_error = ? WHERE id = ?').run(error.message, account.id);
      db2.close();
      throw error;
    }
  }

  // 对新邮件应用规则
  applyRulesToNewEmails() {
    try {
      // 重新加载规则
      ruleEngine.loadRules();
      
      // 处理未打标签的邮件
      const results = ruleEngine.processAllUnprocessed();
      
      if (results.length > 0) {
        console.log(`[SyncService] Applied rules to ${results.length} emails`);
      }
      
      // 检测退回邮件
      this.detectBouncedEmails();
    } catch (error) {
      console.error('[SyncService] Error applying rules:', error.message);
    }
  }

  // 检测退回邮件并标记原始邮件
  detectBouncedEmails() {
    const db = getDb();
    try {
      // 查找未处理的退回邮件
      const bounceEmails = db.prepare(`
        SELECT * FROM emails 
        WHERE (from_address LIKE '%postmaster%' OR from_address LIKE '%mailer-daemon%' OR subject LIKE '%退信%')
        AND is_bounced = 0
        AND is_deleted = 0
      `).all();

      for (const bounce of bounceEmails) {
        // 从退回邮件的正文或HTML中提取原始收件人
        const content = bounce.body_text || bounce.body_html || bounce.preview || '';
        const originalTo = this.extractOriginalRecipient(content);
        
        if (originalTo) {
          // 查找对应的已发送邮件
          const sentEmail = db.prepare(`
            SELECT id FROM emails 
            WHERE folder = 'SENT' 
            AND to_address = ?
            AND is_bounced = 0
            ORDER BY received_at DESC
            LIMIT 1
          `).get(originalTo);

          if (sentEmail) {
            // 标记原始邮件为已退回
            db.prepare('UPDATE emails SET is_bounced = 1 WHERE id = ?').run(sentEmail.id);
            console.log(`[SyncService] Marked email ${sentEmail.id} as bounced to ${originalTo}`);
          }
        }

        // 标记退回邮件本身为已处理
        db.prepare('UPDATE emails SET is_bounced = 1 WHERE id = ?').run(bounce.id);
      }
    } catch (error) {
      console.error('[SyncService] Error detecting bounced emails:', error.message);
    } finally {
      db.close();
    }
  }

  // 从退回邮件中提取原始收件人
  extractOriginalRecipient(text) {
    if (!text) return null;
    
    // 常见的退回邮件格式
    const patterns = [
      /无法发送到\s*([^\s<>]+@[^\s<>]+)/,
      /收件人[：:]\s*([^\s<>]+@[^\s<>]+)/,
      /To[：:]\s*([^\s<>]+@[^\s<>]+)/,
      /<([^\s<>]+@[^\s<>]+)>/,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  async syncSingleAccount(accountId) {
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    db.close();
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    const newEmailIds = await this.syncAccount(account);
    
    // 对新邮件应用规则 + 检测验证码
    if (newEmailIds.length > 0) {
      this.applyRulesToNewEmails();
      this.detectVerificationCodes(newEmailIds);
    }
    
    return newEmailIds;
  }

  // ── 加速模式 ──

  startBoostMode(accountId, durationSeconds = 300) {
    this.stopBoostMode(); // 先清理旧的

    this.boostAccountId = accountId || null;
    this.boostEndTime = Date.now() + durationSeconds * 1000;

    console.log(`[SyncService] Boost mode started for ${durationSeconds}s, interval=15s, account=${accountId || 'ALL'}`);

    // 每15秒同步一次
    this.boostJob = new CronJob('*/15 * * * * *', async () => {
      if (Date.now() >= this.boostEndTime) {
        this.stopBoostMode();
        return;
      }
      try {
        const db = getDb();
        let accounts;
        if (this.boostAccountId) {
          accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1 AND id = ?').all(this.boostAccountId);
        } else {
          accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1').all();
        }
        db.close();

        for (const account of accounts) {
          try {
            const newIds = await this.syncAccount(account);
            if (newIds.length > 0) {
              this.applyRulesToNewEmails();
              this.detectVerificationCodes(newIds);
            }
          } catch (e) {
            console.error(`[SyncService/Boost] Error syncing ${account.email}:`, e.message);
          }
        }
      } catch (e) {
        console.error('[SyncService/Boost] Error:', e.message);
      }
    });

    this.boostJob.start();

    // 设置超时自动停止
    this.boostTimer = setTimeout(() => {
      this.stopBoostMode();
    }, durationSeconds * 1000);

    // 广播状态
    sseManager.broadcast('boost_status', {
      active: true,
      account_id: this.boostAccountId,
      end_time: new Date(this.boostEndTime).toISOString(),
      remaining_seconds: durationSeconds,
    });
  }

  stopBoostMode() {
    if (this.boostJob) {
      this.boostJob.stop();
      this.boostJob = null;
    }
    if (this.boostTimer) {
      clearTimeout(this.boostTimer);
      this.boostTimer = null;
    }
    const wasActive = this.boostEndTime !== null;
    this.boostAccountId = null;
    this.boostEndTime = null;

    if (wasActive) {
      console.log('[SyncService] Boost mode ended, restored default interval');
      sseManager.broadcast('boost_status', { active: false });
    }
  }

  getBoostStatus() {
    if (!this.boostEndTime) {
      return { active: false, account_id: null, remaining_seconds: 0 };
    }
    const remaining = Math.max(0, Math.round((this.boostEndTime - Date.now()) / 1000));
    if (remaining === 0) {
      this.stopBoostMode();
      return { active: false, account_id: null, remaining_seconds: 0 };
    }
    return {
      active: true,
      account_id: this.boostAccountId,
      remaining_seconds: remaining,
      end_time: new Date(this.boostEndTime).toISOString(),
    };
  }

  // ── 验证码检测 ──

  detectVerificationCodes(emailIds) {
    if (!emailIds || emailIds.length === 0) return;

    const db = getDb();
    try {
      // 加载忽略发件人列表
      const ignoredRows = db.prepare('SELECT from_address FROM ignored_senders').all();
      const ignoredSet = new Set(ignoredRows.map(r => r.from_address.toLowerCase()));

      for (const emailId of emailIds) {
        const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
        if (!email) continue;
        this._checkOneEmail(db, email, ignoredSet);
      }
    } catch (error) {
      console.error('[SyncService] Error detecting codes:', error.message);
    } finally {
      db.close();
    }
  }

  // 检测最近1小时内尚未检测过的邮件
  detectVerificationCodesFromRecent() {
    const db = getDb();
    try {
      const ignoredRows = db.prepare('SELECT from_address FROM ignored_senders').all();
      const ignoredSet = new Set(ignoredRows.map(r => r.from_address.toLowerCase()));

      // 最近1小时内、未检测过的邮件
      const emails = db.prepare(`
        SELECT e.* FROM emails e
        WHERE e.is_deleted = 0
          AND e.folder = 'INBOX'
          AND e.created_at > datetime('now', '-1 hour')
          AND NOT EXISTS (SELECT 1 FROM detected_codes dc WHERE dc.email_id = e.id)
      `).all();

      for (const email of emails) {
        this._checkOneEmail(db, email, ignoredSet);
      }
    } catch (error) {
      console.error('[SyncService] Error in detectVerificationCodesFromRecent:', error.message);
    } finally {
      db.close();
    }
  }

  _checkOneEmail(db, email, ignoredSet) {
    // 检查发件人是否被忽略
    if (email.from_address && ignoredSet.has(email.from_address.toLowerCase())) {
      return;
    }

    // 运行检测引擎
    const result = detectCode(email.subject, email.body_text, email.body_html);
    if (!result.hit || !result.code) return;

    // 存入数据库
    const codeId = uuidv4();
    db.prepare(`
      INSERT INTO detected_codes (id, email_id, code, account_id, from_address, from_name, confidence, keyword)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codeId,
      email.id,
      result.code,
      email.account_id,
      email.from_address,
      email.from_name,
      result.confidence,
      result.keyword
    );

    // 获取账号信息
    const account = db.prepare('SELECT name, email FROM accounts WHERE id = ?').get(email.account_id);

    // 通过SSE广播给前端
    sseManager.broadcast('code_detected', {
      id: codeId,
      email_id: email.id,
      code: result.code,
      confidence: result.confidence,
      keyword: result.keyword,
      from_address: email.from_address,
      from_name: email.from_name,
      account_name: account?.name || '',
      account_email: account?.email || '',
      subject: email.subject,
      detected_at: new Date().toISOString(),
    });

    console.log(`[SyncService] Code detected: ${result.code} from ${email.from_address} (${result.confidence})`);
  }
}

export const syncService = new SyncService();
