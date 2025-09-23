// Function to handle student approval
async function approveStudent(studentId) {
    try {
        const response = await fetch(`/api/admin/approve-student/${studentId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error approving student');
        }
        
        if (typeof showNotification === 'function') {
            showNotification(
                result.emailSent 
                    ? 'Student approved and notification email sent!' 
                    : 'Student approved but email could not be sent',
                result.emailSent ? 'success' : 'info'
            );
        } else {
            alert(result.emailSent ? 'Student approved and email sent.' : 'Student approved, email failed.');
        }
        
        // Refresh the registrations display
        if (typeof loadRegistrations === 'function') loadRegistrations();
        if (typeof loadDashboard === 'function') loadDashboard();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

// Function to display registrations with approve button
function displayRegistrations(registrations) {
    const container = document.getElementById('registrationsContent');
    container.innerHTML = registrations.map(reg => `
        <div class="registration-card ${reg.status}">
            <div class="registration-header">
                <h3>${reg.firstName} ${reg.lastName}</h3>
                <span class="status-badge ${reg.status}">${reg.status}</span>
            </div>
            <div class="registration-details">
                <p><strong>Email:</strong> ${reg.email}</p>
                <p><strong>Phone:</strong> ${reg.phone}</p>
                <p><strong>Program:</strong> ${reg.program}</p>
                <p><strong>Grade:</strong> ${reg.grade}</p>
                <p><strong>Date:</strong> ${new Date(reg.created_at).toLocaleDateString()}</p>
            </div>
            <div class="registration-actions">
                ${reg.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="approveStudent(${reg.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="viewDetails(${reg.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `).join('');
}