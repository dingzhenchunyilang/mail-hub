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

  parseMailClassification(result) {
    const fallback = { importance: 'normal', is_ad: false };
    try {
      const match = String(result || '').match(/\{[\s\S]*\}/);
      if (!match) return fallback;
      const parsed = JSON.parse(match[0]);
      return {
        importance: parsed.importance === 'possible_important' ? 'possible_important' : 'normal',
        is_ad: parsed.is_ad === true,
      };
    } catch {
      return fallback;
    }
  }

  async classifyEmail(email) {
    const prompt = `你是邮件分拣器。请严格只返回一个 JSON 对象，不要解释、不要 Markdown：
{"importance":"normal|possible_important","is_ad":true|false}

【重要性判定】
将邮件判为 possible_important，只要它可能需要用户在近期查看、回复、确认、付款、提交材料或按截止日期行动，尤其包括：
- 银行、支付、账户、安全、登录、OTP、验证码、异常登录、文件上传或身份验证
- 交易成交、订单确认、退款、账单、财务变动
- 航班、酒店、旅行订单、行程、值机、出行提醒
- 学校/工作中的课程注册、项目分配、成绩、申请、录取、截止日期、会议或明确活动安排
- 私人联系人直接发来的邮件、明确回复或待办事项
普通 newsletter、社交平台摘要、一般资讯、纯宣传活动和无行动要求的通知判为 normal；normal 是默认类别。闲聊、问候和无明确行动的个人邮件也判为 normal。
只要存在明确行动要求、明确截止日期或行动要求，优先判为 possible_important，不要因为发件人是 noreply 而降级；不要仅因发件人是官方地址或正文出现某个关键词就提高重要性。

【广告判定】
is_ad=true 的情况包括：商品/服务促销、优惠券、折扣、返现、限时活动、商业推荐、酒店/购物营销、交易平台拉新或活动、招聘/职业推广、课程推广、newsletter/订阅资讯，即使发件人是学校或平台官方地址也要按内容判断。
is_ad=false 的情况包括：一次性订单确认、航班/酒店已预订确认、银行账单/交易通知、安全通知、验证码/OTP、学校行政通知、个人邮件。广告和重要可以同时成立；不要把 is_ad 当作 importance 的反面。

发件人：${email.from_name || ''} <${email.from_address || ''}>
主题：${email.subject || ''}
正文：${(email.body_text || email.preview || '').slice(0, 5000)}`;
    const result = await this.chat([{ role: 'user', content: prompt }], { temperature: 0.1, maxTokens: 120, timeoutMs: 30000 });
    return this.parseMailClassification(result);
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
