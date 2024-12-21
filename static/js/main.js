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

        // Remove active class from all tabs
        const tablinks = document.getElementsByClassName("nav-link");
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
            tablinks[i].classList.remove("bg-secondary");  // Remove dark background
            tablinks[i].classList.remove("text-white");    // Remove white text
        }

        // Show current tab and mark it active
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.classList.add("active");
        evt.currentTarget.classList.add("bg-secondary");   // Add dark background to active tab
        evt.currentTarget.classList.add("text-white");     // Add white text to active tab

        // Initialize data based on tab
        if (tabName === 'DataLoads') {
            await updateDataLoads();
        } else if (tabName === 'Predictions') {
            await initializePredictions();
        } else if (tabName === 'Sentiment') {
            await updateSentimentChart();
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

        const container = document.getElementById('mentions-charts');
        container.innerHTML = '';

        data.coins.forEach(coin => {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            container.appendChild(chartDiv);

            const total = Object.values(coin.sentiment_distribution).reduce((a, b) => a + b, 0);
            const pieData = {
                values: [],
                labels: [],
                type: 'pie',
                hole: 0.6,
                marker: {
                    colors: ['#4CAF50', '#808080', '#FF4444']
                },
                hovertemplate: '%{percent:.1f}%<extra></extra>',
                showlegend: false,
                textinfo: 'none',
                depth: 0.5,
                rotation: 45,
                shadow: true,
                domain: {
                    x: [0, 1],
                    y: [0, 0.85]
                }
            };

            // Add data points only if they have values
            if (coin.sentiment_distribution['Positive'] > 0) {
                pieData.values.push(coin.sentiment_distribution['Positive']);
                pieData.labels.push('');
            }
            if (coin.sentiment_distribution['Neutral'] > 0) {
                pieData.values.push(coin.sentiment_distribution['Neutral']);
                pieData.labels.push('');
            }
            if (coin.sentiment_distribution['Negative'] > 0) {
                pieData.values.push(coin.sentiment_distribution['Negative']);
                pieData.labels.push('');
            }

            const layout = {
                height: 300,
                width: 300,
                margin: { t: 30, b: 30, l: 30, r: 30 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                scene: {
                    camera: {
                        eye: {x: 1.5, y: 1.5, z: 1.5}
                    }
                },
                annotations: [
                    {
                        text: coin.symbol,
                        x: 0.5,
                        y: 0.42,
                        font: {
                            size: 24,
                            color: '#000'
                        },
                        showarrow: false,
                        opacity: 0
                    },
                    {
                        text: `${total} mentions`,
                        x: 0.5,
                        y: 1,
                        xanchor: 'center',
                        yanchor: 'top',
                        font: {
                            size: 16,
                            color: '#666'
                        },
                        showarrow: false,
                        id: `mentions-${coin.symbol}`,
                        opacity: 0
                    }
                ],
                shapes: [
                    {
                        type: 'rect',
                        xref: 'paper',
                        yref: 'paper',
                        x0: 0.05,
                        y0: 0.05,
                        x1: 0.95,
                        y1: 0.95,
                        fillcolor: 'rgba(0,0,0,0.1)',
                        layer: 'below',
                        line: {width: 0},
                        opacity: 0.5
                    }
                ]
            };

            // First create the plot
            Plotly.newPlot(chartDiv, [pieData], layout, {
                displayModeBar: false,
                responsive: true
            }).then(() => {
                // Then animate elements in
                setTimeout(() => {
                    Plotly.animate(chartDiv, {
                        data: [{
                            type: 'pie',
                            hole: 0.6,
                            values: pieData.values,
                            rotation: 45
                        }],
                        layout: {
                            'annotations[0].opacity': 1,
                            'annotations[1].opacity': 1
                        }
                    }, {
                        transition: {
                            duration: 1000,
                            easing: 'cubic-in-out'
                        },
                        frame: {
                            duration: 500,
                            redraw: true
                        }
                    });
                }, 100);
            });

            // Add hover events
            chartDiv.on('plotly_hover', () => {
                Plotly.relayout(chartDiv, {
                    'annotations[1].font.weight': 'bold'
                });
            });

            chartDiv.on('plotly_unhover', () => {
                Plotly.relayout(chartDiv, {
                    'annotations[1].font.weight': 'normal'
                });
            });
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

// Make sure the chart updates when the tab is opened
document.addEventListener('DOMContentLoaded', () => {
    const sentimentTab = document.querySelector('[data-tab="Sentiment"]');
    if (sentimentTab) {
        sentimentTab.addEventListener('click', () => {
            setTimeout(updateSentimentChart, 100); // Small delay to ensure container is visible
        });
    }
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

// Add event listeners for data loads
document.getElementById('loadHoursSelect')?.addEventListener('change', updateDataLoads);
document.getElementById('chatSourceSelect')?.addEventListener('change', updateDataLoads);
document.getElementById('loadCoinSelect')?.addEventListener('change', updateDataLoads);

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

// Add event listener for the predictions date filter
document.getElementById('predictionsDateFilter')?.addEventListener('change', async () => {
    await updatePredictions();
});