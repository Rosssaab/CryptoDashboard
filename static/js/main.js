// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // First verify that all required elements exist
    const requiredElements = {
        coinSelect: document.getElementById('coinSelect'),
        sentimentCoinSelect: document.getElementById('sentimentCoinSelect'),
        priceChart: document.getElementById('price-chart'),
        sentimentChart: document.getElementById('sentiment-chart')
    };

    // Log missing elements
    Object.entries(requiredElements).forEach(([name, element]) => {
        if (!element) {
            console.error(`Required element not found: ${name}`);
        }
    });

    // Only proceed if all required elements exist
    if (Object.values(requiredElements).every(element => element)) {
        // Initialize the application
        initializeApp();
    } else {
        console.error('Cannot initialize application: missing required elements');
    }
});

// Application initialization function
async function initializeApp() {
    try {
        // Set default tab
        const defaultTab = document.querySelector('[onclick="openTab(event, \'Mentions\')"]');
        if (defaultTab) {
            openTab({ target: defaultTab }, 'Mentions');
        }

        // Load coins first
        const response = await fetch('/api/coins');
        const coins = await response.json();

        if (!coins || !coins.length) {
            throw new Error('No coins data received');
        }

        // Initialize selectors
        const priceSelect = document.getElementById('coinSelect');
        const sentimentSelect = document.getElementById('sentimentCoinSelect');

        // Populate selectors
        [priceSelect, sentimentSelect].forEach(select => {
            if (select) {
                select.innerHTML = ''; // Clear existing options
                coins.forEach(coin => {
                    const option = new Option(coin, coin);
                    select.add(option);
                });
                if (coins.length > 0) {
                    select.value = coins[0];
                }
            }
        });

        // Update charts
        await Promise.all([
            updatePriceChart(),
            updateSentimentChart(),
            updateCharts(),
            updateDistribution()
        ]);

    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Tab switching function
function openTab(evt, tabName) {
    // Hide all tab content
    const tabcontent = document.getElementsByClassName("tabcontent");
    Array.from(tabcontent).forEach(tab => tab.style.display = "none");

    // Remove active class from all tab buttons
    const tablinks = document.querySelectorAll(".navbar-nav .btn-primary");
    tablinks.forEach(link => link.classList.remove("active"));

    // Show the selected tab and mark its button as active
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.style.display = "block";
    }

    if (evt.target) {
        evt.target.classList.add("active");
    }
}

// Update price chart with null checks
async function updatePriceChart() {
    const coinSelect = document.getElementById('coinSelect');
    const timeRange = document.getElementById('priceTimeRange');

    if (!coinSelect || !timeRange || !coinSelect.value) {
        console.error('Required elements for price chart not found or initialized');
        return;
    }

    try {
        const response = await fetch(`/api/price/${coinSelect.value}?timerange=${timeRange.value}`);
        const data = await response.json();

        if (!data || !data.timestamps || !data.prices) {
            console.error('Invalid price data received');
            return;
        }

        const trace = {
            x: data.timestamps,
            y: data.prices,
            type: 'scatter',
            name: 'Price'
        };

        const layout = {
            title: `${coinSelect.value} Price Chart`,
            xaxis: { title: 'Time' },
            yaxis: { title: 'Price (USD)' }
        };

        const chartDiv = document.getElementById('price-chart');
        if (chartDiv) {
            Plotly.newPlot('price-chart', [trace], layout);
        }
    } catch (error) {
        console.error('Error updating price chart:', error);
    }
}

// Update sentiment chart with null checks
async function updateSentimentChart() {
    const coinSelect = document.getElementById('sentimentCoinSelect');
    if (!coinSelect || !coinSelect.value) {
        console.error('Sentiment coin select not found or not initialized');
        return;
    }

    try {
        const response = await fetch(`/api/sentiment_charts/${coinSelect.value}`);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return;
        }

        const chartDiv = document.getElementById('sentiment-chart');
        if (!chartDiv) {
            console.error('Sentiment chart container not found');
            return;
        }

        const traces = [];
        if (data.sentiment_data && Object.keys(data.sentiment_data).length > 0) {
            Object.entries(data.sentiment_data).forEach(([sentiment, values]) => {
                traces.push({
                    x: data.dates,
                    y: values,
                    type: 'scatter',
                    name: sentiment,
                    line: { color: data.colors[sentiment] }
                });
            });

            const layout = {
                title: `${coinSelect.value} Sentiment Over Time`,
                xaxis: { title: 'Date' },
                yaxis: { title: 'Count' }
            };

            Plotly.newPlot(chartDiv, traces, layout);
        } else {
            chartDiv.innerHTML = '<div class="alert alert-info">No sentiment data available</div>';
        }
    } catch (error) {
        console.error('Error updating sentiment chart:', error);
    }
}

// Update mentions charts
async function updateCharts() {
    try {
        const timeRange = document.getElementById('timeRange').value;
        const response = await fetch(`/api/mentions_chart?timerange=${timeRange}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error:', data.error);
            return;
        }

        const container = document.getElementById('mentions-charts');
        container.innerHTML = ''; // Clear existing charts

        // Create charts for each coin
        data.coins.forEach(coinData => {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'pie-chart';
            container.appendChild(chartDiv);

            const values = [];
            const labels = [];
            const colors = [];

            // Process sentiment distribution
            Object.entries(coinData.sentiment_distribution).forEach(([sentiment, count]) => {
                values.push(count);
                labels.push(sentiment);
                colors.push(data.colors[sentiment]);
            });

            const chartData = [{
                values: values,
                labels: labels,
                type: 'pie',
                marker: {
                    colors: colors
                }
            }];

            const layout = {
                title: `${coinData.symbol}<br>Total: ${coinData.total_mentions}`,
                height: 300,
                width: 300,
                showlegend: false
            };

            Plotly.newPlot(chartDiv, chartData, layout);
        });
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Update distribution charts
async function updateDistribution() {
    try {
        const timeRange = document.getElementById('distributionTimeRange')?.value || '7d';
        const response = await fetch(`/api/sentiment_distribution?timerange=${timeRange}`);
        const data = await response.json();

        if (!data || data.error) {
            console.error('API Error:', data?.error || 'No data received');
            return;
        }

        const container = document.getElementById('distribution-charts');
        if (!container) {
            console.error('Distribution charts container not found');
            return;
        }

        container.innerHTML = ''; // Clear existing charts

        const colors = {
            'Positive': '#00ff00',
            'Very Positive': '#008000',
            'Neutral': '#808080',
            'Negative': '#ff0000',
            'Very Negative': '#800000'
        };

        // Make sure data is not empty
        if (Object.keys(data).length === 0) {
            container.innerHTML = '<div class="alert alert-info">No data available</div>';
            return;
        }

        Object.entries(data).forEach(([symbol, info]) => {
            if (!info.distribution) return;

            const chartDiv = document.createElement('div');
            chartDiv.className = 'pie-chart';
            container.appendChild(chartDiv);

            const values = [];
            const labels = [];
            const chartColors = [];

            Object.entries(info.distribution).forEach(([sentiment, stats]) => {
                if (stats.percentage > 0) {  // Only add if there's data
                    values.push(stats.percentage);
                    labels.push(sentiment);
                    chartColors.push(colors[sentiment] || '#999999');
                }
            });

            const chartData = [{
                values: values,
                labels: labels,
                type: 'pie',
                marker: {
                    colors: chartColors
                }
            }];

            const layout = {
                title: `${symbol}<br>Total: ${info.total || 0}`,
                height: 300,
                width: 300,
                showlegend: false
            };

            Plotly.newPlot(chartDiv, chartData, layout);
        });
    } catch (error) {
        console.error('Error updating distribution:', error);
        const container = document.getElementById('distribution-charts');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error loading data: ${error.message}</div>`;
        }
    }
}

// Add event listeners for controls
document.addEventListener('DOMContentLoaded', function () {
    // Add event listeners for timerange changes
    const timeRangeSelects = [
        'timeRange',
        'priceTimeRange',
        'distributionTimeRange'
    ];

    timeRangeSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                if (id === 'timeRange') updateCharts();
                else if (id === 'priceTimeRange') updatePriceChart();
                else if (id === 'distributionTimeRange') updateDistribution();
            });
        }
    });

    // Add event listeners for coin selects
    const coinSelects = [
        { id: 'coinSelect', update: updatePriceChart },
        { id: 'sentimentCoinSelect', update: updateSentimentChart }
    ];

    coinSelects.forEach(({ id, update }) => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', update);
        }
    });
});