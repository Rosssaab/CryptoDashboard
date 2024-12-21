// Data Loads tab functionality
async function updateDataLoads() {
    try {
        // Show loading indicator
        const statsElement = document.getElementById('dataLoadStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="mt-2">Loading data loads...</div>
                    </td>
                </tr>
            `;
        }

        const hours = document.getElementById('loadHoursSelect').value;
        const source = document.getElementById('chatSourceSelect').value;
        const coin = document.getElementById('loadCoinSelect').value;
        
        console.log('Fetching data loads...', { hours, source, coin });
        
        const response = await fetch(`/api/data_loads?hours=${hours}&source=${source}&coin=${coin}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data loads:', data);
        
        let html = '';
        let totalRecords = 0;
        
        if (Array.isArray(data)) {
            data.forEach(row => {
                if (row.LoadDate) {
                    const date = new Date(row.LoadDate);
                    const hour = date.toLocaleTimeString('en-GB', { 
                        hour: 'numeric', 
                        hour12: true 
                    }).toLowerCase();
                    const dayMonth = date.toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit' 
                    });
                    const formattedDate = `${hour} ${dayMonth}`;
                    
                    html += `
                        <tr>
                            <td>${formattedDate}</td>
                            <td>${row.ChatSource || 'N/A'}</td>
                            <td>${row.Symbol || 'N/A'}</td>
                            <td>${row.RecordsLoaded || 0}</td>
                        </tr>
                    `;
                    totalRecords += row.RecordsLoaded || 0;
                }
            });
        }
        
        if (statsElement) {
            statsElement.innerHTML = html || `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="alert alert-info m-3">
                            No data loads found for the selected criteria
                        </div>
                    </td>
                </tr>
            `;
        }
        
        const totalElement = document.getElementById('totalRecordsValue');
        if (totalElement) {
            totalElement.textContent = totalRecords;
        }
        
    } catch (error) {
        console.error('Error updating data loads:', error);
        const statsElement = document.getElementById('dataLoadStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="alert alert-danger m-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error loading data: ${error.message}
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Export the function so it's available to main.js
window.updateDataLoads = updateDataLoads; 