document.addEventListener('DOMContentLoaded', function () {
    const requiredElements = {
        coinSelect: document.getElementById('coinSelect'),
        sentimentCoinSelect: document.getElementById('sentimentCoinSelect'),
        priceChart: document.getElementById('price-chart'),
        sentimentChart: document.getElementById('sentiment-chart')
    };

    Object.entries(requiredElements).forEach(([name, element]) => {
        if (!element) {
            console.error(`Required element not found: ${name}`);
        }
    });

    if (Object.values(requiredElements).every(element => element)) {
        initializeApp();
    } else {
        console.error('Cannot initialize application: missing required elements');
    }
});

async function initializeApp() {
    try {
        const defaultTab = document.querySelector('[onclick="openTab(event, \'Mentions\')"]');
        if (defaultTab) {
            openTab({ target: defaultTab }, 'Mentions');
        }

        const response = await fetch('/api/coins');
        const coins = await response.json();

        if (!coins || !coins.length) {
            throw new Error('No coins data received');
        }

        const priceSelect = document.getElementById('coinSelect');
        const sentimentSelect = document.getElementById('sentimentCoinSelect');

        [priceSelect, sentimentSelect].forEach(select => {
            if (select) {
                select.innerHTML = '';
                coins.forEach(coin => {
                    const option = new Option(coin, coin);
                    select.add(option);
                });
                if (coins.length > 0) {
                    select.value = coins[0];
                }
            }
        });

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

function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    Array.from(tabcontent).forEach(tab => tab.style.display = "none");

    const tablinks = document.querySelectorAll(".navbar-nav .btn-primary");
    tablinks.forEach(link => link.classList.remove("active"));

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.style.display = "block";
    }

    if (evt.target) {
        evt.target.classList.add("active");
    }
}

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

async function updateCharts() {
    try {
        const timeRange = document.getElementById('timeRange')?.value || '7d';
        const sortBy = document.getElementById('sortBy')?.value || 'total';
        const response = await fetch(`/api/mentions_chart?timerange=${timeRange}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error:', data.error);
            return;
        }

        const container = document.getElementById('mentions-charts');
        if (!container) {
            console.error('Mentions charts container not found');
            return;
        }

        container.innerHTML = '';
        
        if (!data.coins || data.coins.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No data available</div>';
            return;
        }

        // Sort the coins based on selected criteria
        data.coins.sort((a, b) => {
            switch(sortBy) {
                case 'total':
                    return b.total_mentions - a.total_mentions;
                case 'positive':
                    const aPos = (a.sentiment_distribution.Positive || 0) / a.total_mentions * 100;
                    const bPos = (b.sentiment_distribution.Positive || 0) / b.total_mentions * 100;
                    return bPos - aPos;
                case 'negative':
                    const aNeg = (a.sentiment_distribution.Negative || 0) / a.total_mentions * 100;
                    const bNeg = (b.sentiment_distribution.Negative || 0) / b.total_mentions * 100;
                    return bNeg - aNeg;
                case 'name':
                    return a.symbol.localeCompare(b.symbol);
                default:
                    return 0;
            }
        });

        const gridContainer = document.createElement('div');
        gridContainer.className = 'chart-grid';
        container.appendChild(gridContainer);

        data.coins.forEach(coinData => {
            if (!coinData.sentiment_distribution) return;

            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            gridContainer.appendChild(chartDiv);

            const distribution = coinData.sentiment_distribution || {};
            const values = [
                distribution.Positive || 0,
                distribution.Neutral || 0,
                distribution.Negative || 0,
                distribution['Very Positive'] || 0,
                distribution['Very Negative'] || 0
            ];

            const labels = [
                'Positive',
                'Neutral',
                'Negative',
                'Very Positive',
                'Very Negative'
            ];

            const nonZeroData = values.map((value, index) => ({
                value,
                label: labels[index]
            })).filter(item => item.value > 0);

            if (nonZeroData.length === 0) {
                chartDiv.innerHTML = `<div class="alert alert-info">No sentiment data for ${coinData.symbol}</div>`;
                return;
            }

            const chartData = [{
                values: nonZeroData.map(item => item.value),
                labels: nonZeroData.map(item => item.label),
                type: 'pie',
                marker: {
                    colors: nonZeroData.map(item => {
                        switch(item.label) {
                            case 'Positive': return '#00ff00';
                            case 'Very Positive': return '#008000';
                            case 'Neutral': return '#808080';
                            case 'Negative': return '#ff0000';
                            case 'Very Negative': return '#800000';
                            default: return '#999999';
                        }
                    })
                },
                textinfo: 'label+percent',
                hoverinfo: 'label+value+percent'
            }];

            const layout = {
                title: {
                    text: `${coinData.symbol}<br>Total: ${coinData.total_mentions || 0}`,
                    font: { size: 14 }
                },
                margin: { t: 40, b: 10, l: 10, r: 10 },
                showlegend: false,
                height: 230,
                width: null,
            };

            const config = {
                responsive: true,
                displayModeBar: false,
                staticPlot: true
            };

            Plotly.newPlot(chartDiv, chartData, layout, config);
        });

    } catch (error) {
        console.error('Error updating charts:', error);
        const container = document.getElementById('mentions-charts');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error loading data: ${error.message}</div>`;
        }
    }
}

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

        container.innerHTML = '';

        const colors = {
            'Positive': '#00ff00',
            'Very Positive': '#008000',
            'Neutral': '#808080',
            'Negative': '#ff0000',
            'Very Negative': '#800000'
        };

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
                if (stats.percentage > 0) {
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

document.addEventListener('DOMContentLoaded', function() {
    // Time range select event listeners
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

    // Sort select event listener
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', updateCharts);
    }

    // Coin select event listeners
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