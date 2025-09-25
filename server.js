const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kiyumba_school_secret_key_2024';

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-specific-password'
    }
});

// SSE clients (admin dashboards listening for new registrations)
const sseClients = [];

function broadcastNewRegistration(registration) {
    const payload = JSON.stringify({ type: 'registration', registration });
    sseClients.forEach(res => {
        try {
            res.write(`data: ${payload}\n\n`);
        } catch (e) {
            // ignore
        }
    });
}

// Email sending function
async function sendApprovalEmail(studentEmail, firstName, lastName) {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: studentEmail,
        subject: 'Kiyumba School - Registration Approved',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Kiyumba School Registration</h2>
                <p>Dear ${firstName} ${lastName},</p>
                <p>We are pleased to inform you that your registration at Kiyumba School has been approved.</p>
                <p>You can now proceed with the next steps in the enrollment process. Our administration team will contact you shortly with further details.</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 5px;">
                    <p style="margin: 0; color: #1e293b;">Next Steps:</p>
                    <ul>
                        <li>Complete your medical forms</li>
                        <li>Submit required documents</li>
                        <li>Pay registration fees</li>
                    </ul>
                </div>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>Kiyumba School Administration</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Approval email sent to:', studentEmail);
        return true;
    } catch (error) {
        console.error('Error sending approval email:', error);
        return false;
    }
}

// Database path - prefer explicit DB_FILE env var for persistence. If not set,
// use file DB locally and in-memory on Vercel (serverless) to avoid accidental
// writes to ephemeral filesystems. To persist data in production, set DB_FILE
// to a writable path on your host or use an external managed database.
const DB_PATH = process.env.DB_FILE || (process.env.VERCEL ? ':memory:' : './kiyumba_school.db');
console.log(`Using database at: ${DB_PATH}`);
if (DB_PATH === ':memory:') {
    console.warn('Warning: SQLite is running in-memory. Data will NOT persist across restarts. Set DB_FILE env var or use a managed DB for persistence.');
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for development
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Only use WAL in development; in Vercel we use in-memory DB
        if (!process.env.VERCEL) {
            db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;", (pragmaErr) => {
                if (pragmaErr) {
                    console.error('Failed to set PRAGMA:', pragmaErr);
                } else {
                    console.log('SQLite PRAGMA set: journal_mode=WAL, synchronous=NORMAL');
                }
                initializeDatabase();
            });
        } else {
            initializeDatabase();
        }
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table (for admin authentication)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Registrations table
    db.run(`CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        dateOfBirth DATE NOT NULL,
        gender TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        program TEXT NOT NULL,
        grade TEXT NOT NULL,
        parentName TEXT,
        parentPhone TEXT,
        previousSchool TEXT,
        medicalInfo TEXT,
        newsletter BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Contact messages table
    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // SMS messages table
    db.run(`CREATE TABLE IF NOT EXISTS sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Student Reports table
    db.run(`CREATE TABLE IF NOT EXISTS student_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        report_type TEXT NOT NULL,
        term TEXT NOT NULL,
        year INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES registrations(id)
    )`);

    // Approved Files table
    db.run(`CREATE TABLE IF NOT EXISTS approved_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        approval_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
    )`);

    // Website settings table
    db.run(`CREATE TABLE IF NOT EXISTS website_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user
    createDefaultAdmin();
}

// Start background worker after DB initialization
startQueueWorker();

// Admin endpoint to view queue length and preview jobs
app.get('/api/admin/queue', authenticateToken, (req, res) => {
    const preview = registrationQueue.slice(0, 50).map(job => ({ id: job.id, receivedAt: job.receivedAt, email: job.data.email }));
    res.json({ queueLength: registrationQueue.length, preview });
});

// SSE endpoint for admin dashboards to receive live events (must provide Bearer token)
app.get('/events', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).end('Unauthorized');

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).end('Forbidden');

        // Setup SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        // Add to clients
        sseClients.push(res);

        // Remove client on close
        req.on('close', () => {
            const idx = sseClients.indexOf(res);
            if (idx !== -1) sseClients.splice(idx, 1);
        });
    });
});

// Approve student registration
app.post('/api/admin/approve-student/:id', authenticateToken, async (req, res) => {
    const studentId = req.params.id;
    
    db.get('SELECT firstName, lastName, email, status FROM registrations WHERE id = ?', 
        [studentId], 
        async (err, student) => {
            if (err) {
                console.error('Error fetching student:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }
            
            if (student.status === 'approved') {
                return res.status(400).json({ error: 'Student is already approved' });
            }
            
            // Update student status to approved
            db.run('UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['approved', studentId],
                async (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating student status:', updateErr);
                        return res.status(500).json({ error: 'Error updating student status' });
                    }
                    
                    // Send approval email
                    const emailSent = await sendApprovalEmail(
                        student.email,
                        student.firstName,
                        student.lastName
                    );
                    
                    res.json({ 
                        message: 'Student approved successfully',
                        emailSent: emailSent
                    });
                    
                    // Update statistics
                    updateRegistrationStats();
                }
            );
        }
    );
});

// Admin endpoint to view recent insert metrics
app.get('/api/admin/metrics', authenticateToken, (req, res) => {
    // Return last N metrics, default 50
    const count = Math.min(parseInt(req.query.count || '50'), MAX_METRICS);
    res.json({ metrics: insertMetrics.slice(0, count) });
});

// Get student reports count for dashboard
app.get('/api/admin/reports/count', authenticateToken, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM student_reports', [], (err, row) => {
        if (err) {
            console.error('Error counting reports:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ count: row.count });
    });
});

// Upload student report
app.post('/api/admin/upload-report', authenticateToken, (req, res) => {
    const { student_id, term, year, type } = req.body;
    const reportFile = req.files ? req.files.report : null;

    if (!reportFile) {
        return res.status(400).json({ error: 'No report file provided' });
    }

    const uploadPath = path.join(__dirname, 'uploads', 'reports', reportFile.name);
    reportFile.mv(uploadPath, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(500).json({ error: 'Error uploading file' });
        }

        const relativePath = path.join('uploads', 'reports', reportFile.name);
        
        db.run(`INSERT INTO student_reports (student_id, term, year, report_type, file_path, uploaded_by) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [student_id, term, year, type, relativePath, req.user.email],
            function(err) {
                if (err) {
                    console.error('Error saving report record:', err);
                    return res.status(500).json({ error: 'Error saving report' });
                }
                res.json({ 
                    message: 'Report uploaded successfully',
                    id: this.lastID,
                    path: relativePath
                });
            });
    });
});

// Get student reports
app.get('/api/admin/student-reports', authenticateToken, (req, res) => {
    const { term, year, status } = req.query;
    let query = `
        SELECT r.firstName, r.lastName, sr.*
        FROM student_reports sr
        JOIN registrations r ON sr.student_id = r.id
        WHERE 1=1
    `;
    const params = [];

    if (term) {
        query += ` AND sr.term = ?`;
        params.push(term);
    }
    if (year) {
        query += ` AND sr.year = ?`;
            // Broadcast to SSE admin clients about the new registration
            try {
                const inserted = Object.assign({}, job.data, { id: this.lastID, created_at: new Date().toISOString(), status: 'pending' });
                broadcastNewRegistration(inserted);
            } catch (e) {}
            res.json({ message: 'Registration received', registrationId: this.lastID, insertDurationMs: duration });
    }
    if (status) {
        query += ` AND sr.status = ?`;
        params.push(status);
    }

    query += ` ORDER BY sr.created_at DESC`;

    db.all(query, params, (err, reports) => {
        if (err) {
            console.error('Error fetching student reports:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ reports });
    });
});

// Get approved files
app.get('/api/admin/approved-files', authenticateToken, (req, res) => {
    const { type, status } = req.query;
    let query = `SELECT * FROM approved_files WHERE 1=1`;
    const params = [];

    if (type) {
        query += ` AND file_type = ?`;
        params.push(type);
    }
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY approval_date DESC`;

    db.all(query, params, (err, files) => {
        if (err) {
            console.error('Error fetching approved files:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ files });
    });
});

// In-memory queue and metrics for async registration processing
const registrationQueue = [];
let queueCounter = 0;
const insertMetrics = []; // { jobId, email, durationMs, insertedAt, error }
const MAX_METRICS = 200;

// Background worker to process registration queue
function startQueueWorker() {
    // Process one job at a time every 150ms (tunable)
    setInterval(() => {
        if (registrationQueue.length === 0) return;

        const job = registrationQueue.shift();
        // Perform DB insert similar to previous logic
        const stmt = db.prepare(`INSERT INTO registrations (
            firstName, lastName, dateOfBirth, gender, email, phone, address,
            program, grade, parentName, parentPhone, previousSchool, medicalInfo, newsletter
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        const params = [job.data.firstName, job.data.lastName, job.data.dateOfBirth, job.data.gender,
            job.data.email, job.data.phone, job.data.address, job.data.program, job.data.grade,
            job.data.parentName, job.data.parentPhone, job.data.previousSchool, job.data.medicalInfo,
            job.data.newsletter ? 1 : 0];

        const start = Date.now();
        stmt.run(params, function(err) {
            const duration = Date.now() - start;
            const metric = {
                jobId: job.id,
                email: job.data.email,
                durationMs: duration,
                insertedAt: new Date().toISOString(),
                error: err ? err.message : null,
                registrationId: err ? null : this.lastID
            };

            // Keep metrics bounded
            insertMetrics.unshift(metric);
            if (insertMetrics.length > MAX_METRICS) insertMetrics.pop();

            if (err) {
                console.error('Async registration insert error for job', job.id, err);
            } else {
                console.log(`[/queue-worker] job=${job.id} inserted id=${this.lastID} duration=${duration}ms`);
                try {
                    const inserted = Object.assign({}, job.data, { id: this.lastID, created_at: new Date().toISOString(), status: 'pending' });
                    broadcastNewRegistration(inserted);
                } catch (e) {}
            }

            try { stmt.finalize(); } catch (e) {}
        });
    }, 150);
}

// Create default admin user
function createDefaultAdmin() {
    const defaultPassword = 'admin123';
    bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return;
        }
        
        db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
                VALUES (?, ?, ?, ?)`, 
                ['admin', 'admin@kiyumbaschool.edu', hash, 'admin'], 
                function(err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    } else if (this.changes > 0) {
                        console.log('Default admin user created: admin@kiyumbaschool.edu / admin123');
                    }
                });
    });
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Routes

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Authentication error' });
            }

            if (!result) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        });
    });
});

// Student registration
app.post('/api/register', (req, res) => {
    const {
        firstName, lastName, dateOfBirth, gender, email, phone, address,
        program, grade, parentName, parentPhone, previousSchool, medicalInfo, newsletter
    } = req.body;

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !gender || !email || !phone || !address || !program || !grade) {
        return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Enqueue the registration for asynchronous processing so we can return immediately
    const jobId = ++queueCounter;
    const job = {
        id: jobId,
        receivedAt: new Date().toISOString(),
        data: { firstName, lastName, dateOfBirth, gender, email, phone, address, program, grade, parentName, parentPhone, previousSchool, medicalInfo, newsletter }
    };

    // Quick uniqueness check in DB to avoid obvious duplicates (non-blocking)
    db.get('SELECT id FROM registrations WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error('Email uniqueness check error:', err);
            // Still enqueue — worker will handle DB errors
        }

        if (row) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Attempt immediate insert so the admin dashboard sees new registrations right away.
        const stmt = db.prepare(`INSERT INTO registrations (
            firstName, lastName, dateOfBirth, gender, email, phone, address,
            program, grade, parentName, parentPhone, previousSchool, medicalInfo, newsletter, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);

        const paramsInsert = [firstName, lastName, dateOfBirth, gender, email, phone, address,
            program, grade, parentName, parentPhone, previousSchool, medicalInfo, newsletter ? 1 : 0];

        const insertStart = Date.now();
        stmt.run(paramsInsert, function(err) {
            const duration = Date.now() - insertStart;
            const metric = {
                jobId: jobId,
                email: email,
                durationMs: duration,
                insertedAt: new Date().toISOString(),
                error: err ? err.message : null,
                registrationId: err ? null : this.lastID
            };

            insertMetrics.unshift(metric);
            if (insertMetrics.length > MAX_METRICS) insertMetrics.pop();

            try { stmt.finalize(); } catch (e) {}

            if (err) {
                console.error('Immediate registration insert error:', err);
                // Fallback: enqueue for async processing so the submission isn't lost
                registrationQueue.push(job);
                return res.json({ message: 'Registration received and queued for processing', jobId: jobId, queuePosition: registrationQueue.length });
            }

            res.json({ message: 'Registration received', registrationId: this.lastID, insertDurationMs: duration });
        });
    });
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        const stmt = db.prepare(`
            INSERT INTO contact_messages (name, email, phone, message, status, created_at)
            VALUES (?, ?, ?, ?, 'unread', datetime('now'))
        `);
        
        stmt.run([name, email, phone || null, message], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save message' });
            }
            
            res.json({ 
                success: true, 
                message: 'Message sent successfully',
                id: this.lastID 
            });
        });
        
        stmt.finalize();
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SMS sending endpoint
app.post('/api/send-sms', async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        
        if (!name || !phone || !message) {
            return res.status(400).json({ error: 'Name, phone, and message are required' });
        }

        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Store SMS request in database
        const stmt = db.prepare(`
            INSERT INTO sms_messages (name, phone, message, status, created_at)
            VALUES (?, ?, ?, 'pending', datetime('now'))
        `);
        
        stmt.run([name, phone, message], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save SMS request' });
            }
            
            // In a real implementation, you would integrate with SMS providers like:
            // - Twilio: https://www.twilio.com/
            // - Africa's Talking: https://africastalking.com/
            // - Vonage (Nexmo): https://www.vonage.com/
            
            // For now, we'll simulate SMS sending
            console.log(`SMS would be sent to ${phone}: ${message}`);
            
            res.json({ 
                success: true, 
                message: 'SMS request received and will be processed',
                id: this.lastID 
            });
        });
        
        stmt.finalize();
    } catch (error) {
        console.error('SMS error:', error);
        res.status(500).json({ error: 'Failed to process SMS request' });
    }
});

// Admin routes (protected)

// Get all registrations
app.get('/api/admin/registrations', authenticateToken, (req, res) => {
    const { status, program, page = 1, limit = 10 } = req.query;
    let query = 'SELECT * FROM registrations WHERE 1=1';
    let params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (program) {
        query += ' AND program = ?';
        params.push(program);
    }

    // If limit is 0, return all matching rows (no LIMIT/OFFSET)
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, (parseInt(page) - 1) * limitNum);
    } else {
        query += ' ORDER BY created_at DESC';
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM registrations WHERE 1=1';
        let countParams = [];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (program) {
            countQuery += ' AND program = ?';
            countParams.push(program);
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const total = countResult.total || 0;
            const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;
            res.json({
                registrations: rows,
                total: total,
                page: limitNum > 0 ? parseInt(page) : 1,
                totalPages: totalPages
            });
        });
    });
});

// Update registration status
app.put('/api/admin/registrations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run('UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Update failed' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        res.json({ message: 'Registration updated successfully' });
    });
});

// Delete registration
app.delete('/api/admin/registrations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM registrations WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Delete failed' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        res.json({ message: 'Registration deleted successfully' });
    });
});

// Get contact messages
app.get('/api/admin/messages', authenticateToken, (req, res) => {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    let query = 'SELECT * FROM contact_messages';
    let params = [];

    if (status !== 'all') {
        query += ' WHERE status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ messages: rows });
    });
});

// Mark message as read
app.put('/api/admin/messages/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE contact_messages SET status = ? WHERE id = ?',
    [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Update failed' });
        }

        res.json({ message: 'Message updated successfully' });
    });
});

// Student reports endpoint
app.get('/api/admin/reports', authenticateToken, (req, res) => {
    const { 
        status, 
        program, 
        grade, 
        startDate, 
        endDate, 
        format = 'json',
        page = 1, 
        limit = 50 
    } = req.query;

    let query = `SELECT 
        id, firstName, lastName, dateOfBirth, gender, email, phone, address,
        program, grade, parentName, parentPhone, previousSchool, medicalInfo,
        newsletter, status, created_at, updated_at
        FROM registrations WHERE 1=1`;
    let params = [];

    // Apply filters
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (program) {
        query += ' AND program = ?';
        params.push(program);
    }

    if (grade) {
        query += ' AND grade = ?';
        params.push(grade);
    }

    if (startDate) {
        query += ' AND DATE(created_at) >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND DATE(created_at) <= ?';
        params.push(endDate);
    }

    // Add ordering and pagination for JSON format
    if (format === 'json') {
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    } else {
        query += ' ORDER BY created_at DESC';
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (format === 'csv') {
            // Generate CSV
            const csv = generateCSV(rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="student_report.csv"');
            res.send(csv);
        } else {
            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM registrations WHERE 1=1';
            let countParams = [];

            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }
            if (program) {
                countQuery += ' AND program = ?';
                countParams.push(program);
            }
            if (grade) {
                countQuery += ' AND grade = ?';
                countParams.push(grade);
            }
            if (startDate) {
                countQuery += ' AND DATE(created_at) >= ?';
                countParams.push(startDate);
            }
            if (endDate) {
                countQuery += ' AND DATE(created_at) <= ?';
                countParams.push(endDate);
            }

            db.get(countQuery, countParams, (err, countResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    students: rows,
                    total: countResult.total,
                    page: parseInt(page),
                    totalPages: Math.ceil(countResult.total / parseInt(limit)),
                    filters: { status, program, grade, startDate, endDate }
                });
            });
        }
    });
});

// Helper function to generate CSV
function generateCSV(data) {
    if (data.length === 0) return '';
    
    const headers = [
        'ID', 'First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone',
        'Address', 'Program', 'Grade', 'Parent Name', 'Parent Phone', 'Previous School',
        'Medical Info', 'Newsletter', 'Status', 'Registration Date', 'Last Updated'
    ];
    
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
        const values = [
            row.id,
            `"${row.firstName}"`,
            `"${row.lastName}"`,
            row.dateOfBirth,
            row.gender,
            row.email,
            row.phone,
            `"${row.address}"`,
            row.program,
            row.grade,
            `"${row.parentName || ''}"`,
            row.parentPhone || '',
            `"${row.previousSchool || ''}"`,
            `"${row.medicalInfo || ''}"`,
            row.newsletter ? 'Yes' : 'No',
            row.status,
            new Date(row.created_at).toLocaleDateString(),
            new Date(row.updated_at).toLocaleDateString()
        ];
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// Dashboard statistics
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    const stats = {};

    // Get registration counts by status
    db.all(`SELECT status, COUNT(*) as count FROM registrations GROUP BY status`, (err, registrationStats) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        stats.registrations = registrationStats.reduce((acc, stat) => {
            acc[stat.status] = stat.count;
            return acc;
        }, {});

        // Get total registrations
        db.get('SELECT COUNT(*) as total FROM registrations', (err, totalReg) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            stats.totalRegistrations = totalReg.total;

            // Get unread messages count
            db.get('SELECT COUNT(*) as count FROM contact_messages WHERE status = "unread"', (err, unreadMsg) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                stats.unreadMessages = unreadMsg.count;

                // Get registrations by program
                db.all(`SELECT program, COUNT(*) as count FROM registrations GROUP BY program`, (err, programStats) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    stats.programDistribution = programStats;
                    res.json(stats);
                });
            });
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Settings endpoints
app.get('/api/admin/settings', authenticateToken, (req, res) => {
    db.all('SELECT * FROM website_settings', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = JSON.parse(row.setting_value);
        });
        
        res.json(settings);
    });
});

app.put('/api/admin/settings', authenticateToken, (req, res) => {
    const settings = req.body;
    
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO website_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, datetime('now'))
    `);
    
    try {
        Object.entries(settings).forEach(([key, value]) => {
            stmt.run([key, JSON.stringify(value)]);
        });
        
        stmt.finalize();
        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Backup endpoint
app.post('/api/admin/backup', authenticateToken, (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const dbPath = './kiyumba_school.db';
        const backupName = `kiyumba_backup_${new Date().toISOString().split('T')[0]}.db`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${backupName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        const readStream = fs.createReadStream(dbPath);
        readStream.pipe(res);
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Export data endpoint
app.get('/api/admin/export', authenticateToken, (req, res) => {
    const exportData = {};
    
    // Export all tables
    const tables = ['registrations', 'contact_messages', 'sms_messages', 'website_settings'];
    let completed = 0;
    
    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, (err, rows) => {
            if (err) {
                console.error(`Export error for ${table}:`, err);
            } else {
                exportData[table] = rows;
            }
            
            completed++;
            if (completed === tables.length) {
                const exportName = `kiyumba_data_export_${new Date().toISOString().split('T')[0]}.json`;
                
                res.setHeader('Content-Disposition', `attachment; filename="${exportName}"`);
                res.setHeader('Content-Type', 'application/json');
                res.json(exportData);
            }
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`Website: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
