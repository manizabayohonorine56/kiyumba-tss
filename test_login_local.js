const http = require('http');
const fs = require('fs');

const data = JSON.stringify({ email: 'admin@kiyumbaschool.edu', password: 'admin123' });

const opts = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(opts, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    const out = { statusCode: res.statusCode, headers: res.headers, body };
    fs.writeFileSync('login_response.json', JSON.stringify(out, null, 2));
    console.log('WROTE login_response.json');
    process.exit(0);
  });
});

req.on('error', (e) => {
  fs.writeFileSync('login_response.json', JSON.stringify({ error: e.message }, null, 2));
  console.error('REQERR', e.message);
  process.exit(1);
});

req.write(data);
req.end();
