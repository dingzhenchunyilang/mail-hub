import 'dotenv/config';
import { getDb } from '../models/database.js';
import { aiService } from '../services/ai.js';

const db = getDb();
const emails = db.prepare(`
  SELECT id, subject, from_name, from_address, body_text, preview, received_at
  FROM emails
  WHERE is_deleted = 0
  ORDER BY received_at DESC
`).all();

db.close();

const results = [];
let important = 0;
let normal = 0;
let failed = 0;

for (let i = 0; i < emails.length; i += 1) {
  const email = emails[i];
  try {
    const result = await aiService.classifyEmail(email);
    results.push({ id: email.id, subject: email.subject || '(无主题)', importance: result.importance });
    if (result.importance === 'possible_important') important += 1;
    else normal += 1;
    console.log(`[AI ${i + 1}/${emails.length}] ${result.importance} | ${(email.subject || '(无主题)').slice(0, 80)}`);
  } catch (error) {
    failed += 1;
    console.error(`[AI ${i + 1}/${emails.length}] failed | ${(email.subject || '(无主题)').slice(0, 80)} | ${error.message}`);
  }
}

const writeDb = getDb();
const update = writeDb.prepare('UPDATE emails SET importance = ? WHERE id = ?');
const write = writeDb.transaction((items) => {
  for (const item of items) update.run(item.importance, item.id);
});
write(results);
writeDb.close();

console.log(JSON.stringify({ total: emails.length, written: results.length, important, normal, failed }, null, 2));
console.log('IMPORTANT_SAMPLE');
for (const item of results.filter((item) => item.importance === 'possible_important').slice(0, 12)) {
  console.log(`${item.importance} | ${item.subject}`);
}
