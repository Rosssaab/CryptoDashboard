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

        // Initialize all coin selects
        const selects = [
            'coinSelect',
            'sentimentCoinSelect',
            'predictionCoinSelect'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
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

        // Set up all event listeners
        setupEventListeners();

        await Promise.all([
            updatePriceChart(),
            updateSentimentChart(),
            updateCharts(),
            updatePredictions()
        ]);

    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

function setupEventListeners() {
    // Time range select event listeners
    const timeRangeSelects = [
        'timeRange',
        'priceTimeRange'
    ];

    timeRangeSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                if (id === 'timeRange') updateCharts();
                else if (id === 'priceTimeRange') updatePriceChart();
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

    // Prediction select event listeners
    const predictionSelects = [
        'predictionCoinSelect',
        'predictionTimeframe'
    ];

    predictionSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', updatePredictions);
        }
    });

    // Initialize Data Loads tab if we're on it
    if (document.getElementById('DataLoads')) {
        initializeDataLoads();
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
        const response = await fetch(`/api/mentions_chart?timerange=${timeRange}&sort_by=${sortBy}`);
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

        const gridContainer = document.createElement('div');
        gridContainer.className = 'chart-grid';
        container.appendChild(gridContainer);

        data.coins.forEach(coinData => {
            if (!coinData.sentiment_distribution) return;

            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            gridContainer.appendChild(chartDiv);

            const distribution = coinData.sentiment_distribution || {};
            const chartData = [
                { value: distribution.Positive || 0, name: 'Positive', itemStyle: { color: '#00ff88' } },
                { value: distribution.Neutral || 0, name: 'Neutral', itemStyle: { color: '#a0a0a0' } },
                { value: distribution.Negative || 0, name: 'Negative', itemStyle: { color: '#ff4444' } },
                { value: distribution['Very Positive'] || 0, name: 'Very Positive', itemStyle: { color: '#00cc66' } },
                { value: distribution['Very Negative'] || 0, name: 'Very Negative', itemStyle: { color: '#cc0000' } }
            ].filter(item => item.value > 0);

            if (chartData.length === 0) {
                chartDiv.innerHTML = `<div class="alert alert-info">No sentiment data for ${coinData.symbol}</div>`;
                return;
            }

            const chart = echarts.init(chartDiv);
            
            const option = {
                title: {
                    text: `${coinData.symbol}\nTotal: ${coinData.total_mentions || 0}`,
                    left: 'center',
                    top: 10,
                    textStyle: {
                        fontSize: 14
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                series: [{
                    name: 'Sentiment',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['50%', '60%'],
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '12',
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    data: chartData
                }]
            };

            chart.setOption(option);

            // Add click handler
            chart.on('click', () => {
                const modalEl = document.getElementById('insightModal');
                const modal = new bootstrap.Modal(modalEl);
                
                document.getElementById('insightModalLabel').textContent = `${coinData.symbol} Sentiment Analysis`;
                
                // Create pie chart in the center section
                const modalChart = echarts.init(document.getElementById('modalPieChart'));
                const modalOption = {
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    series: [{
                        name: 'Sentiment',
                        type: 'pie',
                        radius: ['45%', '95%'],
                        center: ['50%', '50%'],
                        itemStyle: {
                            borderRadius: 8,
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: false
                        },
                        emphasis: {
                            label: {
                                show: false
                            },
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        },
                        data: chartData
                    }]
                };

                // Set fixed size for the chart container
                const modalPieChart = document.getElementById('modalPieChart');
                modalPieChart.style.height = '400px';
                modalPieChart.style.width = '100%';
                
                modalChart.setOption(modalOption);
                
                // Calculate and display insights
                const insights = calculateInsights(coinData);
                document.getElementById('sentimentStats').innerHTML = insights.stats;
                document.getElementById('trendAnalysis').innerHTML = insights.trend;
                document.getElementById('insights').innerHTML = insights.insights;
                
                modal.show();
                
                // Add this: Trigger resize after modal is fully shown
                modalEl.addEventListener('shown.bs.modal', function () {
                    modalChart.resize();
                });
                
                // Cleanup
                modalEl.addEventListener('hidden.bs.modal', function () {
                    modalChart.dispose();
                });
            });

            // Make sure charts resize properly
            window.addEventListener('resize', () => chart.resize());
        });

    } catch (error) {
        console.error('Error updating charts:', error);
        const container = document.getElementById('mentions-charts');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error loading data: ${error.message}</div>`;
        }
    }
}

function calculateInsights(data) {
    const total = Object.values(data.sentiment_distribution).reduce((a, b) => a + b, 0);
    const positive = (data.sentiment_distribution.Positive || 0) + (data.sentiment_distribution['Very Positive'] || 0);
    const negative = (data.sentiment_distribution.Negative || 0) + (data.sentiment_distribution['Very Negative'] || 0);
    const neutral = data.sentiment_distribution.Neutral || 0;
    
    const positivePct = (positive / total * 100).toFixed(1);
    const negativePct = (negative / total * 100).toFixed(1);
    const neutralPct = (neutral / total * 100).toFixed(1);
    
    const sentiment = positivePct > negativePct ? 'Bullish' : positivePct < negativePct ? 'Bearish' : 'Neutral';
    const strength = Math.abs(positivePct - negativePct);
    const conviction = strength > 20 ? 'Strong' : strength > 10 ? 'Moderate' : 'Weak';
    
    return {
        stats: `
            <div class="d-flex justify-content-between mb-2">
                <span>Total Mentions:</span>
                <strong>${total}</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Positive Sentiment:</span>
                <strong class="text-success">${positivePct}%</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Negative Sentiment:</span>
                <strong class="text-danger">${negativePct}%</strong>
            </div>
            <div class="d-flex justify-content-between">
                <span>Neutral Sentiment:</span>
                <strong class="text-secondary">${neutralPct}%</strong>
            </div>
        `,
        trend: `
            <p class="mb-2"><strong>Market Sentiment:</strong> ${sentiment}</p>
            <p class="mb-0"><strong>Conviction:</strong> ${conviction}</p>
        `,
        insights: `
            <ul class="mb-0">
                <li>Current sentiment is <strong>${sentiment.toLowerCase()}</strong> with ${conviction.toLowerCase()} conviction</li>
                <li>The ${positivePct}% positive sentiment suggests ${sentiment === 'Bullish' ? 'potential upward momentum' : 'some support despite bearish trends'}</li>
                <li>${neutralPct}% neutral sentiment indicates ${neutralPct > 30 ? 'significant market uncertainty' : 'clear market direction'}</li>
                <li>Recommendation: ${
                    sentiment === 'Bullish' && conviction === 'Strong' ? 'Consider accumulating positions' :
                    sentiment === 'Bearish' && conviction === 'Strong' ? 'Exercise caution, potential downside risk' :
                    'Monitor for stronger sentiment signals'
                }</li>
            </ul>
        `
    };
}

function viewDetailedSentiment() {
    const sentimentSelect = document.getElementById('sentimentCoinSelect');
    if (sentimentSelect) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('insightModal'));
        modal.hide();
        
        const sentimentTab = document.querySelector('[onclick="openTab(event, \'Sentiment\')"]');
        if (sentimentTab) {
            openTab({ target: sentimentTab }, 'Sentiment');
            updateSentimentChart();
        }
    }
}

async function updatePredictions() {
    const coinSelect = document.getElementById('predictionCoinSelect');
    const timeframe = document.getElementById('predictionTimeframe');
    const tableDiv = document.getElementById('predictions-table');
    
    if (!coinSelect || !timeframe || !tableDiv) {
        console.error('Required elements not found');
        return;
    }

    try {
        const response = await fetch(`/api/predictions/${coinSelect.value}?timeframe=${timeframe.value}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Create the predictions table
        const table = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Current Price</th>
                        <th>Predicted Price</th>
                        <th>Actual Price</th>
                        <th>Error</th>
                        <th>Accuracy</th>
                        <th>Confidence</th>
                        <th>Market</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.predictions.map(pred => {
                        const predDate = new Date(pred.prediction_date).toLocaleString();
                        const isCompleted = pred.actual_price !== null;
                        const accuracy = pred.accuracy_score;
                        
                        return `
                            <tr>
                                <td>${predDate}</td>
                                <td>$${pred.current_price?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</td>
                                <td>$${pred.predicted_price?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-'}</td>
                                <td>${pred.actual_price ? 
                                    '$' + pred.actual_price.toLocaleString(undefined, {minimumFractionDigits: 2}) : 
                                    '<span class="text-muted">Pending</span>'}</td>
                                <td>${pred.prediction_error ? 
                                    `<span class="text-${Math.abs(pred.prediction_error) < 5 ? 'success' : 
                                    Math.abs(pred.prediction_error) < 10 ? 'warning' : 'danger'}">
                                        ${pred.prediction_error > 0 ? '+' : ''}${pred.prediction_error.toFixed(2)}%
                                    </span>` : 
                                    '-'}</td>
                                <td>${isCompleted ? 
                                    `<span class="badge ${accuracy >= 90 ? 'bg-success' : 
                                    accuracy >= 70 ? 'bg-warning' : 'bg-danger'}">${accuracy.toFixed(1)}%</span>` : 
                                    '-'}</td>
                                <td>
                                    <div class="progress" style="height: 20px;">
                                        <div class="progress-bar ${pred.confidence_score >= 80 ? 'bg-success' : 
                                            pred.confidence_score >= 60 ? 'bg-warning' : 'bg-danger'}" 
                                            role="progressbar" 
                                            style="width: ${pred.confidence_score}%">
                                            ${pred.confidence_score.toFixed(1)}%
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge bg-${pred.market_conditions === 'Bullish' ? 'success' : 
                                        pred.market_conditions === 'Bearish' ? 'danger' : 'warning'}">
                                        ${pred.market_conditions}
                                    </span>
                                    <br>
                                    <small>VIX: ${pred.volatility_index.toFixed(1)}</small>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-info" 
                                            onclick='showPredictionDetails(${JSON.stringify(pred)})'>
                                        View
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        tableDiv.innerHTML = table;

    } catch (error) {
        console.error('Error updating predictions:', error);
        tableDiv.innerHTML = `
            <div class="alert alert-danger">
                Error loading predictions: ${error.message}
            </div>`;
    }
}

function showPredictionDetails(prediction) {
    const modal = new bootstrap.Modal(document.getElementById('predictionDetailsModal') || createPredictionModal());
    
    document.getElementById('predictionDetailsTitle').textContent = 
        `Prediction Details - ${new Date(prediction.prediction_date).toLocaleDateString()}`;
    
    // Sort features by importance
    const sortedFeatures = prediction.features.sort((a, b) => b.importance - a.importance);
    
    document.getElementById('predictionDetailsBody').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Model Information</h6>
                <p><strong>Version:</strong> ${prediction.model_version}</p>
                <p><strong>Market Conditions:</strong> ${prediction.market_conditions}</p>
                <p><strong>Volatility Index:</strong> ${prediction.volatility_index.toFixed(2)}</p>
            </div>
            <div class="col-md-6">
                <h6>Feature Importance</h6>
                ${sortedFeatures.map(f => `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between">
                            <span>${f.name}</span>
                            <span>${(f.importance * 100).toFixed(1)}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${f.importance * 100}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.show();
}

function createPredictionModal() {
    const modalHtml = `
        <div class="modal fade" id="predictionDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="predictionDetailsTitle"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="predictionDetailsBody">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstChild);
    
    return document.getElementById('predictionDetailsModal');
}

async function initializeDataLoads() {
    // Set default date to today
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const loadDateSelect = document.getElementById('loadDateSelect');
    if (loadDateSelect) {
        loadDateSelect.value = dateString;
    }
    
    // Add event listeners
    ['loadDateSelect', 'chatSourceSelect', 'loadCoinSelect'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateDataLoadStats);
        }
    });
    
    // Initial load
    await updateDataLoadStats();
}

async function updateDataLoadStats() {
    const dateSelect = document.getElementById('loadDateSelect');
    const sourceSelect = document.getElementById('chatSourceSelect');
    const coinSelect = document.getElementById('loadCoinSelect');
    const statsTable = document.getElementById('dataLoadStats');
    
    if (!dateSelect || !sourceSelect || !coinSelect || !statsTable) {
        console.error('Required elements not found');
        return;
    }

    try {
        const params = new URLSearchParams({
            date: dateSelect.value,
            source: sourceSelect.value,
            coin: coinSelect.value
        });

        const response = await fetch(`/api/data_loads?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Update coins dropdown if needed
        if (data.coins && coinSelect.options.length <= 1) {
            coinSelect.innerHTML = '<option value="all">All Coins</option>';
            data.coins.forEach(coin => {
                coinSelect.add(new Option(coin.symbol, coin.symbol));
            });
        }

        // Update sources dropdown if needed
        if (data.sources && sourceSelect.options.length <= 1) {
            sourceSelect.innerHTML = '<option value="all">All Sources</option>';
            data.sources.forEach(source => {
                sourceSelect.add(new Option(source.name, source.id));
            });
        }

        // Update stats table
        statsTable.innerHTML = data.stats.map(stat => `
            <tr>
                <td>${stat.window}</td>
                <td>${stat.chat_count.toLocaleString()}</td>
                <td>${stat.last_update ? new Date(stat.last_update).toLocaleString() : 'N/A'}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error updating data load stats:', error);
        statsTable.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    Error loading data: ${error.message}
                </td>
            </tr>
        `;
    }
}