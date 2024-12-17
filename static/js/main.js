// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadCoins();
    setupTabHandling();
});

// Load available coins
function loadCoins() {
    fetch('/api/coins')
        .then(response => response.json())
        .then(coins => {
            const priceSelect = document.getElementById('price-coin');
            const sentimentSelect = document.getElementById('sentiment-coin');
            
            coins.forEach(coin => {
                const option = new Option(coin, coin);
                priceSelect.add(option.cloneNode(true));
                sentimentSelect.add(option);
            });
            
            // Initial chart updates
            updatePriceChart();
            updateSentimentChart();
        })
        .catch(error => console.error('Error loading coins:', error));
}

// Tab handling
function setupTabHandling() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab button
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            const targetTab = document.getElementById(`${tab.dataset.tab}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Update the active tab's content
            if (tab.dataset.tab === 'price') {
                updatePriceChart();
            } else if (tab.dataset.tab === 'mentions') {
                updateMentionsChart();
            } else if (tab.dataset.tab === 'sentiment') {
                updateSentimentChart();
            }
        });
    });
}

// Update price chart
function updatePriceChart() {
    const coin = document.getElementById('price-coin').value;
    const timerange = document.getElementById('price-timerange').value;
    
    console.log(`Fetching price data for ${coin} (${timerange})`);
    
    fetch(`/api/price/${coin}?timerange=${timerange}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received price data:', data);
            
            // Create price chart (top)
            const priceTrace = {
                x: data.timestamps,
                y: data.prices,
                type: 'scatter',
                mode: 'lines',
                name: `${coin} Price`,
                line: {
                    color: '#007bff',
                    width: 1
                }
            };

            // Create volume chart (bottom)
            const volumeTrace = {
                x: data.timestamps,
                y: data.volumes,
                type: 'bar',
                name: `${coin} Volume`,
                marker: {
                    color: '#007bff'
                }
            };

            const layout = {
                grid: {
                    rows: 2,
                    columns: 1,
                    pattern: 'independent',
                    roworder: 'top to bottom',
                    height: 0.7
                },
                xaxis: {
                    title: 'Time',
                    gridcolor: '#eee',
                    zeroline: false
                },
                xaxis2: {
                    title: 'Time',
                    gridcolor: '#eee',
                    zeroline: false
                },
                yaxis: {
                    title: 'Price (USD)',
                    gridcolor: '#eee',
                    zeroline: false
                },
                yaxis2: {
                    title: 'Volume (USD)',
                    gridcolor: '#eee',
                    zeroline: false
                },
                height: 700,
                margin: {
                    l: 60,
                    r: 20,
                    t: 30,
                    b: 60
                },
                showlegend: false,
                plot_bgcolor: 'white',
                paper_bgcolor: 'white'
            };

            // Create the combined chart
            Plotly.newPlot('price-chart', 
                [
                    {...priceTrace, yaxis: 'y1', xaxis: 'x1'}, 
                    {...volumeTrace, yaxis: 'y2', xaxis: 'x2'}
                ], 
                layout,
                {responsive: true}
            );
        })
        .catch(error => {
            console.error('Error updating price charts:', error);
        });
}

// Update mentions chart
function updateMentionsChart() {
    const timerange = document.getElementById('mentions-timerange').value;
    
    fetch(`/api/mentions?timerange=${timerange}`)
        .then(response => response.json())
        .then(data => {
            const traces = [
                {
                    values: data.hour_values,
                    labels: data.hour_labels,
                    type: 'pie',
                    name: 'Last Hour',
                    domain: {row: 0, column: 0},
                    title: 'Last Hour',
                    hole: 0.4,
                    hoverinfo: 'label+percent+value',
                    textinfo: 'percent',
                    textposition: 'inside'
                },
                {
                    values: data.day_values,
                    labels: data.day_labels,
                    type: 'pie',
                    name: 'Last Day',
                    domain: {row: 0, column: 1},
                    title: 'Last Day',
                    hole: 0.4,
                    hoverinfo: 'label+percent+value',
                    textinfo: 'percent',
                    textposition: 'inside'
                },
                {
                    values: data.week_values,
                    labels: data.week_labels,
                    type: 'pie',
                    name: 'Last Week',
                    domain: {row: 1, column: 0},
                    title: 'Last Week',
                    hole: 0.4,
                    hoverinfo: 'label+percent+value',
                    textinfo: 'percent',
                    textposition: 'inside'
                },
                {
                    values: data.month_values,
                    labels: data.month_labels,
                    type: 'pie',
                    name: 'Last Month',
                    domain: {row: 1, column: 1},
                    title: 'Last Month',
                    hole: 0.4,
                    hoverinfo: 'label+percent+value',
                    textinfo: 'percent',
                    textposition: 'inside'
                }
            ];

            const layout = {
                grid: {rows: 2, columns: 2},
                height: 800,
                title: {
                    text: 'Coin Mentions Distribution',
                    font: { size: 24 },
                    y: 0.95
                },
                showlegend: true,
                legend: {
                    orientation: 'h',
                    y: -0.1
                }
            };

            Plotly.newPlot('mentions-chart', traces, layout);
        })
        .catch(error => {
            console.error('Error updating mentions chart:', error);
        });
}

// Update sentiment chart
function updateSentimentChart() {
    const coin = document.getElementById('sentiment-coin').value;
    
    console.log(`Updating sentiment chart for ${coin}`);
    
    fetch(`/api/sentiment/${coin}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received sentiment data:', data);
            
            // Create stacked bar chart for each sentiment
            const traces = [];
            
            // Create a trace for each sentiment type
            Object.entries(data.sentiment_data).forEach(([sentiment, values]) => {
                traces.push({
                    x: data.dates,
                    y: values,
                    name: sentiment,
                    type: 'bar',
                    marker: {
                        color: data.colors[sentiment]
                    }
                });
            });

            const layout = {
                barmode: 'stack',
                title: {
                    text: `Sentiment Analysis for ${coin}`,
                    font: { size: 24 }
                },
                xaxis: {
                    title: 'Date',
                    gridcolor: '#eee'
                },
                yaxis: {
                    title: 'Number of Mentions',
                    gridcolor: '#eee'
                },
                height: 600,
                plot_bgcolor: 'white',
                paper_bgcolor: 'white',
                showlegend: true,
                legend: {
                    orientation: 'h',
                    y: -0.2
                }
            };

            Plotly.newPlot('sentiment-chart', traces, layout);
        })
        .catch(error => {
            console.error('Error updating sentiment chart:', error);
        });
}

// Add event listeners for controls
document.addEventListener('DOMContentLoaded', function() {
    // Price tab controls
    const priceUpdateBtn = document.querySelector('#price-tab button');
    if (priceUpdateBtn) {
        priceUpdateBtn.addEventListener('click', updatePriceChart);
    }

    const priceTimerange = document.getElementById('price-timerange');
    if (priceTimerange) {
        priceTimerange.addEventListener('change', updatePriceChart);
    }

    const priceCoin = document.getElementById('price-coin');
    if (priceCoin) {
        priceCoin.addEventListener('change', updatePriceChart);
    }
}); 