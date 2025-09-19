const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Connect to the database
const db = new sqlite3.Database('./kiyumba_school.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
        checkAndCreateAdmin();
    }
});

function checkAndCreateAdmin() {
    // First, check if admin user exists
    db.get('SELECT * FROM users WHERE email = ?', ['admin@kiyumbaschool.edu'], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            process.exit(1);
        }

        if (user) {
            console.log('✅ Admin user already exists:');
            console.log('   Email: admin@kiyumbaschool.edu');
            console.log('   Password: admin123');
            console.log('   User ID:', user.id);
            console.log('   Role:', user.role);
            console.log('\n🌐 Access admin panel at: http://localhost:3000/admin');
        } else {
            console.log('❌ Admin user not found. Creating admin user...');
            createAdmin();
        }
    });
}

function createAdmin() {
    const defaultPassword = 'admin123';
    
    bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            process.exit(1);
        }
        
        db.run(`INSERT INTO users (username, email, password, role) 
                VALUES (?, ?, ?, ?)`, 
                ['admin', 'admin@kiyumbaschool.edu', hash, 'admin'], 
                function(err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                        process.exit(1);
                    } else {
                        console.log('✅ Admin user created successfully!');
                        console.log('   Email: admin@kiyumbaschool.edu');
                        console.log('   Password: admin123');
                        console.log('   User ID:', this.lastID);
                        console.log('\n🌐 Access admin panel at: http://localhost:3000/admin');
                        console.log('\n⚠️  Remember to change the default password in production!');
                    }
                    
                    // Close database connection
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                        }
                        process.exit(0);
                    });
                });
    });
}
