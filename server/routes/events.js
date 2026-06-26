import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';

const router = Router();

// 获取日程列表（支持时间范围筛选）
router.get('/', (req, res) => {
  const { start, end, source } = req.query;
  const db = getDb();
  try {
    let where = [];
    let params = [];

    if (start) {
      where.push('start_time >= ?');
      params.push(start);
    }
    if (end) {
      where.push('start_time <= ?');
      params.push(end);
    }
    if (source) {
      where.push('source = ?');
      params.push(source);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const events = db.prepare(
      `SELECT * FROM events ${whereClause} ORDER BY start_time ASC`
    ).all(...params);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取临近日程（24小时内）
router.get('/upcoming', (req, res) => {
  const db = getDb();
  try {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const events = db.prepare(
      'SELECT * FROM events WHERE start_time >= ? AND start_time <= ? ORDER BY start_time ASC'
    ).all(now, tomorrow);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 获取单个日程
router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: '日程不存在' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 创建日程
router.post('/', (req, res) => {
  const { title, start_time, end_time, all_day, notes, source, color } = req.body;

  if (!title || !start_time) {
    return res.status(400).json({ success: false, message: '标题和开始时间为必填' });
  }

  const db = getDb();
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, title, start_time, end_time, all_day, notes, source, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      start_time,
      end_time || null,
      all_day ? 1 : 0,
      notes || '',
      source || 'manual',
      color || '#3b82f6'
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 更新日程
router.put('/:id', (req, res) => {
  const { title, start_time, end_time, all_day, notes, source, color } = req.body;
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '日程不存在' });
    }

    db.prepare(`
      UPDATE events SET
        title = COALESCE(?, title),
        start_time = COALESCE(?, start_time),
        end_time = ?,
        all_day = COALESCE(?, all_day),
        notes = COALESCE(?, notes),
        source = COALESCE(?, source),
        color = COALESCE(?, color),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title,
      start_time,
      end_time !== undefined ? end_time : existing.end_time,
      all_day !== undefined ? (all_day ? 1 : 0) : null,
      notes,
      source,
      color,
      req.params.id
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 删除日程
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

export default router;
