import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const dataDirectory = path.join(projectDirectory, 'data');
const databasePath = path.join(dataDirectory, 'shenzun.sqlite');
const backupDirectory = path.join(dataDirectory, 'backups');

if (!fs.existsSync(databasePath)) {
  console.error('No database found. Start the app once with `npm run dev`, then stop it before clearing stories.');
  process.exitCode = 1;
} else {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(databasePath));

  try {
    const storyCount = db.exec('SELECT COUNT(*) FROM stories')[0]?.values[0]?.[0];
    if (typeof storyCount !== 'number') throw new Error('Could not read story count from the database.');

    if (storyCount === 0) {
      console.log('There are no stories to clear. Settings, media, and other database data were left untouched.');
    } else {
      fs.mkdirSync(backupDirectory, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDirectory, `shenzun-before-clear-stories-${timestamp}.sqlite`);
      fs.copyFileSync(databasePath, backupPath);

      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM stories');
      db.run('COMMIT');

      const tempPath = `${databasePath}.${process.pid}.tmp`;
      fs.writeFileSync(tempPath, Buffer.from(db.export()));
      fs.renameSync(tempPath, databasePath);

      const remaining = db.exec('SELECT COUNT(*) FROM stories')[0]?.values[0]?.[0];
      if (remaining !== 0) throw new Error('Story deletion did not complete. Restore from the backup if needed.');
      console.log(`Cleared ${storyCount} stories. Settings, media records, and uploaded files were preserved. Backup: ${backupPath}`);
    }
  } catch (error) {
    try { db.run('ROLLBACK'); } catch {}
    console.error(error instanceof Error ? error.message : 'Failed to clear stories.');
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
