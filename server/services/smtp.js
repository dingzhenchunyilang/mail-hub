import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';

export class SmtpService {
  constructor(account) {
    this.account = account;
  }

  getTransporter() {
    return nodemailer.createTransport({
      host: this.account.smtp_host,
      port: this.account.smtp_port,
      secure: this.account.smtp_secure === 1,
      auth: {
        user: this.account.username,
        pass: decrypt(this.account.password_encrypted),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(options) {
    const { to, subject, text, html, replyTo, inReplyTo } = options;
    
    const transporter = this.getTransporter();
    
    const mailOptions = {
      from: `"${this.account.name}" <${this.account.email}>`,
      to,
      subject,
      text,
      html: html || text,
      replyTo,
      inReplyTo,
    };

    // 添加签名
    if (this.account.signature) {
      mailOptions.html = (mailOptions.html || '') + 
        `<br><br><div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;">${this.account.signature}</div>`;
      mailOptions.text = (mailOptions.text || '') + 
        `\n\n---\n${this.account.signature.replace(/<[^>]*>/g, '')}`;
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  }
}

// 测试 SMTP 连接
export async function testSmtpConnection(accountData) {
  const transporter = nodemailer.createTransport({
    host: accountData.smtp_host,
    port: accountData.smtp_port,
    secure: accountData.smtp_secure === 1,
    auth: {
      user: accountData.username,
      pass: accountData.password || decrypt(accountData.password_encrypted),
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
  });

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP 连接测试成功' };
  } catch (error) {
    return { success: false, message: `连接失败: ${error.message}` };
  }
}
