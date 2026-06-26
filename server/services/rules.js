import { getDb } from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

export class RuleEngine {
  constructor() {
    this.rules = [];
    this.loadRules();
  }

  loadRules() {
    const db = getDb();
    try {
      this.rules = db.prepare(
        'SELECT * FROM rules WHERE is_active = 1 ORDER BY priority DESC'
      ).all();
    } finally {
      db.close();
    }
  }

  // 检查单条邮件是否匹配规则
  matchRule(email, rule) {
    let fieldValue = '';
    
    switch (rule.match_field) {
      case 'from_address':
        fieldValue = email.from_address || '';
        break;
      case 'from_name':
        fieldValue = email.from_name || '';
        break;
      case 'subject':
        fieldValue = email.subject || '';
        break;
      case 'body':
        fieldValue = email.body_text || email.preview || '';
        break;
      case 'to_address':
        fieldValue = email.to_address || '';
        break;
      default:
        fieldValue = email.subject || '';
    }

    const value = rule.match_value.toLowerCase();
    const field = fieldValue.toLowerCase();

    switch (rule.match_type) {
      case 'contains':
        return field.includes(value);
      case 'equals':
        return field === value;
      case 'starts_with':
        return field.startsWith(value);
      case 'ends_with':
        return field.endsWith(value);
      case 'not_contains':
        return !field.includes(value);
      case 'regex':
        try {
          const regex = new RegExp(rule.match_value, 'i');
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      default:
        return field.includes(value);
    }
  }

  // 对邮件应用所有匹配的规则
  applyRules(email) {
    const matchedRules = [];
    const actions = [];

    for (const rule of this.rules) {
      if (this.matchRule(email, rule)) {
        matchedRules.push(rule);
        actions.push({
          type: rule.action_type,
          value: rule.action_value,
          ruleName: rule.name,
        });
      }
    }

    return { matchedRules, actions };
  }

  // 处理新邮件
  processEmail(emailId) {
    const db = getDb();
    try {
      const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
      if (!email) return [];

      const { matchedRules, actions } = this.applyRules(email);

      for (const action of actions) {
        switch (action.type) {
          case 'tag':
            this.addTag(db, emailId, action.value);
            break;
          case 'archive':
            db.prepare('UPDATE emails SET is_archived = 1 WHERE id = ?').run(emailId);
            break;
          case 'mark_read':
            db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(emailId);
            break;
          case 'star':
            db.prepare('UPDATE emails SET is_starred = 1 WHERE id = ?').run(emailId);
            break;
        }
      }

      return actions;
    } finally {
      db.close();
    }
  }

  // 批量处理邮件
  processEmails(emailIds) {
    const results = [];
    for (const id of emailIds) {
      const actions = this.processEmail(id);
      if (actions.length > 0) {
        results.push({ emailId: id, actions });
      }
    }
    return results;
  }

  // 处理所有未处理的邮件
  processAllUnprocessed() {
    const db = getDb();
    try {
      // 获取没有标签的邮件
      const emails = db.prepare(`
        SELECT e.id FROM emails e
        LEFT JOIN email_tags et ON e.id = et.email_id
        WHERE et.email_id IS NULL AND e.is_deleted = 0
        ORDER BY e.received_at DESC
        LIMIT 100
      `).all();

      return this.processEmails(emails.map(e => e.id));
    } finally {
      db.close();
    }
  }

  addTag(db, emailId, tagName) {
    // 确保标签存在
    let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
    if (!tag) {
      const tagId = uuidv4();
      db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tagName);
      tag = { id: tagId };
    }

    // 添加邮件标签关联
    try {
      db.prepare('INSERT OR IGNORE INTO email_tags (email_id, tag_id) VALUES (?, ?)').run(emailId, tag.id);
    } catch {
      // 忽略重复
    }
  }
}

// 规则 CRUD
export function getRules() {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM rules ORDER BY priority DESC, created_at DESC').all();
  } finally {
    db.close();
  }
}

export function getRule(id) {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
  } finally {
    db.close();
  }
}

export function createRule(data) {
  const db = getDb();
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO rules (id, name, description, is_active, priority, match_field, match_type, match_value, action_type, action_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || '',
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.priority || 0,
      data.match_field || 'subject',
      data.match_type || 'contains',
      data.match_value,
      data.action_type || 'tag',
      data.action_value || null
    );
    return { id, ...data };
  } finally {
    db.close();
  }
}

export function updateRule(id, data) {
  const db = getDb();
  try {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.match_field !== undefined) { fields.push('match_field = ?'); values.push(data.match_field); }
    if (data.match_type !== undefined) { fields.push('match_type = ?'); values.push(data.match_type); }
    if (data.match_value !== undefined) { fields.push('match_value = ?'); values.push(data.match_value); }
    if (data.action_type !== undefined) { fields.push('action_type = ?'); values.push(data.action_type); }
    if (data.action_value !== undefined) { fields.push('action_value = ?'); values.push(data.action_value); }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return { id, ...data };
  } finally {
    db.close();
  }
}

export function deleteRule(id) {
  const db = getDb();
  try {
    db.prepare('DELETE FROM rules WHERE id = ?').run(id);
  } finally {
    db.close();
  }
}

export function toggleRule(id) {
  const db = getDb();
  try {
    const rule = db.prepare('SELECT is_active FROM rules WHERE id = ?').get(id);
    if (!rule) throw new Error('Rule not found');
    db.prepare('UPDATE rules SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(rule.is_active ? 0 : 1, id);
    return { is_active: !rule.is_active };
  } finally {
    db.close();
  }
}

// 获取所有标签
export function getTags() {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT t.*, COUNT(et.email_id) as email_count
      FROM tags t
      LEFT JOIN email_tags et ON t.id = et.tag_id
      GROUP BY t.id
      ORDER BY email_count DESC
    `).all();
  } finally {
    db.close();
  }
}

export function createTag(name, color = '#3b82f6') {
  const db = getDb();
  try {
    const id = uuidv4();
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color);
    return { id, name, color };
  } finally {
    db.close();
  }
}

export function deleteTag(id) {
  const db = getDb();
  try {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  } finally {
    db.close();
  }
}

// 获取邮件的标签
export function getEmailTags(emailId) {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT t.* FROM tags t
      JOIN email_tags et ON t.id = et.tag_id
      WHERE et.email_id = ?
    `).all(emailId);
  } finally {
    db.close();
  }
}

// 给邮件添加标签
export function addEmailTag(emailId, tagId) {
  const db = getDb();
  try {
    db.prepare('INSERT OR IGNORE INTO email_tags (email_id, tag_id) VALUES (?, ?)').run(emailId, tagId);
  } finally {
    db.close();
  }
}

// 移除邮件标签
export function removeEmailTag(emailId, tagId) {
  const db = getDb();
  try {
    db.prepare('DELETE FROM email_tags WHERE email_id = ? AND tag_id = ?').run(emailId, tagId);
  } finally {
    db.close();
  }
}

// 内置规则模板
export function getRuleTemplates() {
  return [
    {
      name: '订阅邮件归档',
      description: '自动归档订阅类邮件',
      match_field: 'from_address',
      match_type: 'contains',
      match_value: 'newsletter',
      action_type: 'archive',
    },
    {
      name: '订阅邮件归档（unsubscribe）',
      description: '自动归档包含 unsubscribe 的邮件',
      match_field: 'body',
      match_type: 'contains',
      match_value: 'unsubscribe',
      action_type: 'archive',
    },
    {
      name: '验证码邮件',
      description: '给验证码邮件打标签',
      match_field: 'subject',
      match_type: 'contains',
      match_value: '验证码',
      action_type: 'tag',
      action_value: '验证码',
    },
    {
      name: '通知邮件',
      description: '给通知类邮件打标签',
      match_field: 'subject',
      match_type: 'contains',
      match_value: '通知',
      action_type: 'tag',
      action_value: '通知',
    },
    {
      name: '重要邮件标记星标',
      description: '包含"紧急"的邮件自动星标',
      match_field: 'subject',
      match_type: 'contains',
      match_value: '紧急',
      action_type: 'star',
    },
  ];
}

export const ruleEngine = new RuleEngine();
