const http = require('http');

function testAdminLogin() {
    console.log('Testing admin login...');
    
    const postData = JSON.stringify({
        email: 'admin@kiyumbaschool.edu',
        password: 'admin123'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log('Response status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log('Response data:', jsonData);
                
                if (res.statusCode === 200) {
                    console.log('✅ Login successful!');
                    console.log('Token:', jsonData.token ? 'Generated' : 'Missing');
                    console.log('User:', jsonData.user);
                } else {
                    console.log('❌ Login failed:', jsonData.error);
                }
            } catch (error) {
                console.log('❌ Invalid JSON response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Network error:', error.message);
    });

    req.write(postData);
    req.end();
}

testAdminLogin();
