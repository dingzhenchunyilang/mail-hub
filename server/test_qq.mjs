import 'dotenv/config';
import { getDb } from './models/database.js';
import { ImapService } from './services/imap.js';

const db = getDb();
const account = db.prepare("SELECT * FROM accounts WHERE email LIKE '%qq%'").get();
db.close();

if (!account) {
  console.log('No QQ account found');
  process.exit(0);
}

console.log('Testing QQ account:', account.email);
console.log('IMAP host:', account.imap_host, 'port:', account.imap_port);

const imap = new ImapService(account);
imap.fetchRecentEmails(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .then(emails => {
    console.log('Fetched emails:', emails.length);
    emails.forEach(e => console.log('  -', e.subject));
  })
  .catch(err => console.error('Error:', err.message));
