import { Router } from 'express';
import {
  getRules, getRule, createRule, updateRule, deleteRule, toggleRule,
  getTags, createTag, deleteTag, getEmailTags, addEmailTag, removeEmailTag,
  getRuleTemplates, ruleEngine
} from '../services/rules.js';

const router = Router();

// ===== 规则管理 =====

// 获取所有规则
router.get('/rules', (req, res) => {
  try {
    const rules = getRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取规则模板
router.get('/rules/templates', (req, res) => {
  try {
    const templates = getRuleTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个规则
router.get('/rules/:id', (req, res) => {
  try {
    const rule = getRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建规则
router.post('/rules', (req, res) => {
  try {
    const { name, match_value } = req.body;
    if (!name || !match_value) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const rule = createRule(req.body);
    ruleEngine.loadRules(); // 重新加载规则
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新规则
router.put('/rules/:id', (req, res) => {
  try {
    const rule = updateRule(req.params.id, req.body);
    ruleEngine.loadRules(); // 重新加载规则
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除规则
router.delete('/rules/:id', (req, res) => {
  try {
    deleteRule(req.params.id);
    ruleEngine.loadRules(); // 重新加载规则
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 切换规则启用状态
router.put('/rules/:id/toggle', (req, res) => {
  try {
    const result = toggleRule(req.params.id);
    ruleEngine.loadRules(); // 重新加载规则
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 手动对所有邮件应用规则
router.post('/rules/apply-all', (req, res) => {
  try {
    const results = ruleEngine.processAllUnprocessed();
    res.json({ success: true, data: { processed: results.length, results } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== 标签管理 =====

// 获取所有标签
router.get('/tags', (req, res) => {
  try {
    const tags = getTags();
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建标签
router.post('/tags', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: '标签名不能为空' });
    }
    const tag = createTag(name, color);
    res.json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除标签
router.delete('/tags/:id', (req, res) => {
  try {
    deleteTag(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取邮件的标签
router.get('/emails/:emailId/tags', (req, res) => {
  try {
    const tags = getEmailTags(req.params.emailId);
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 给邮件添加标签
router.post('/emails/:emailId/tags', (req, res) => {
  try {
    const { tag_id } = req.body;
    if (!tag_id) {
      return res.status(400).json({ success: false, message: 'tag_id 不能为空' });
    }
    addEmailTag(req.params.emailId, tag_id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 移除邮件标签
router.delete('/emails/:emailId/tags/:tagId', (req, res) => {
  try {
    removeEmailTag(req.params.emailId, req.params.tagId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
