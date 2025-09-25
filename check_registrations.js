const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./kiyumba_school.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Query registrations count
db.get('SELECT COUNT(*) as total FROM registrations', (err, row) => {
    if (err) {
        console.error('Error querying database:', err);
        return;
    }

    console.log('Total registrations:', row.total);

    // Also check registration status breakdown
    db.all('SELECT status, COUNT(*) as count FROM registrations GROUP BY status', (err, rows) => {
        if (err) {
            console.error('Error querying registration status:', err);
        } else {
            console.log('Registration status breakdown:');
            rows.forEach(row => {
                console.log(`  ${row.status}: ${row.status}: ${row.count}`);
            });
        }

        db.close();
    });
});
