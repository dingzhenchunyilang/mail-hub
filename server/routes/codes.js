import { Router } from 'express';
import { getDb } from '../models/database.js';
import { sseManager } from '../services/sse.js';
import { syncService } from '../services/sync.js';

const router = Router();

// ── SSE 端点：前端监听验证码事件 ──
router.get('/codes/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',  // nginx 不缓冲
  });

  // 初始心跳
  res.write('event: connected\ndata: {}\n\n');

  sseManager.addClient(res);

  // 每30秒发心跳保活
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// ── 获取验证码历史记录 ──
router.get('/codes', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT dc.*, a.name as account_name, a.email as account_email
      FROM detected_codes dc
      LEFT JOIN accounts a ON dc.account_id = a.id
      ORDER BY dc.detected_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM detected_codes').get();

    res.json({ success: true, data: rows, total: total.count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// ── 删除单条验证码记录 ──
router.delete('/codes/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM detected_codes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// ── "这不是验证码" — 移除记录并加入忽略发件人名单 ──
router.post('/codes/:id/dismiss', (req, res) => {
  const db = getDb();
  try {
    const record = db.prepare('SELECT * FROM detected_codes WHERE id = ?').get(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    // 加入忽略名单（INSERT OR IGNORE 避免重复）
    if (record.from_address) {
      db.prepare('INSERT OR IGNORE INTO ignored_senders (from_address) VALUES (?)').run(record.from_address);
    }

    // 删除记录
    db.prepare('DELETE FROM detected_codes WHERE id = ?').run(req.params.id);

    res.json({ success: true, ignored_sender: record.from_address });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// ── 获取忽略发件人列表 ──
router.get('/codes/ignored-senders', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM ignored_senders ORDER BY created_at DESC').all();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// ── 移除忽略发件人 ──
router.delete('/codes/ignored-senders/:address', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM ignored_senders WHERE from_address = ?').run(req.params.address);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// ── "等待验证码" 加速轮询 ──
router.post('/codes/boost', (req, res) => {
  const { account_id, duration_seconds = 300 } = req.body;
  try {
    syncService.startBoostMode(account_id, duration_seconds);
    res.json({
      success: true,
      message: `加速模式已启动，持续 ${duration_seconds} 秒`,
      interval_seconds: 15,
      duration_seconds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 取消加速轮询 ──
router.post('/codes/boost/cancel', (req, res) => {
  try {
    syncService.stopBoostMode();
    res.json({ success: true, message: '已恢复默认轮询间隔' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 查询加速状态 ──
router.get('/codes/boost/status', (req, res) => {
  const status = syncService.getBoostStatus();
  res.json({ success: true, data: status });
});

export default router;
