import { Router } from 'express';
import { getDb } from '../models/database.js';
import { translationService } from '../services/translation.js';

const router = Router();

// 翻译状态
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      configured: translationService.isConfigured(),
      provider: translationService.provider,
      model: translationService.model,
    }
  });
});

// 翻译邮件
router.post('/translate', async (req, res) => {
  const { email_id, target_lang, force_refresh } = req.body;

  if (!email_id) {
    return res.status(400).json({ success: false, message: '缺少 email_id' });
  }
  if (!target_lang) {
    return res.status(400).json({ success: false, message: '缺少 target_lang' });
  }

  const db = getDb();
  try {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(email_id);
    if (!email) {
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    const result = await translationService.translateEmail(email, target_lang, !!force_refresh);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Translation] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    db.close();
  }
});

// 检查缓存
router.get('/cache/:email_id/:target_lang', (req, res) => {
  const { email_id, target_lang } = req.params;
  const cached = translationService.getCachedTranslation(email_id, target_lang);

  if (cached) {
    res.json({ success: true, data: cached });
  } else {
    res.json({ success: false, data: null });
  }
});

// 清除缓存
router.delete('/cache/:email_id/:target_lang?', (req, res) => {
  const { email_id, target_lang } = req.params;
  translationService.clearCache(email_id, target_lang || null);
  res.json({ success: true });
});

export default router;
