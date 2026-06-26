import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { decrypt } from '../utils/crypto.js';

export class ImapService {
  constructor(account) {
    this.account = account;
    this.connection = null;
  }

  getConfig() {
    return {
      user: this.account.username,
      password: decrypt(this.account.password_encrypted),
      host: this.account.imap_host,
      port: this.account.imap_port,
      tls: this.account.imap_secure === 1,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 30000,
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const config = this.getConfig();
      this.connection = new Imap(config);
      
      this.connection.once('ready', () => resolve());
      this.connection.once('error', (err) => reject(err));
      this.connection.once('end', () => {});
      
      this.connection.connect();
    });
  }

  async disconnect() {
    if (this.connection) {
      this.connection.end();
      this.connection = null;
    }
  }

  async testConnection() {
    try {
      await this.connect();
      await this.disconnect();
      return { success: true, message: '连接成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async openBox(folder = 'INBOX') {
    return new Promise((resolve, reject) => {
      this.connection.openBox(folder, true, (err, box) => {
        if (err) reject(err);
        else resolve(box);
      });
    });
  }

  async fetchEmails(options = {}) {
    const { folder = 'INBOX', limit = 50, since } = options;
    
    await this.connect();
    const box = await this.openBox(folder);
    
    let searchCriteria = ['ALL'];
    if (since) {
      searchCriteria = [['SINCE', new Date(since)]];
    }
    
    const uids = await new Promise((resolve, reject) => {
      this.connection.search(searchCriteria, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (uids.length === 0) {
      await this.disconnect();
      return [];
    }
    
    // 取最新的 N 封
    const recentUids = uids.slice(-limit);
    
    const emails = await new Promise((resolve, reject) => {
      const results = [];
      const fetch = this.connection.fetch(recentUids, {
        bodies: ['HEADER', 'TEXT'],
        struct: true,
      });
      
      fetch.on('message', (msg, seqno) => {
        let headerData = '';
        let bodyData = '';
        
        msg.on('body', (stream, info) => {
          let buffer = '';
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', () => {
            if (info.which === 'HEADER') {
              headerData = buffer;
            } else {
              bodyData = buffer;
            }
          });
        });
        
        msg.once('attributes', (attrs) => {
          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(headerData + '\r\n\r\n' + bodyData);
              results.push({
                uid: attrs.uid,
                message_id: parsed.messageId,
                from_address: parsed.from?.value?.[0]?.address || '',
                from_name: parsed.from?.value?.[0]?.name || '',
                to_address: parsed.to?.value?.[0]?.address || '',
                subject: parsed.subject || '(无主题)',
                preview: this.cleanPreview(parsed.text || '', parsed.html || ''),
                body_text: parsed.text || '',
                body_html: parsed.html || '',
                received_at: parsed.date?.toISOString() || new Date().toISOString(),
                has_attachments: parsed.attachments?.length > 0 ? 1 : 0,
                is_read: attrs.flags?.includes('\\Seen') ? 1 : 0,
              });
            } catch (e) {
              console.error('Parse error:', e);
            }
          });
        });
      });
      
      fetch.once('error', reject);
      fetch.once('end', () => {
        // 等待所有解析完成
        setTimeout(() => resolve(results), 500);
      });
    });
    
    await this.disconnect();
    return emails;
  }

  async fetchRecentEmails(sinceDate) {
    return this.fetchEmails({ since: sinceDate, limit: 100 });
  }

  // 清理预览文本：去HTML残留、图片占位符、多余空白
  cleanPreview(text, html) {
    let preview = text || '';
    // 如果纯文本很短或为空，尝试从HTML提取
    if (preview.trim().length < 20 && html) {
      preview = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ');
    }
    return preview
      .replace(/\[image:[^\]]*\]/gi, '')    // [image: Google]
      .replace(/\[图片[^\]]*\]/gi, '')       // [图片]
      .replace(/<[^>]+>/g, '')               // 残留标签
      .replace(/&[a-z]+;/gi, ' ')           // HTML实体
      .replace(/\s+/g, ' ')                 // 多空白合并
      .trim()
      .substring(0, 120);
  }

  // 保存邮件到指定文件夹（如已发送）
  async appendEmail(folder, emailContent, flags = ['\\Seen']) {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.connection.append(emailContent, { mailbox: folder, flags }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 删除邮件（标记为已删除然后expunge）
  async deleteEmail(folder, uid) {
    await this.connect();
    await this.openBox(folder, false);
    
    return new Promise((resolve, reject) => {
      this.connection.addFlags(uid, '\\Deleted', (err) => {
        if (err) {
          this.disconnect();
          reject(err);
          return;
        }
        this.connection.expunge((err2) => {
          this.disconnect();
          if (err2) reject(err2);
          else resolve();
        });
      });
    });
  }
}

// 测试 IMAP 连接
export async function testImapConnection(accountData) {
  const testAccount = {
    ...accountData,
    password_encrypted: accountData.password_encrypted || 'dummy',
  };
  
  // 临时用明文密码测试
  const imap = new Imap({
    user: accountData.username,
    password: accountData.password || decrypt(accountData.password_encrypted),
    host: accountData.imap_host,
    port: accountData.imap_port,
    tls: accountData.imap_secure === 1,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 15000,
    authTimeout: 15000,
  });
  
  return new Promise((resolve) => {
    imap.once('ready', () => {
      imap.end();
      resolve({ success: true, message: 'IMAP 连接测试成功' });
    });
    
    imap.once('error', (err) => {
      resolve({ success: false, message: `连接失败: ${err.message}` });
    });
    
    imap.connect();
  });
}
