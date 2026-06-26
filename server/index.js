import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './models/database.js';
import { syncService } from './services/sync.js';
import { ruleEngine } from './services/rules.js';
import accountsRouter from './routes/accounts.js';
import emailsRouter from './routes/emails.js';
import rulesRouter from './routes/rules.js';
import favoritesRouter from './routes/favorites.js';
import eventsRouter from './routes/events.js';
import aiRouter from './routes/ai.js';
import settingsRouter from './routes/settings.js';
import codesRouter from './routes/codes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// 初始化数据库
initDb();

const app = express();

// 中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/accounts', accountsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api', rulesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', codesRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（生产环境）
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mail Hub Server running on port ${PORT}`);
  
  // 启动邮件同步服务
  if (process.env.DISABLE_SYNC !== 'true') {
    syncService.start();
  }
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  syncService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  syncService.stop();
  process.exit(0);
});
