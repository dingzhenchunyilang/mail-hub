// Node.js 18+ has built-in fetch

export class AiService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.apiKey = process.env.AI_API_KEY || '';
    this.baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('AI 未配置，请设置 AI_API_KEY 环境变量');
    }

    const { temperature = 0.7, maxTokens = 4000, timeoutMs = 30000 } = options;

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
        throw new Error(`AI API 错误: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0]?.message;
      // MiMo 等推理模型：content 可能为空，reasoning_content 里有内容
      const result = choice?.content || choice?.reasoning_content || '';
      if (!result && choice?.content === '') {
        console.log('[AI] Warning: empty content, reasoning:', (choice?.reasoning_content || '').substring(0, 100));
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  // 邮件摘要
  async summarizeEmail(email) {
    const prompt = `请用中文简洁地总结以下邮件的核心内容，控制在100字以内：

主题：${email.subject}
发件人：${email.from_name || email.from_address}
时间：${email.received_at}

内容：
${email.body_text || email.preview || '（无正文）'}

要求：
1. 提炼关键信息
2. 如果有行动要求，明确指出
3. 简洁明了`;

    return this.chat([{ role: 'user', content: prompt }]);
  }

  // AI 帮写回复草稿
  async draftReply(email, tone = 'formal') {
    const toneMap = {
      formal: '正式、专业、礼貌',
      brief: '简短、直接、高效',
      friendly: '友好、亲切、轻松',
    };

    const prompt = `请帮我写一封回复邮件。

原始邮件：
主题：${email.subject}
发件人：${email.from_name || email.from_address}
内容：${email.body_text || email.preview || ''}

要求：
- 语调：${toneMap[tone] || toneMap.formal}
- 用中文回复
- 直接给出回复正文，不需要额外说明`;

    return this.chat([{ role: 'user', content: prompt }]);
  }

  // 润色邮件
  async polishEmail(text, tone = 'formal') {
    const toneMap = {
      formal: '正式、专业、礼貌',
      brief: '简短、直接、高效',
      friendly: '友好、亲切、轻松',
    };

    const prompt = `请帮我润色以下邮件内容，保持原意但优化表达：

原文：
${text}

要求：
- 语调：${toneMap[tone] || toneMap.formal}
- 用中文
- 直接给出润色后的正文`;

    return this.chat([{ role: 'user', content: prompt }]);
  }

  // 总结邮件线程
  async summarizeThread(emails) {
    const thread = emails.map((e, i) => 
      `[${i + 1}] ${e.from_name || e.from_address} (${e.received_at})：${e.body_text || e.preview || ''}`
    ).join('\n\n---\n\n');

    const prompt = `请用对话形式总结以下邮件往来脉络，提取关键信息和决策：

${thread}

要求：
1. 按时间顺序梳理对话脉络
2. 用"对话摘要"格式，每条用 A:xxx / B:xxx 形式
3. 提取关键决策点和待办事项
4. 如果对话中提到了具体时间安排（如"周五下午3点开会"），请单独列出`;

    return this.chat([{ role: 'user', content: prompt }]);
  }

  // 从对话中提取日程建议
  async extractEvents(text) {
    const truncated = (text || '').substring(0, 1500);
    if (!truncated) return [];

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const prompt = `你是日程提取助手。从下面的文本中找出所有日程/约会/待办事项。

当前日期：${today}

文本：
${truncated}

规则：
- "明天"指 ${today} 的下一天
- "五点"指 17:00（下午），"三点"指 15:00
- "后天"、"下周三" 等都要转成具体日期
- 如果有明确的时间安排就提取，没有就返回空数组

返回 JSON 数组，不要其他文字：
[{"title":"简短标题","start_time":"ISO8601时间","end_time":null,"notes":""}]

示例：
文本"明天下午3点开会" → [{"title":"开会","start_time":"2025-01-16T15:00:00","end_time":null,"notes":""}]
文本"你好" → []`;

    const result = await this.chat([{ role: 'user', content: prompt }], { temperature: 0.1, maxTokens: 2000, timeoutMs: 60000 });
    
    try {
      console.log('[AI] extractEvents raw response:', result.substring(0, 200));
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI] extractEvents parsed:', JSON.stringify(parsed));
        return parsed;
      }
      console.log('[AI] extractEvents: no JSON array found in response');
      return [];
    } catch (e) {
      console.error('[AI] extractEvents JSON parse error:', e.message);
      return [];
    }
  }
}

export const aiService = new AiService();
