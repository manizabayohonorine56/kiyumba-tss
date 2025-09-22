const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'kiyumba_school.db');
const outPath = path.join(__dirname, 'users.json');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    fs.writeFileSync(outPath, JSON.stringify({ error: err.message }, null, 2));
    console.error('DB open error', err.message);
    process.exit(1);
  }

  db.all('SELECT id, username, email, role, created_at FROM users', (err, rows) => {
    if (err) {
      fs.writeFileSync(outPath, JSON.stringify({ error: err.message }, null, 2));
      console.error('Query err', err.message);
      process.exit(1);
    }

    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
    console.log('Wrote', outPath);
    db.close();
  });
});
