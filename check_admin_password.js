const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./kiyumba_school.db', (err) => {
  if (err) return console.error('DB open error:', err);
});

db.get('SELECT * FROM users WHERE email = ?', ['admin@kiyumbaschool.edu'], (err, user) => {
  if (err) {
    console.error('Query error:', err);
    process.exit(1);
  }

  if (!user) {
    console.log('No admin user found');
    process.exit(0);
  }

  console.log('Found user:', { id: user.id, username: user.username, email: user.email, role: user.role, created_at: user.created_at });
  console.log('Stored password hash (truncated):', user.password ? user.password.substring(0, 30) + '...' : '(none)');

  bcrypt.compare('admin123', user.password, (err, res) => {
    if (err) {
      console.error('bcrypt error:', err);
      process.exit(1);
    }

    console.log("Does 'admin123' match the hash?", res);
    process.exit(0);
  });
});
