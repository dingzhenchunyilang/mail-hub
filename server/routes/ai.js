import { Router } from 'express';
import { getDb } from '../models/database.js';
import { aiService } from '../services/ai.js';

const router = Router();

// 检查 AI 配置状态
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      configured: aiService.isConfigured(),
      provider: aiService.provider,
      model: aiService.model,
    }
  });
});

// 邮件摘要
router.post('/summarize', async (req, res) => {
  const { email_id } = req.body;
  
  if (!email_id) {
    return res.status(400).json({ success: false, message: '缺少 email_id' });
  }

  const db = getDb();
  try {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(email_id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    const summary = await aiService.summarizeEmail(email);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// AI 帮写回复
router.post('/draft-reply', async (req, res) => {
  const { email_id, tone = 'formal' } = req.body;
  
  if (!email_id) {
    return res.status(400).json({ success: false, message: '缺少 email_id' });
  }

  const db = getDb();
  try {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(email_id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    const draft = await aiService.draftReply(email, tone);
    res.json({ success: true, data: { draft } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 润色邮件
router.post('/polish', async (req, res) => {
  const { text, tone = 'formal' } = req.body;
  
  if (!text) {
    return res.status(400).json({ success: false, message: '缺少文本内容' });
  }

  try {
    const polished = await aiService.polishEmail(text, tone);
    res.json({ success: true, data: { polished } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 总结邮件线程
router.post('/summarize-thread', async (req, res) => {
  const { email_ids } = req.body;
  
  if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
    return res.status(400).json({ success: false, message: '缺少 email_ids 数组' });
  }

  const db = getDb();
  try {
    const placeholders = email_ids.map(() => '?').join(',');
    const emails = db.prepare(
      `SELECT * FROM emails WHERE id IN (${placeholders}) ORDER BY received_at ASC`
    ).all(...email_ids);

    if (emails.length === 0) {
      return res.status(404).json({ success: false, message: '未找到邮件' });
    }

    const summary = await aiService.summarizeThread(emails);
    
    // 尝试提取日程建议
    const events = await aiService.extractEvents(summary);
    
    res.json({ 
      success: true, 
      data: { 
        summary,
        suggestedEvents: events,
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 从邮件中提取日程建议
router.post('/extract-events', async (req, res) => {
  const { email_id } = req.body;

  if (!email_id) {
    return res.status(400).json({ success: false, message: '缺少 email_id' });
  }

  const db = getDb();
  try {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(email_id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    const text = email.body_text || email.preview || email.subject || '';
    const events = await aiService.extractEvents(text);
    res.json({ success: true, data: { events } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

export default router;
