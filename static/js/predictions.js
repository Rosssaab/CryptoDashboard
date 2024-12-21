// Predictions tab functionality
async function initializePredictions() {
    try {
        console.log('Initializing predictions...');
        
        // Set today's date in the date picker
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];  // Format: YYYY-MM-DD
        const datePicker = document.getElementById('predictionsDateFilter');
        if (datePicker) {
            datePicker.value = dateString;
        }
        
        await updatePredictions();
    } catch (error) {
        console.error('Error initializing predictions:', error);
    }
}

async function updatePredictions() {
    try {
        console.log('Fetching predictions...');
        
        // Show loading indicator
        const container = document.getElementById('predictions-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center my-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-2">Loading predictions data...</div>
                </div>
            `;
        }

        const dateFilter = document.getElementById('predictionsDateFilter')?.value || '';
        const response = await fetch(`/api/predictions?date=${dateFilter}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received predictions:', data);
        displayPredictions(data);
    } catch (error) {
        console.error('Error loading predictions:', error);
        // Show error message if loading fails
        const container = document.getElementById('predictions-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading predictions: ${error.message}
                </div>
            `;
        }
    }
}

function displayPredictions(data) {
    if (!data || !data.predictions) {
        console.error('No prediction data received');
        return;
    }

    console.log('Displaying predictions:', data.predictions.length, 'rows');
    
    let html = `
    <table class="table table-hover predictions-table">
        <thead>
            <tr>
                <th><div class="rotated-header">Prediction Date</div></th>
                <th><div class="rotated-header">Symbol</div></th>
                <th><div class="rotated-header">Price When Predicted</div></th>
                <th><div class="rotated-header">Price Now</div></th>
                <th><div class="rotated-header">Change</div></th>
                <th><div class="rotated-header">Prediction 24h</div></th>
                <th><div class="rotated-header">Actual 24h</div></th>
                <th><div class="rotated-header">Predicted 7d</div></th>
                <th><div class="rotated-header">Actual 7d</div></th>
                <th><div class="rotated-header">Pred 30d</div></th>
                <th><div class="rotated-header">Actual 30d</div></th>
                <th><div class="rotated-header">Pred 90d</div></th>
                <th><div class="rotated-header">Actual 90d</div></th>
                <th><div class="rotated-header">Sentiment</div></th>
                <th><div class="rotated-header">Confidence</div></th>
                <th><div class="rotated-header">Accuracy</div></th>
            </tr>
        </thead>
        <tbody>
    `;

    data.predictions.forEach(p => {
        const date = new Date(p.PredictionDate);
        // Format: hour + day/month (UK format)
        const hour = date.toLocaleTimeString('en-GB', { hour: 'numeric', hour12: true }).toLowerCase();
        const dayMonth = date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit' 
        });
        const formattedDate = `${hour} ${dayMonth}`;
        
        // Calculate percent change
        const priceNow = p['Price Now'];
        const pred24h = p['Prediction 24h'];
        const actual24h = p['Actual 24h'];
        const pred7d = p['Predicted 7d'];
        const actual7d = p['Actual 7d'];
        const pred30d = p['Pred 30d'];
        const actual30d = p['Actual 30d'];
        const pred90d = p['Pred 90d'];
        const actual90d = p['Actual 90d'];
        
        const change = ((priceNow - p['Price When Predicted']) / p['Price When Predicted'] * 100).toFixed(2);
        const changeClass = change >= 0 ? 'text-success' : 'text-danger';
        const changeSymbol = change >= 0 ? '▲' : '▼';
        
        html += `
            <tr>
                <td>${formattedDate}</td>
                <td>${p.Symbol}</td>
                <td>$${p['Price When Predicted'].toFixed(6)}</td>
                <td>$${priceNow.toFixed(6)}</td>
                <td class="${changeClass}">${changeSymbol} ${Math.abs(change)}%</td>
                <td>${pred24h ? `$${pred24h.toFixed(6)}` : 'N/A'}</td>
                <td>${actual24h ? `$${actual24h.toFixed(6)}` : 'N/A'}</td>
                <td>${pred7d ? `$${pred7d.toFixed(6)}` : 'N/A'}</td>
                <td>${actual7d ? `$${actual7d.toFixed(6)}` : 'N/A'}</td>
                <td>${pred30d ? `$${pred30d.toFixed(6)}` : 'N/A'}</td>
                <td>${actual30d ? `$${actual30d.toFixed(6)}` : 'N/A'}</td>
                <td>${pred90d ? `$${pred90d.toFixed(6)}` : 'N/A'}</td>
                <td>${actual90d ? `$${actual90d.toFixed(6)}` : 'N/A'}</td>
                <td>${p.Sentiment || 'N/A'}</td>
                <td>${p.Confidence ? `${(p.Confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                <td>${p.Accuracy ? `${(p.Accuracy * 100).toFixed(1)}%` : 'N/A'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    
    const container = document.getElementById('predictions-container');
    if (container) {
        container.innerHTML = html;
    }
}

// Export functions so they're available to main.js
window.initializePredictions = initializePredictions;
window.updatePredictions = updatePredictions; 