import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _rawPath = process.env.DB_PATH || '../../data/mail-hub.db';
const DB_PATH = path.isAbsolute(_rawPath) ? _rawPath : path.resolve(__dirname, '..', _rawPath);

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initDb() {
  const db = getDb();
  
  // 邮箱账号表
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      imap_host TEXT NOT NULL,
      imap_port INTEGER DEFAULT 993,
      imap_secure INTEGER DEFAULT 1,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER DEFAULT 587,
      smtp_secure INTEGER DEFAULT 0,
      username TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      signature TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 邮件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      message_id TEXT,
      uid INTEGER,
      folder TEXT DEFAULT 'INBOX',
      from_address TEXT,
      from_name TEXT,
      to_address TEXT,
      subject TEXT,
      preview TEXT,
      body_text TEXT,
      body_html TEXT,
      received_at TEXT,
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      has_attachments INTEGER DEFAULT 0,
      is_bounced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // 邮件标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_tags (
      email_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (email_id, tag_id),
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // 阶段二：规则表
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      match_field TEXT NOT NULL DEFAULT 'subject',
      match_type TEXT NOT NULL DEFAULT 'contains',
      match_value TEXT NOT NULL,
      action_type TEXT NOT NULL DEFAULT 'tag',
      action_value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 阶段二：账号收藏夹表
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      username TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 验证码检测记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS detected_codes (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      code TEXT NOT NULL,
      account_id TEXT NOT NULL,
      from_address TEXT,
      from_name TEXT,
      confidence TEXT DEFAULT 'high',
      keyword TEXT,
      detected_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // 验证码忽略发件人表（误判处理）
  db.exec(`
    CREATE TABLE IF NOT EXISTS ignored_senders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_address TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
    CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
    CREATE INDEX IF NOT EXISTS idx_emails_read ON emails(is_read);
    CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(is_starred);
    CREATE INDEX IF NOT EXISTS idx_emails_deleted ON emails(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active);
    CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority DESC);
    CREATE INDEX IF NOT EXISTS idx_email_tags_email ON email_tags(email_id);
    CREATE INDEX IF NOT EXISTS idx_email_tags_tag ON email_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_platform ON favorites(platform);
    CREATE INDEX IF NOT EXISTS idx_detected_codes_email ON detected_codes(email_id);
    CREATE INDEX IF NOT EXISTS idx_detected_codes_time ON detected_codes(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ignored_senders_addr ON ignored_senders(from_address);
  `);

  // 阶段三：日程表
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      all_day INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      color TEXT DEFAULT '#3b82f6',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
  `);

  console.log('Database initialized successfully');
  db.close();
}

// 如果直接运行此文件
if (process.argv[1] && process.argv[1].includes('init-db')) {
  initDb();
}
