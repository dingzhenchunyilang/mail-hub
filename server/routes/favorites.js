import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';

const router = Router();

// 获取所有收藏夹
router.get('/', (req, res) => {
  const { platform, search } = req.query;
  const db = getDb();
  try {
    let where = [];
    let params = [];

    if (platform) {
      where.push('platform = ?');
      params.push(platform);
    }

    if (search) {
      where.push('(platform LIKE ? OR account_name LIKE ? OR username LIKE ? OR email LIKE ? OR notes LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const favorites = db.prepare(
      `SELECT * FROM favorites ${whereClause} ORDER BY platform, account_name`
    ).all(...params);

    res.json({ success: true, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取所有平台列表
router.get('/platforms', (req, res) => {
  const db = getDb();
  try {
    const platforms = db.prepare(
      'SELECT DISTINCT platform, COUNT(*) as count FROM favorites GROUP BY platform ORDER BY count DESC'
    ).all();
    res.json({ success: true, data: platforms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取单个收藏
router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get(req.params.id);
    if (!favorite) {
      return res.status(404).json({ success: false, message: '收藏不存在' });
    }
    res.json({ success: true, data: favorite });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 创建收藏
router.post('/', (req, res) => {
  const { platform, account_name, username, email, phone, notes, url } = req.body;

  if (!platform || !account_name) {
    return res.status(400).json({ success: false, message: '平台名称和账号名为必填' });
  }

  const db = getDb();
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO favorites (id, platform, account_name, username, email, phone, notes, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, platform, account_name, username || '', email || '', phone || '', notes || '', url || '');

    res.json({ success: true, data: { id, platform, account_name } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 更新收藏
router.put('/:id', (req, res) => {
  const { platform, account_name, username, email, phone, notes, url } = req.body;
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM favorites WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '收藏不存在' });
    }

    db.prepare(`
      UPDATE favorites SET
        platform = COALESCE(?, platform),
        account_name = COALESCE(?, account_name),
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        notes = COALESCE(?, notes),
        url = COALESCE(?, url),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(platform, account_name, username, email, phone, notes, url, req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 删除收藏
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

export default router;
