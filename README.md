# Mail Hub

自托管邮箱聚合管理客户端。支持多账号 IMAP 收件、SMTP 发送、规则引擎、验证码识别、AI 辅助等功能。

## 功能概览

- **多账号收发** — IMAP/SMTP，支持 QQ 邮箱、163、Gmail 等
- **规则引擎** — 自动分类、打标签、归档
- **验证码识别** — 纯规则引擎检测验证码邮件，SSE 实时推送
- **AI 辅助** — 邮件摘要、智能回复、日程提取（可选）
- **日程管理** — 手动 + AI 提取日程事件
- **深色模式** — 跟随系统或手动切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Tailwind CSS |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 邮件 | IMAP (node-imap) + SMTP (nodemailer) |
| 实时推送 | Server-Sent Events |

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/YOUR_USERNAME/mail-hub.git
cd mail-hub

# 2. 安装依赖
cd server && npm install
cd ../client && npm install

# 3. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填入加密密钥和邮箱账号信息
# ENCRYPTION_KEY 可用: openssl rand -hex 32

# 4. 构建前端
cd client && npm run build

# 5. 启动
cd ../server && node index.js
# 访问 http://localhost:3000
```

## 目录结构

```
mail-hub/
├── client/             # Vue 3 前端
│   ├── src/
│   │   ├── api/        # API 客户端
│   │   ├── assets/     # CSS (设计系统)
│   │   ├── components/ # 通用组件
│   │   ├── composables/ # Vue composables
│   │   ├── router/
│   │   ├── utils/
│   │   └── views/      # 页面组件
│   └── tailwind.config.js
├── server/             # Express 后端
│   ├── models/         # 数据库模型
│   ├── routes/         # API 路由
│   ├── services/       # 业务逻辑
│   └── utils/          # 工具函数
└── .gitignore
```

## 环境变量

参见 `server/.env.example`，必填项：

| 变量 | 说明 |
|------|------|
| `ENCRYPTION_KEY` | 加密密钥，用于 AES-256-GCM 加密邮箱密码 |
| `DB_PATH` | 数据库路径，默认 `./data/mail-hub.db` |
| `SYNC_INTERVAL` | 同步间隔，默认 `*/5 * * * *`（5分钟） |

## License

MIT
