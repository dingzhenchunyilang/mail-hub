/**
 * 验证码识别引擎 — 单元测试
 * 运行: node --test server/test/codeDetector.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectCode, setKeywords, getKeywords, DEFAULT_KEYWORDS } from '../services/codeDetector.js';

describe('codeDetector', () => {

  // ── 中文验证码邮件 ──

  it('中文: "您的验证码是 836251，请在5分钟内使用"', () => {
    const result = detectCode(
      '【某公司】安全验证',
      '尊敬的用户，您的验证码是 836251，请在5分钟内使用。如非本人操作，请忽略此短信。'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '836251');
    assert.equal(result.confidence, 'high');
    assert.ok(result.keyword.includes('验证码'));
  });

  it('中文: "验证码：4523"（中文冒号分隔）', () => {
    const result = detectCode(
      '',
      '您的登录验证码：4523，10分钟内有效。'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '4523');
    assert.equal(result.confidence, 'high');
  });

  it('中文: "动态密码 729481"（另一个关键词）', () => {
    const result = detectCode(
      '',
      '您的动态密码 729481，请勿泄露给他人。'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '729481');
    assert.equal(result.confidence, 'high');
    assert.ok(result.keyword.includes('动态密码'));
  });

  // ── 英文验证码邮件 ──

  it('英文: "Your verification code is 582903"', () => {
    const result = detectCode(
      'Verify your account',
      'Hello, your verification code is 582903. It expires in 10 minutes.'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '582903');
    assert.equal(result.confidence, 'high');
    assert.ok(result.keyword.includes('verification code'));
  });

  it('英文: "Your OTP is 3917"', () => {
    const result = detectCode(
      '',
      'Use the following OTP to complete your login: 3917. Do not share this code.'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '3917');
    assert.equal(result.confidence, 'high');
    assert.ok(result.keyword.includes('otp'));
  });

  it('英文: "Your one-time code: 882461"', () => {
    const result = detectCode(
      'Sign in to your account',
      'Enter this one-time code: 882461 to verify your identity.'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '882461');
  });

  // ── 字母数字混合 ──

  it('字母数字混合: "security code AB3K9F"', () => {
    const result = detectCode(
      '',
      'Your security code AB3K9F is valid for 5 minutes.'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, 'AB3K9F');
    assert.equal(result.type, 'alphanumeric');
  });

  it('字母数字混合: "验证码 X7M2P4"', () => {
    const result = detectCode(
      '',
      '您的验证码 X7M2P4 即将过期。'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, 'X7M2P4');
    assert.equal(result.type, 'alphanumeric');
  });

  // ── 无验证码邮件（不误判） ──

  it('不含关键词的普通邮件 → 不命中', () => {
    const result = detectCode(
      '周末聚餐通知',
      '大家好，周六晚上7点在xx餐厅聚餐，不见不散！'
    );
    assert.equal(result.hit, false);
    assert.equal(result.code, null);
  });

  it('纯数字但无关键词 → 不命中（避免误抓手机号/订单号）', () => {
    const result = detectCode(
      '订单已发货',
      '您的订单 2024061578901234 已发货，快递单号 SF1234567890。'
    );
    assert.equal(result.hit, false);
  });

  it('含关键词但附近无数字 → 低置信度命中', () => {
    const result = detectCode(
      '',
      '请使用验证码完成身份验证。如有问题请联系客服。'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, null);
    assert.equal(result.confidence, 'low');
  });

  // ── HTML正文处理 ──

  it('HTML正文中的验证码能正确提取', () => {
    const result = detectCode(
      '',
      null,
      '<div style="font-size:20px">您的验证码是：<b>665522</b>，请勿泄露。</div>'
    );
    assert.equal(result.hit, true);
    assert.equal(result.code, '665522');
    assert.equal(result.confidence, 'high');
  });

  // ── 边界情况 ──

  it('空输入 → 不命中', () => {
    const result = detectCode('', '', '');
    assert.equal(result.hit, false);
  });

  it('null输入 → 不命中', () => {
    const result = detectCode(null, null, null);
    assert.equal(result.hit, false);
  });

  // ── 关键词可配置 ──

  it('自定义关键词后能识别新关键词', () => {
    setKeywords(['安全口令', ...DEFAULT_KEYWORDS]);
    const kws = getKeywords();
    assert.ok(kws.includes('安全口令'));

    const result = detectCode('', '您的安全口令是 998877。');
    assert.equal(result.hit, true);
    assert.equal(result.code, '998877');

    // 恢复默认
    setKeywords(DEFAULT_KEYWORDS);
  });
});
