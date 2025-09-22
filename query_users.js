const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'kiyumba_school.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }

  db.all('SELECT id, username, email, role, created_at FROM users', (err, rows) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }

    console.log(JSON.stringify(rows, null, 2));
    db.close();
  });
});
