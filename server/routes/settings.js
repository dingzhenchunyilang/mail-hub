import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiService } from '../services/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

const router = Router();

// 读取当前配置（隐藏敏感字段）
router.get('/', (req, res) => {
  try {
    const env = parseEnv();
    res.json({
      success: true,
      data: {
        ai_provider: env.AI_PROVIDER || 'openai',
        ai_api_key: env.AI_API_KEY ? '***' + env.AI_API_KEY.slice(-4) : '',
        ai_base_url: env.AI_BASE_URL || 'https://api.openai.com/v1',
        ai_model: env.AI_MODEL || 'gpt-4o-mini',
        has_key: !!env.AI_API_KEY,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新配置
router.put('/', (req, res) => {
  try {
    const { ai_provider, ai_api_key, ai_base_url, ai_model } = req.body;
    const env = parseEnv();

    if (ai_provider !== undefined) env.AI_PROVIDER = ai_provider;
    if (ai_api_key !== undefined && ai_api_key !== '' && !ai_api_key.startsWith('***')) env.AI_API_KEY = ai_api_key;
    if (ai_base_url !== undefined) env.AI_BASE_URL = ai_base_url;
    if (ai_model !== undefined) env.AI_MODEL = ai_model;

    writeEnv(env);

    // 热更新 AI 服务配置
    aiService.provider = env.AI_PROVIDER || 'openai';
    aiService.apiKey = env.AI_API_KEY || '';
    aiService.baseUrl = env.AI_BASE_URL || 'https://api.openai.com/v1';
    aiService.model = env.AI_MODEL || 'gpt-4o-mini';

    res.json({
      success: true,
      data: {
        configured: aiService.isConfigured(),
        provider: aiService.provider,
        model: aiService.model,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试连接
router.post('/test', async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.json({ success: false, message: '未配置 API Key' });
    }
    const result = await aiService.chat([{ role: 'user', content: '回复"连接成功"这四个字' }], { maxTokens: 100 });
    res.json({ success: true, message: result.trim() || '(连接成功，模型返回空内容)' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ── 工具函数 ──

function parseEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

function writeEnv(env) {
  const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
  const updated = [];
  const written = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      updated.push(line);
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      updated.push(line);
      continue;
    }
    const key = trimmed.substring(0, eqIndex).trim();
    if (key in env) {
      updated.push(`${key}=${env[key]}`);
      written.add(key);
    } else {
      updated.push(line);
    }
  }

  // 追加新 key（如果有）
  for (const [key, value] of Object.entries(env)) {
    if (!written.has(key)) {
      updated.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(ENV_PATH, updated.join('\n'), 'utf-8');
}

export default router;
