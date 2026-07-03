// Translation Service — 独立于 AI 摘要/润色服务
// 支持单独配置翻译 provider / API Key / model
// 按段落翻译，保留 HTML 结构
// 支持 OpenAI 兼容接口 + 百度翻译 API

import { getDb } from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class TranslationService {
  constructor() {
    this.provider = process.env.TRANSLATION_PROVIDER || 'openai';
    this.apiKey = process.env.TRANSLATION_API_KEY || '';
    this.baseUrl = process.env.TRANSLATION_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.TRANSLATION_MODEL || 'gpt-4o-mini';
    this.baiduAppId = process.env.TRANSLATION_APP_ID || '';
  }

  isConfigured() {
    if (this.provider === 'baidu') {
      return !!(this.baiduAppId && this.apiKey);
    }
    return !!this.apiKey;
  }

  // ── 百度翻译 API 调用 ──

  async translateWithBaidu(text, fromLang, toLang) {
    if (!this.baiduAppId || !this.apiKey) {
      throw new Error('百度翻译未配置，请设置 APP ID 和密钥');
    }

    // 百度语言码映射
    const langMap = { zh: 'zh', en: 'en', ja: 'jp', ko: 'kor', fr: 'fra', es: 'spa', de: 'de', pt: 'pt', ru: 'ru', ar: 'ara' };
    const from = langMap[fromLang] || fromLang;
    const to = langMap[toLang] || toLang;

    const salt = Date.now().toString();
    const sign = crypto.createHash('md5').update(this.baiduAppId + text + salt + this.apiKey).digest('hex');

    const url = new URL('https://fanyi-api.baidu.com/api/trans/vip/translate');
    url.searchParams.set('q', text);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('appid', this.baiduAppId);
    url.searchParams.set('salt', salt);
    url.searchParams.set('sign', sign);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`百度翻译 API 错误: ${response.status}`);
      }

      const data = await response.json();
      if (data.error_code) {
        throw new Error(`百度翻译错误 [${data.error_code}]: ${data.error_msg}`);
      }

      const result = (data.trans_result || []).map(r => r.dst).join('\n');
      if (!result) {
        throw new Error('百度翻译返回空内容');
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── API 调用（OpenAI 兼容） ──

  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('翻译服务未配置，请在设置中配置翻译 API Key');
    }

    const { temperature = 0.3, maxTokens = 4000, timeoutMs = 60000 } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`翻译 API 错误: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0]?.message;
      const result = choice?.content || choice?.reasoning_content || '';
      if (!result) {
        throw new Error('翻译 API 返回空内容');
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── HTML 段落解析 ──

  // 将 HTML 拆分为语义块（保留结构）
  parseHtmlBlocks(html) {
    if (!html) return [];

    const blocks = [];
    // 匹配块级元素：p, div, h1-h6, li, blockquote, pre, td, th, dt, dd, figcaption
    // 以及独立的 br, hr
    const blockRegex = /<(p|div|h[1-6]|li|blockquote|pre|td|th|dt|dd|figcaption|section|article|header|footer)(\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;
    
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
      // 如果块级元素之前有非块内容（如纯文本、inline元素）
      const before = html.slice(lastIndex, match.index).trim();
      if (before && before.replace(/<[^>]+>/g, '').trim()) {
        blocks.push({ html: before, text: this.extractText(before) });
      }

      const fullHtml = match[0];
      const tag = match[1];
      const attrs = match[2] || '';
      const innerHtml = match[3];
      const text = this.extractText(innerHtml);

      if (text.trim()) {
        blocks.push({ html: fullHtml, text, tag, attrs });
      }

      lastIndex = match.index + fullHtml.length;
    }

    // 剩余内容
    const remaining = html.slice(lastIndex).trim();
    if (remaining) {
      const text = this.extractText(remaining);
      if (text.trim()) {
        blocks.push({ html: remaining, text });
      }
    }

    // 如果没找到任何块级元素，把整个内容当作一个块
    if (blocks.length === 0) {
      const text = this.extractText(html);
      if (text.trim()) {
        blocks.push({ html, text });
      }
    }

    return blocks;
  }

  // 从 HTML 中提取纯文本
  extractText(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|h[1-6]|li|blockquote|pre|td|th|dt|dd|tr|table|tbody|thead|ul|ol|dl|section|article|header|footer)[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 纯文本按段落拆分
  parseTextBlocks(text) {
    if (!text) return [];
    return text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => ({ html: p, text: p }));
  }

  // ── 翻译单个文本块 ──

  async translateBlock(text, targetLang) {
    if (!text.trim()) return '';

    // 百度翻译走专用接口
    if (this.provider === 'baidu') {
      const sourceLang = this.detectLanguage(text);
      return this.translateWithBaidu(text, sourceLang, targetLang);
    }

    const langNames = {
      zh: '中文', en: 'English', ja: '日本語', ko: '한국어',
      fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português',
      ru: 'Русский', ar: 'العربية',
    };
    const targetName = langNames[targetLang] || targetLang;

    const prompt = `You are a professional translator. Translate the following text to ${targetName}.
Rules:
- Output ONLY the translated text, no explanations
- Preserve line breaks and formatting
- Keep proper nouns, brand names, URLs, email addresses unchanged
- Keep numbers and codes unchanged
- If the text is already in ${targetName}, output it as-is

Text to translate:
${text}`;

    return this.chat([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 60000,
    });
  }

  // ── 批量翻译段落 ──

  async translateParagraphs(blocks, targetLang) {
    const results = [];
    // 逐段翻译，保持顺序和结构对应
    for (const block of blocks) {
      try {
        const translated = await this.translateBlock(block.text, targetLang);
        results.push({
          original_html: block.html,
          original_text: block.text,
          translated_text: translated,
          tag: block.tag || null,
          attrs: block.attrs || '',
        });
      } catch (e) {
        // 单段失败不影响其他段
        results.push({
          original_html: block.html,
          original_text: block.text,
          translated_text: `[翻译失败: ${e.message}]`,
          tag: block.tag || null,
          attrs: block.attrs || '',
          error: true,
        });
      }
    }
    return results;
  }

  // ── 语言检测（简单启发式） ──

  detectLanguage(text) {
    if (!text) return 'en';
    const sample = text.substring(0, 500);
    // CJK 字符占比
    const cjkCount = (sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const totalCount = sample.replace(/\s/g, '').length;
    if (totalCount === 0) return 'en';
    const cjkRatio = cjkCount / totalCount;
    if (cjkRatio > 0.3) return 'zh';
    // 日文假名
    const jaCount = (sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    if (jaCount > 5) return 'ja';
    // 韩文
    const koCount = (sample.match(/[\uac00-\ud7af\u1100-\u11ff]/g) || []).length;
    if (koCount > 5) return 'ko';
    return 'en';
  }

  // ── 主翻译入口 ──

  async translateEmail(email, targetLang, forceRefresh = false) {
    const db = getDb();

    try {
      // 1. 检查缓存
      if (!forceRefresh) {
        const cached = db.prepare(
          'SELECT * FROM translation_cache WHERE email_id = ? AND target_lang = ?'
        ).get(email.id, targetLang);

        if (cached) {
          console.log(`[Translation] Cache hit: ${email.id} → ${targetLang}`);
          return {
            paragraphs: JSON.parse(cached.translated_paragraphs),
            source_lang: cached.source_lang,
            target_lang: cached.target_lang,
            cached: true,
            provider: cached.provider,
          };
        }
      }

      // 2. 解析段落
      const html = email.body_html || '';
      const text = email.body_text || email.preview || '';
      const blocks = html ? this.parseHtmlBlocks(html) : this.parseTextBlocks(text);

      if (blocks.length === 0) {
        throw new Error('邮件内容为空，无法翻译');
      }

      // 3. 检测源语言
      const sourceLang = this.detectLanguage(text || this.extractText(html));

      // 4. 翻译
      console.log(`[Translation] Translating ${blocks.length} blocks: ${email.id} → ${targetLang}`);
      const paragraphs = await this.translateParagraphs(blocks, targetLang);

      // 5. 存入缓存（UPSERT）
      const id = uuidv4();
      db.prepare(`
        INSERT INTO translation_cache (id, email_id, target_lang, source_lang, translated_paragraphs, provider)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(email_id, target_lang) DO UPDATE SET
          translated_paragraphs = excluded.translated_paragraphs,
          source_lang = excluded.source_lang,
          provider = excluded.provider,
          created_at = datetime('now')
      `).run(id, email.id, targetLang, sourceLang, JSON.stringify(paragraphs), this.provider);

      return {
        paragraphs,
        source_lang: sourceLang,
        target_lang: targetLang,
        cached: false,
        provider: this.provider,
      };
    } finally {
      db.close();
    }
  }

  // ── 获取缓存 ──

  getCachedTranslation(emailId, targetLang) {
    const db = getDb();
    try {
      const cached = db.prepare(
        'SELECT * FROM translation_cache WHERE email_id = ? AND target_lang = ?'
      ).get(emailId, targetLang);

      if (cached) {
        return {
          paragraphs: JSON.parse(cached.translated_paragraphs),
          source_lang: cached.source_lang,
          target_lang: cached.target_lang,
          cached: true,
          provider: cached.provider,
        };
      }
      return null;
    } finally {
      db.close();
    }
  }

  // ── 删除缓存 ──

  clearCache(emailId, targetLang) {
    const db = getDb();
    try {
      if (targetLang) {
        db.prepare('DELETE FROM translation_cache WHERE email_id = ? AND target_lang = ?').run(emailId, targetLang);
      } else {
        db.prepare('DELETE FROM translation_cache WHERE email_id = ?').run(emailId);
      }
    } finally {
      db.close();
    }
  }
}

export const translationService = new TranslationService();
