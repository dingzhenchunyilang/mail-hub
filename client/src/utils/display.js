/**
 * 全局共享的显示工具函数
 * 所有页面 import { xxx } from '@/utils/display' 使用
 */

/**
 * 格式化账号显示名
 * 规则：如果 name 和 email 不同 → 显示 name
 *       如果 name 就是 email → 只显示 email（不重复）
 * @param {string} name - 账号备注名
 * @param {string} email - 账号邮箱地址
 * @returns {string}
 */
export function formatAccountName(name, email) {
  if (!name && !email) return '未知';
  if (!name) return email;
  if (!email) return name;
  // name 就是 email → 只显示一次
  if (name.trim().toLowerCase() === email.trim().toLowerCase()) return email;
  return name;
}

/**
 * 格式化账号显示名（带邮箱）
 * 用于 tooltip 等需要完整信息的场景
 * "备注名 (邮箱)" 或 "邮箱"（当 name==email 时）
 */
export function formatAccountFull(name, email) {
  if (!name && !email) return '未知';
  if (!name) return email;
  if (!email) return name;
  if (name.trim().toLowerCase() === email.trim().toLowerCase()) return email;
  return `${name} (${email})`;
}

/**
 * 获取联系人/邮箱首字符头像
 * 优先用 name 的首字符，如果首字符非字母/汉字则用邮件首字符
 * 如果都不可用，返回 null（调用方应显示默认图标）
 * @param {string} name
 * @param {string} email
 * @returns {string|null} 单个大写字母，或 null
 */
export function getAvatarChar(name, email) {
  const source = name || email || '';
  if (!source) return null;
  const char = source[0].toUpperCase();
  // 英文字母或中文字符可用
  if (/[A-Z\u4e00-\u9fff]/.test(char)) return char;
  // 尝试邮箱前缀
  if (email) {
    const emailChar = email[0].toUpperCase();
    if (/[A-Z\u4e00-\u9fff]/.test(emailChar)) return emailChar;
  }
  return null;
}
