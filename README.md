# Kiyumba School Management System

A complete school management system with admin panel for managing student registrations and website content.

## Features

### Frontend
- Modern responsive website design
- Student registration form
- Contact form
- User authentication (login)
- Mobile-friendly navigation

### Backend & Admin Panel
- Node.js/Express server
- SQLite database
- Admin dashboard with authentication
- Registration management (approve/reject/delete)
- Contact message management
- Real-time statistics
- Secure API endpoints

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env` file in the root directory:
   ```
   PORT=3000
   JWT_SECRET=your_secret_key_here
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Website: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Default Admin Credentials

- **Email:** admin@kiyumbaschool.edu
- **Password:** admin123

**⚠️ Important:** Change these credentials in production!

## API Endpoints

### Public Endpoints
- `POST /api/register` - Student registration
- `POST /api/contact` - Contact form submission

### Admin Endpoints (Requires Authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/registrations` - Get all registrations
- `PUT /api/admin/registrations/:id` - Update registration status
- `DELETE /api/admin/registrations/:id` - Delete registration
- `GET /api/admin/messages` - Get contact messages
- `PUT /api/admin/messages/:id` - Mark message as read

## Database Schema

### Tables
- **users** - Admin user accounts
- **registrations** - Student registration data
- **contact_messages** - Contact form submissions
- **website_settings** - Website configuration (future use)

## Admin Panel Features

### Dashboard
- Total registrations count
- Pending approvals count
- Approved students count
- Unread messages count

### Registration Management
- View all student registrations
- Filter by status (pending/approved/rejected)
- Approve or reject applications
- Delete registrations
- Pagination support

### Message Management
- View contact form submissions
- Mark messages as read/unread
- Track message status

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Helmet security headers
- Input validation and sanitization

## File Structure

```
kiyumba/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── kiyumba_school.db      # SQLite database (auto-created)
├── index.html             # Main website
├── registration.html      # Student registration page
├── login.html            # User login page
├── admin.html            # Admin dashboard
├── styles.css            # Website styles
├── script.js             # Frontend JavaScript
└── README.md             # This file
```

## Development

### Adding New Features
1. Update database schema in `server.js`
2. Create API endpoints
3. Update admin panel UI
4. Test functionality

### Environment Variables
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## Production Deployment

1. Set environment variables
2. Change default admin credentials
3. Use a production database (PostgreSQL/MySQL)
4. Enable HTTPS
5. Set up proper logging
6. Configure reverse proxy (nginx)

## Support

For technical support or questions, contact the development team.

## License

MIT License - See LICENSE file for details.
