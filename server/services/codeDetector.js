/**
 * 验证码识别引擎 — 纯规则引擎，零AI调用
 * 输入: 邮件主题 + 正文，输出: 是否命中 + 码值 + 置信度 + 命中关键词
 */

// ── 可配置关键词库（中英文覆盖） ──
export const DEFAULT_KEYWORDS = [
  // 中文
  '验证码', '验证代码', '动态密码', '安全码', '校验码', '确认码',
  '短信验证码', '操作验证码', '登录验证码', '身份验证码',
  // 英文
  'verification code', 'verify code', 'verification', 'verify',
  'otp', 'one-time code', 'one-time password', 'one time code',
  'security code', 'confirm code', 'confirmation code',
  'authentication code', 'auth code', 'login code',
  'passcode', 'pin code', 'your code', 'your pin',
];

// 合并后统一小写
let _keywords = DEFAULT_KEYWORDS.map(k => k.toLowerCase());

/**
 * 允许外部追加/替换关键词列表（用于设置页）
 */
export function setKeywords(keywords) {
  _keywords = (keywords || DEFAULT_KEYWORDS).map(k => k.toLowerCase());
}

export function getKeywords() {
  return [..._keywords];
}

/**
 * 清理HTML残留，提取纯文本
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 在文本中查找关键词，返回关键词及其位置
 */
function findKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits = [];
  for (const kw of _keywords) {
    let idx = -1;
    while ((idx = lower.indexOf(kw, idx + 1)) !== -1) {
      hits.push({ keyword: kw, index: idx, length: kw.length });
    }
  }
  // 按位置排序
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

/**
 * 从关键词附近提取验证码
 * 策略：在关键词前后 ~15 字符范围内查找 4-8 位数字或字母数字组合
 */
function extractCode(text, keywordHit) {
  const { index, length } = keywordHit;
  // 搜索窗口：关键词前后各40字符（覆盖 "OTP ... is 3917" 等距离较远的场景）
  const windowSize = 40;
  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + length + windowSize);
  const window = text.substring(start, end);

  // 匹配4-8位数字
  const numPattern = /\b(\d{4,8})\b/g;
  // 匹配4-8位字母数字混合（至少包含字母和数字）
  const alphaNumPattern = /\b([A-Za-z0-9]{4,8})\b/g;

  let match;

  // 优先匹配纯数字（最常见的验证码格式）
  while ((match = numPattern.exec(window)) !== null) {
    const code = match[1];
    // 排除明显不是验证码的长数字（如年份2024之类太短不典型，但4位数字如1234可能误判）
    // 这里我们暂时接受所有4-8位数字，后续由置信度来区分
    return { code, confidence: 'high', type: 'numeric' };
  }

  // 匹配字母数字混合
  const alphaNumMatches = [];
  while ((match = alphaNumPattern.exec(window)) !== null) {
    const code = match[1];
    // 必须同时包含字母和数字才算混合码
    if (/[A-Za-z]/.test(code) && /\d/.test(code)) {
      alphaNumMatches.push(code);
    }
  }

  if (alphaNumMatches.length > 0) {
    return { code: alphaNumMatches[0], confidence: 'high', type: 'alphanumeric' };
  }

  return null;
}

/**
 * 核心检测函数
 * @param {string} subject - 邮件主题
 * @param {string} bodyText - 邮件纯文本正文
 * @param {string} bodyHtml - 邮件HTML正文（可选）
 * @returns {{ hit: boolean, code: string|null, confidence: string|null, keyword: string|null, type: string|null }}
 */
export function detectCode(subject, bodyText, bodyHtml) {
  // 合并文本：主题 + 正文（HTML先清理）
  const cleanBody = stripHtml(bodyHtml || '') || bodyText || '';
  const fullText = [subject || '', cleanBody].filter(Boolean).join('\n');

  if (!fullText.trim()) {
    return { hit: false, code: null, confidence: null, keyword: null, type: null };
  }

  // 查找关键词
  const keywordHits = findKeywords(fullText);
  if (keywordHits.length === 0) {
    return { hit: false, code: null, confidence: null, keyword: null, type: null };
  }

  // 对每个关键词命中尝试提取码值
  for (const kwHit of keywordHits) {
    const result = extractCode(fullText, kwHit);
    if (result) {
      return {
        hit: true,
        code: result.code,
        confidence: result.confidence,
        keyword: kwHit.keyword,
        type: result.type,
      };
    }
  }

  // 有关键词但没找到码值 → 低置信度命中
  return {
    hit: true,
    code: null,
    confidence: 'low',
    keyword: keywordHits[0].keyword,
    type: null,
  };
}
