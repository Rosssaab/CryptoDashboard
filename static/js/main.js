// Utility function for date/time formatting
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Tab handling
function openTab(evt, tabName) {
    var tabcontent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    var tablinks = document.getElementsByClassName("nav-link");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");

    switch(tabName) {
        case 'Mentions':
            updateMentionsCharts();
            break;
        case 'Price':
            updatePriceChart();
            break;
        case 'Sentiment':
            updateSentimentChart();
            break;
        case 'Predictions':
            initializePredictions();
            break;
        case 'DataLoads':
            updateDataLoads();
            break;
    }
}

async function initializePredictions() {
    try {
        // Fetch coins for dropdown
        const response = await fetch('/api/coin_names');
        const coins = await response.json();
        
        // Populate coin select
        const coinSelect = document.getElementById('predictionsCoinSelect');
        coinSelect.innerHTML = '<option value="all">All Coins</option>';
        
        Object.entries(coins).forEach(([symbol, name]) => {
            const option = new Option(`${symbol} - ${name}`, symbol);
            coinSelect.add(option);
        });

        // Add event listeners
        coinSelect.addEventListener('change', updatePredictions);
        document.getElementById('predictionsDateFilter').addEventListener('change', updatePredictions);
        
        // Initial load
        updatePredictions();
    } catch (error) {
        console.error('Error initializing predictions:', error);
    }
}

async function updatePredictions() {
    try {
        const selectedCoin = document.getElementById('predictionsCoinSelect').value || 'all';
        const selectedDate = document.getElementById('predictionsDateFilter').value;
        const predictionsContainer = document.getElementById('predictionsContainer');

        let url = `/api/predictions/${selectedCoin}`;
        if (selectedDate) {
            url += `?filter_date=${selectedDate}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data || !data.predictions) {
            throw new Error('Invalid data received');
        }

        // Create table HTML
        let html = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Symbol</th>
                        <th>Current Price</th>
                        <th colspan="4">Predictions</th>
                        <th colspan="4">Actual Prices</th>
                        <th>Sentiment</th>
                        <th>Confidence</th>
                        <th>Accuracy</th>
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th>24h</th>
                        <th>7d</th>
                        <th>30d</th>
                        <th>90d</th>
                        <th>24h</th>
                        <th>7d</th>
                        <th>30d</th>
                        <th>90d</th>
                        <th></th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.predictions.forEach(p => {
            html += `
                <tr>
                    <td>${formatDateTime(p.prediction_date)}</td>
                    <td>${p.symbol}</td>
                    <td>${p.current_price?.toFixed(6) || 'N/A'}</td>
                    <td>${p.prediction_24h?.toFixed(6) || 'N/A'}</td>
                    <td>${p.prediction_7d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.prediction_30d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.prediction_90d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.actual_price_24h?.toFixed(6) || 'N/A'}</td>
                    <td>${p.actual_price_7d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.actual_price_30d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.actual_price_90d?.toFixed(6) || 'N/A'}</td>
                    <td>${p.market_conditions || 'N/A'}</td>
                    <td>${p.confidence_score?.toFixed(1) || 'N/A'}%</td>
                    <td>${p.accuracy_score?.toFixed(1) || 'N/A'}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        predictionsContainer.innerHTML = html;

    } catch (error) {
        console.error('Error loading predictions:', error);
        document.getElementById('predictionsContainer').innerHTML = 
            '<div class="alert alert-danger">Error loading predictions</div>';
    }
}

// Add this function at the beginning of your file
async function initializeSelects() {
    try {
        // Fetch coins for all dropdowns
        const response = await fetch('/api/coin_names');
        const coins = await response.json();
        
        // Populate coin selects
        const selects = [
            'coinSelect',           // Price tab
            'sentimentCoinSelect',  // Sentiment tab
            'loadCoinSelect'        // Data Loads tab
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = ''; // Clear existing options
                Object.entries(coins).forEach(([symbol, name]) => {
                    const option = new Option(`${symbol} - ${name}`, symbol);
                    select.add(option);
                });
            }
        });

        // Initial chart updates
        if (document.getElementById('coinSelect').value) {
            updatePriceChart();
        }
        if (document.getElementById('sentimentCoinSelect').value) {
            updateSentimentChart();
        }
        
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
        if (!coin) return; // Don't make the API call if no coin is selected
        
        const response = await fetch(`/api/sentiment/${coin}`);
        const data = await response.json();

        const chart = echarts.init(document.getElementById('sentiment-chart'));
        
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
            xAxis: {
                type: 'category',
                data: data.dates
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
        
        chart.setOption(option);
    } catch (error) {
        console.error('Error updating sentiment chart:', error);
        const chartContainer = document.getElementById('sentiment-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="alert alert-danger">Error loading sentiment data</div>';
        }
    }
}

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