// Utility function for date/time formatting
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Tab handling
async function openTab(evt, tabName) {
    try {
        // Hide all content
        const tabcontent = document.getElementsByClassName("tabcontent");
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Remove active class from tabs
        const tablinks = document.getElementsByClassName("tablinks");
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        // Show current tab and mark it active
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";

        // Initialize data based on tab
        if (tabName === 'DataLoads') {
            // Show loading spinner
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'block';
            
            try {
                await updateDataLoads();
            } finally {
                // Hide spinner regardless of success/failure
                if (spinner) spinner.style.display = 'none';
            }
        } else if (tabName === 'Predictions') {
            await initializePredictions();
        } else if (tabName === 'Sentiment') {
            await initializeSentiment();
        } else if (tabName === 'Mentions') {
            await updateMentionsCharts();
        } else if (tabName === 'Price') {
            await updatePriceChart();
        }
    } catch (error) {
        console.error('Error in openTab:', error);
    }
}

// Initialize predictions
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

// Update predictions
async function updatePredictions() {
    try {
        console.log('Fetching predictions...');
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
    }
}

// Display predictions
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
        let changePercent = 'N/A';
        
        if (priceNow && pred24h && priceNow !== 0) {
            const change = ((pred24h - priceNow) / priceNow) * 100;
            const color = change >= 0 ? 'text-success' : 'text-danger';
            changePercent = `<span class="${color}">${change.toFixed(2)}%</span>`;
        }
        
        // Debug the data structure
        console.log('Row data structure:', p);
        
        html += `
            <tr>
                <td>${formattedDate}</td>
                <td>${p.Symbol}</td>
                <td>${p['Price When Predicted']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Price Now']?.toFixed(6) || 'N/A'}</td>
                <td>${changePercent}</td>
                <td>${p['Prediction 24h']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Actual 24h']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Predicted 7d']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Actual 7d']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Pred 30d']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Actual 30d']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Pred 90d']?.toFixed(6) || 'N/A'}</td>
                <td>${p['Actual 90d']?.toFixed(6) || 'N/A'}</td>
                <td>${p.Sentiment || 'N/A'}</td>
                <td>${p.Confidence?.toFixed(1) || 'N/A'}%</td>
                <td>${p.Accuracy?.toFixed(1) || 'N/A'}%</td>
            </tr>
        `;
    });

    html += `
        </tbody>
    </table>
    `;

    document.getElementById('predictions-content').innerHTML = html;
}

// Make sure the Predictions tab is opened by default when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Find the first tab button
    const firstTab = document.querySelector('.nav-link.btn-primary');
    if (firstTab) {
        firstTab.click();
    } else {
        console.warn('No tab buttons found on page load');
    }
});

// Add this function to fetch and populate chat sources
async function initializeChatSources() {
    try {
        const response = await fetch('/api/chat_sources');
        const sources = await response.json();
        
        const sourceSelect = document.getElementById('chatSourceSelect');
        if (sourceSelect) {
            sourceSelect.innerHTML = '<option value="all">All Sources</option>';
            sources.forEach(source => {
                const option = new Option(source, source);
                sourceSelect.add(option);
            });
        }
    } catch (error) {
        console.error('Error initializing chat sources:', error);
    }
}

// Update the initializeSelects function
async function initializeSelects() {
    try {
        // Fetch coins for dropdowns
        const response = await fetch('/api/coin_names');
        const coins = await response.json();
        
        // Populate coin selects
        const selects = [
            'sentimentCoinSelect',
            'loadCoinSelect'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="all">All Coins</option>';
                Object.entries(coins).forEach(([symbol, name]) => {
                    const option = new Option(`${symbol} - ${name}`, symbol);
                    select.add(option);
                });
            }
        });

        // Initialize chat sources
        await initializeChatSources();
    } catch (error) {
        console.error('Error initializing selects:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('Mentions').style.display = "block";
    const mentionsButton = document.querySelector('button[onclick="openTab(event, \'Mentions\')"]');
    if (mentionsButton) {
        mentionsButton.classList.add('active');
    }
    updateMentionsCharts();
    initializeSelects();
});

async function updateMentionsCharts() {
    try {
        const timeRange = document.getElementById('timeRange').value;
        const sortBy = document.getElementById('sortBy').value;
        
        const response = await fetch(`/api/mentions_chart?timerange=${timeRange}&sort_by=${sortBy}`);
        const data = await response.json();
        
        if (!data || !data.coins) {
            throw new Error('Invalid data received');
        }

        const container = document.getElementById('mentions-charts');
        container.innerHTML = ''; // Clear existing charts

        data.coins.forEach(coin => {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            container.appendChild(chartDiv);

            const chart = echarts.init(chartDiv);
            
            const option = {
                title: {
                    text: coin.symbol,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item'
                },
                series: [{
                    type: 'pie',
                    radius: '50%',
                    data: [
                        { value: coin.sentiment_distribution.Positive, name: 'Positive' },
                        { value: coin.sentiment_distribution.Neutral, name: 'Neutral' },
                        { value: coin.sentiment_distribution.Negative, name: 'Negative' }
                    ],
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };
            
            chart.setOption(option);
        });
    } catch (error) {
        console.error('Error updating mentions charts:', error);
    }
}

async function updatePriceChart() {
    try {
        const coin = document.getElementById('coinSelect').value;
        if (!coin) return; // Don't make the API call if no coin is selected
        
        const timeRange = document.getElementById('priceTimeRange').value;
        const response = await fetch(`/api/price/${coin}?timerange=${timeRange}`);
        const data = await response.json();

        const chart = echarts.init(document.getElementById('price-chart'));
        
        const option = {
            title: {
                text: `${coin} Price Chart`,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'category',
                data: data.timestamps
            },
            yAxis: {
                type: 'value',
                name: 'Price'
            },
            series: [{
                name: 'Price',
                type: 'line',
                data: data.prices,
                smooth: true
            }]
        };
        
        chart.setOption(option);
    } catch (error) {
        console.error('Error updating price chart:', error);
        const chartContainer = document.getElementById('price-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="alert alert-danger">Error loading price data</div>';
        }
    }
}

async function updateSentimentChart() {
    try {
        const coin = document.getElementById('sentimentCoinSelect').value;
        if (!coin) return;
        
        console.log('Fetching sentiment data for:', coin); // Debug log
        const response = await fetch(`/api/sentiment/${coin}`);
        const data = await response.json();
        
        console.log('Received sentiment data:', data); // Debug log
        
        // Make sure we have a chart container
        const chartContainer = document.getElementById('sentiment-chart');
        if (!chartContainer) {
            console.error('Chart container not found');
            return;
        }
        
        // Initialize or get existing chart
        let chart = echarts.getInstanceByDom(chartContainer);
        if (!chart) {
            chart = echarts.init(chartContainer);
        }
        
        // Verify we have the required data
        if (!data.dates || !data.sentiment_data || !data.colors) {
            console.error('Invalid data structure:', data);
            chartContainer.innerHTML = '<div class="alert alert-danger">Invalid data format received</div>';
            return;
        }
        
        const option = {
            title: {
                text: `${coin} Sentiment Analysis`,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                data: Object.keys(data.sentiment_data),
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.dates,
                axisLabel: {
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Count'
            },
            series: Object.entries(data.sentiment_data).map(([name, values]) => ({
                name: name,
                type: 'bar',
                stack: 'total',
                data: values,
                itemStyle: {
                    color: data.colors[name]
                }
            }))
        };
        
        console.log('Chart options:', option); // Debug log
        chart.setOption(option, true);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            chart.resize();
        });
        
    } catch (error) {
        console.error('Error updating sentiment chart:', error);
        const chartContainer = document.getElementById('sentiment-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="alert alert-danger">Error loading sentiment data</div>';
        }
    }
}

// Make sure the chart updates when the tab is opened
document.addEventListener('DOMContentLoaded', () => {
    const sentimentTab = document.querySelector('[data-tab="Sentiment"]');
    if (sentimentTab) {
        sentimentTab.addEventListener('click', () => {
            setTimeout(updateSentimentChart, 100); // Small delay to ensure container is visible
        });
    }
});

async function updateDataLoads() {
    try {
        // Show loading spinner
        document.getElementById('loadingSpinner').style.display = 'block';
        
        const hours = document.getElementById('loadHoursSelect').value;
        const source = document.getElementById('chatSourceSelect').value;
        const coin = document.getElementById('loadCoinSelect').value;
        
        const response = await fetch(`/api/data_loads?hours=${hours}&source=${source}&coin=${coin}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update stats table
        let tableHtml = '';
        data.stats.forEach(stat => {
            tableHtml += `
                <tr>
                    <td>${stat.source}</td>
                    <td>${stat.symbol}</td>
                    <td>${stat.count}</td>
                </tr>
            `;
        });
        document.getElementById('dataLoadStats').innerHTML = tableHtml;
        
        // Update summary stats
        const totalRecords = data.stats.reduce((sum, stat) => sum + stat.count, 0);
        const avgSentiment = data.stats.reduce((sum, stat) => sum + (stat.sentiment * stat.count), 0) / totalRecords;
        
        document.getElementById('totalRecordsValue').textContent = totalRecords;
        document.getElementById('averageSentimentValue').textContent = avgSentiment.toFixed(3);
        
        // Populate source dropdown if needed
        const sourceSelect = document.getElementById('chatSourceSelect');
        if (sourceSelect.options.length <= 1) {  // Only has "All Sources" option
            data.sources.forEach(source => {
                sourceSelect.add(new Option(source.name, source.id));
            });
        }
        
        // Populate coin dropdown if needed
        const coinSelect = document.getElementById('loadCoinSelect');
        if (coinSelect.options.length <= 1) {  // Only has "All Coins" option
            data.coins.forEach(coin => {
                coinSelect.add(new Option(coin, coin));
            });
        }
        
    } catch (error) {
        console.error('Error updating data loads:', error);
        document.getElementById('dataLoadStats').innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    Error loading data: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        // Hide loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

// Add event listeners for the filter controls
document.getElementById('timeRange')?.addEventListener('change', updateMentionsCharts);
document.getElementById('sortBy')?.addEventListener('change', updateMentionsCharts);
document.getElementById('coinSelect')?.addEventListener('change', updatePriceChart);
document.getElementById('priceTimeRange')?.addEventListener('change', updatePriceChart);
document.getElementById('sentimentCoinSelect')?.addEventListener('change', updateSentimentChart);
document.getElementById('loadHoursSelect')?.addEventListener('change', updateDataLoads);
document.getElementById('chatSourceSelect')?.addEventListener('change', updateDataLoads);
document.getElementById('loadCoinSelect')?.addEventListener('change', updateDataLoads);
document.getElementById('predictionsDateFilter')?.addEventListener('change', updatePredictions);

// When populating the price tab's coin selector
fetch('/api/coins?tab=price')
  .then(response => response.json())
  .then(coins => {
    const coinSelect = document.getElementById('coinSelect');
    coins.forEach(coin => {
      const option = document.createElement('option');
      option.value = coin;
      option.textContent = coin;
      coinSelect.appendChild(option);
    });
  });

// When populating the sentiment tab's coin selector
fetch('/api/coins?tab=sentiment')
  .then(response => response.json())
  .then(coins => {
    const sentimentCoinSelect = document.getElementById('sentimentCoinSelect');
    coins.forEach(coin => {
      const option = document.createElement('option');
      option.value = coin;
      option.textContent = coin;
      sentimentCoinSelect.appendChild(option);
    });
  });

// Add event listener for the predictions date filter
document.getElementById('predictionsDateFilter')?.addEventListener('change', async () => {
    await updatePredictions();
});