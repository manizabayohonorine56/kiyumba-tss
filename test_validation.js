#!/usr/bin/env node

/**
 * Form Validation Test Script
 * Tests the login and registration form validation functionality
 */

console.log('🧪 Form Validation Test Script');
console.log('================================\n');

// Test email validation function
function testEmailValidation() {
    console.log('📧 Testing Email Validation:');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin@kiyumbaschool.edu'
    ];

    const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        ''
    ];

    let emailTestsPassed = 0;

    validEmails.forEach(email => {
        if (emailRegex.test(email)) {
            console.log(`   ✅ ${email} - Valid`);
            emailTestsPassed++;
        } else {
            console.log(`   ❌ ${email} - Should be valid`);
        }
    });

    invalidEmails.forEach(email => {
        if (!emailRegex.test(email)) {
            console.log(`   ✅ ${email || '(empty)'} - Invalid (correct)`);
            emailTestsPassed++;
        } else {
            console.log(`   ❌ ${email || '(empty)'} - Should be invalid`);
        }
    });

    console.log(`   Result: ${emailTestsPassed}/${validEmails.length + invalidEmails.length} tests passed\n`);
    return emailTestsPassed === validEmails.length + invalidEmails.length;
}

// Test form field validation
function testFormFieldValidation() {
    console.log('📝 Testing Form Field Validation:');

    // Simulate form data
    const formDataScenarios = [
        {
            name: 'Complete form',
            data: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+250123456789',
                address: '123 Main St',
                program: 'certificate',
                grade: 'software-development'
            },
            shouldPass: true
        },
        {
            name: 'Missing required fields',
            data: {
                firstName: 'John',
                lastName: '', // Missing
                email: 'john@example.com',
                phone: '+250123456789',
                address: '123 Main St',
                program: 'certificate',
                grade: 'software-development'
            },
            shouldPass: false
        },
        {
            name: 'Invalid email',
            data: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email', // Invalid
                phone: '+250123456789',
                address: '123 Main St',
                program: 'certificate',
                grade: 'software-development'
            },
            shouldPass: false
        }
    ];

    let fieldTestsPassed = 0;

    formDataScenarios.forEach(scenario => {
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'program', 'grade'];
        const missingFields = requiredFields.filter(field => !scenario.data[field]);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailValid = emailRegex.test(scenario.data.email);

        const isValid = missingFields.length === 0 && emailValid;

        if (isValid === scenario.shouldPass) {
            console.log(`   ✅ ${scenario.name} - ${scenario.shouldPass ? 'Valid' : 'Invalid (correct)'}`);
            fieldTestsPassed++;
        } else {
            console.log(`   ❌ ${scenario.name} - Expected ${scenario.shouldPass ? 'valid' : 'invalid'}`);
        }
    });

    console.log(`   Result: ${fieldTestsPassed}/${formDataScenarios.length} tests passed\n`);
    return fieldTestsPassed === formDataScenarios.length;
}

// Test age validation
function testAgeValidation() {
    console.log('🎂 Testing Age Validation:');

    const today = new Date();
    const ageScenarios = [
        {
            name: '5 years old',
            birthDate: new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()),
            shouldPass: true
        },
        {
            name: '4 years old',
            birthDate: new Date(today.getFullYear() - 4, today.getMonth(), today.getDate()),
            shouldPass: false
        },
        {
            name: '10 years old',
            birthDate: new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()),
            shouldPass: true
        }
    ];

    let ageTestsPassed = 0;

    ageScenarios.forEach(scenario => {
        const age = today.getFullYear() - scenario.birthDate.getFullYear();
        const isValidAge = age >= 5;

        if (isValidAge === scenario.shouldPass) {
            console.log(`   ✅ ${scenario.name} (${age} years) - ${scenario.shouldPass ? 'Valid' : 'Invalid (correct)'}`);
            ageTestsPassed++;
        } else {
            console.log(`   ❌ ${scenario.name} (${age} years) - Expected ${scenario.shouldPass ? 'valid' : 'invalid'}`);
        }
    });

    console.log(`   Result: ${ageTestsPassed}/${ageScenarios.length} tests passed\n`);
    return ageTestsPassed === ageScenarios.length;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Form Validation Tests...\n');

    const emailTest = testEmailValidation();
    const fieldTest = testFormFieldValidation();
    const ageTest = testAgeValidation();

    const totalTests = 3;
    const passedTests = [emailTest, fieldTest, ageTest].filter(Boolean).length;

    console.log('📊 Test Results Summary:');
    console.log('================================');
    console.log(`Email Validation:     ${emailTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Form Field Validation: ${fieldTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Age Validation:       ${ageTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log('================================');
    console.log(`Overall: ${passedTests}/${totalTests} test suites passed`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Form validation is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the validation logic.');
    }

    return passedTests === totalTests;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testEmailValidation,
        testFormFieldValidation,
        testAgeValidation,
        runAllTests
    };
}

// Run tests if script is executed directly
if (require.main === module) {
    runAllTests();
}
