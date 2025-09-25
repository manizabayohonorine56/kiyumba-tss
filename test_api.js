const fetch = require('node-fetch');

async function testAPI() {
    try {
        // Test login
        console.log('Testing login...');
        const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@kiyumbaschool.edu',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login response status:', loginResponse.status);
        console.log('Login data:', JSON.stringify(loginData, null, 2));

        if (loginResponse.ok) {
            const token = loginData.token;
            console.log('\nTesting stats endpoint with token...');

            // Test stats endpoint
            const statsResponse = await fetch('http://localhost:3000/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const statsData = await statsResponse.json();
            console.log('Stats response status:', statsResponse.status);
            console.log('Stats data:', JSON.stringify(statsData, null, 2));

            // Test registrations endpoint
            console.log('\nTesting registrations endpoint...');
            const registrationsResponse = await fetch('http://localhost:3000/api/admin/registrations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const registrationsData = await registrationsResponse.json();
            console.log('Registrations response status:', registrationsResponse.status);
            console.log('Registrations data:', JSON.stringify(registrationsData, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();
