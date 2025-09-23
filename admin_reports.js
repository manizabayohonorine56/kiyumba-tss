// Functions for handling student reports and approved files
function loadStudentReports() {
    const term = document.getElementById('termFilter').value;
    const year = document.getElementById('yearFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    fetch(`/api/admin/student-reports?term=${term}&year=${year}&status=${status}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById('studentReportsContent');
        container.innerHTML = data.reports.map(report => `
            <div class="report-card">
                <h3>${report.firstName} ${report.lastName}</h3>
                <p>Term: ${report.term} | Year: ${report.year}</p>
                <p>Type: ${report.report_type}</p>
                <p>Status: ${report.status}</p>
                <p>Uploaded by: ${report.uploaded_by}</p>
                <a href="${report.file_path}" class="btn btn-primary" target="_blank">
                    <i class="fas fa-download"></i> View Report
                </a>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error loading reports:', error);
        showNotification('Error loading student reports', 'error');
    });
}

function loadApprovedFiles() {
    const type = document.getElementById('fileTypeFilter').value;
    const status = document.getElementById('fileStatusFilter').value;
    
    fetch(`/api/admin/approved-files?type=${type}&status=${status}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById('approvedFilesContent');
        container.innerHTML = data.files.map(file => `
            <div class="file-card">
                <i class="file-icon fas fa-${getFileIcon(file.file_type)}"></i>
                <h3>${file.file_name}</h3>
                <p>Type: ${file.file_type}</p>
                <p>Approved by: ${file.approved_by}</p>
                <p>Date: ${new Date(file.approval_date).toLocaleDateString()}</p>
                <a href="${file.file_path}" class="btn btn-primary" target="_blank">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error loading files:', error);
        showNotification('Error loading approved files', 'error');
    });
}

function uploadReport() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('report', file);
        formData.append('student_id', document.getElementById('studentSelect').value);
        formData.append('term', document.getElementById('termSelect').value);
        formData.append('year', document.getElementById('yearSelect').value);
        formData.append('type', 'academic');
        
        try {
            const response = await fetch('/api/admin/upload-report', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const result = await response.json();
            if (response.ok) {
                showNotification('Report uploaded successfully', 'success');
                loadStudentReports();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error uploading report:', error);
            showNotification(error.message || 'Error uploading report', 'error');
        }
    };
    
    input.click();
}

function getFileIcon(fileType) {
    switch(fileType.toLowerCase()) {
        case 'report': return 'file-alt';
        case 'document': return 'file-word';
        case 'image': return 'file-image';
        default: return 'file';
    }
}

// Add event listeners when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add filter change listeners
    document.querySelectorAll('#termFilter, #yearFilter, #statusFilter').forEach(filter => {
        filter.addEventListener('change', loadStudentReports);
    });

    document.querySelectorAll('#fileTypeFilter, #fileStatusFilter').forEach(filter => {
        filter.addEventListener('change', loadApprovedFiles);
    });
});