import 'dotenv/config';
import { initDb } from '../models/database.js';

console.log('DB_PATH:', process.env.DB_PATH);
console.log('Initializing database...');
initDb();
console.log('Done!');
