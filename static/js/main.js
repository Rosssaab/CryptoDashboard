// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadCoins();
    updateMentionsChart();
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
        });
}

// Update mentions chart
function updateMentionsChart() {
    const timerange = document.getElementById('mentions-timerange').value;
    fetch(`/api/mentions_chart?timerange=${timerange}`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('mentions-chart');
            container.innerHTML = ''; // Clear existing charts
            
            // Create grid layout
            const n_cols = 3;
            const n_rows = Math.ceil(data.coins.length / n_cols);
            
            // Create charts
            data.coins.forEach((coinData, index) => {
                // Create div for this chart
                const chartDiv = document.createElement('div');
                chartDiv.style.width = '33%';
                chartDiv.style.height = '300px';
                chartDiv.style.display = 'inline-block';
                container.appendChild(chartDiv);
                
                // Prepare data for Plotly
                const values = [];
                const labels = [];
                const colors = [];
                
                Object.entries(coinData.sentiment_distribution).forEach(([label, count]) => {
                    values.push(count);
                    labels.push(label);
                    colors.push(data.colors[label]);
                });
                
                // Create pie chart
                const trace = {
                    values: values,
                    labels: labels,
                    type: 'pie',
                    marker: {
                        colors: colors
                    },
                    textinfo: 'percent',
                    hoverinfo: 'label+value',
                    hole: 0.4
                };
                
                const layout = {
                    title: {
                        text: `${coinData.symbol}<br>Total: ${coinData.total_mentions}`,
                        font: { size: 14 }
                    },
                    showlegend: false,
                    height: 300,
                    margin: { t: 40, b: 20, l: 20, r: 20 }
                };
                
                Plotly.newPlot(chartDiv, [trace], layout, { displayModeBar: false });
                
                // Add click handler
                chartDiv.on('plotly_click', () => {
                    handlePieClick(coinData.symbol);
                });
            });
        });
}

// Add the pie click handler
function handlePieClick(coin) {
    // Update price and sentiment tabs
    document.getElementById('price-coin').value = coin;
    document.getElementById('sentiment-coin').value = coin;
    
    // Update charts
    updatePriceChart();
    updateSentimentChart();
    
    // Switch to sentiment tab
    const sentimentTab = document.querySelector('[data-tab="sentiment"]');
    sentimentTab.click();
}

// Update price chart
function updatePriceChart() {
    const coin = document.getElementById('price-coin').value;
    const timerange = document.getElementById('price-timerange').value;
    
    fetch(`/api/price/${coin}?timerange=${timerange}`)
        .then(response => response.json())
        .then(data => {
            const layout = {
                title: `${coin} Price and Volume`,
                grid: {rows: 2, columns: 1}
            };
            
            // Process data and create charts...
            Plotly.newPlot('price-chart', data, layout);
        });
}

// Update sentiment chart
function updateSentimentChart() {
    const coin = document.getElementById('sentiment-coin').value;
    
    // Update charts
    fetch(`/api/sentiment_charts/${coin}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            
            // Create stacked bar chart
            const traces = [];
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
                title: `${coin} Sentiment Over Time`,
                barmode: 'stack',
                xaxis: { title: 'Date' },
                yaxis: { title: 'Number of Mentions' },
                showlegend: true,
                legend: { orientation: 'h', y: -0.2 }
            };
            
            Plotly.newPlot('sentiment-chart', traces, layout);
            
            // Update CoinGecko link
            updateCoinGeckoLink(coin);
        });
        
    // Update coin details
    updateCoinDetails(coin);
}

// Update coin details
function updateCoinDetails(coin) {
    fetch(`/api/coin_details/${coin}`)
        .then(response => response.json())
        .then(data => {
            const detailsDiv = document.getElementById('coin-details');
            
            // Format price data
            const priceData = data.price_data;
            const sentimentData = data.sentiment_data;
            
            let html = '<div class="details-container">';
            
            // Price section
            if (priceData) {
                html += `
                    <div class="price-details">
                        <h3>Price Information</h3>
                        <p>Price: $${priceData.price.toLocaleString()}</p>
                        <p class="${priceData.change >= 0 ? 'positive' : 'negative'}">
                            24h Change: ${priceData.change.toFixed(2)}%
                        </p>
                        <p>24h Volume: $${priceData.volume.toLocaleString()}</p>
                    </div>
                `;
            }
            
            // Sentiment section
            if (sentimentData && sentimentData.length > 0) {
                const totalMentions = sentimentData.reduce((sum, item) => sum + item.count, 0);
                
                html += `
                    <div class="sentiment-details">
                        <h3>24h Sentiment</h3>
                        ${sentimentData.map(item => {
                            const percentage = ((item.count / totalMentions) * 100).toFixed(1);
                            return `<p>${item.label}: ${item.count} (${percentage}%)</p>`;
                        }).join('')}
                    </div>
                `;
            }
            
            html += '</div>';
            detailsDiv.innerHTML = html;
        });
}

function updateCoinGeckoLink(coin) {
    fetch('/api/coin_names')
        .then(response => response.json())
        .then(coinNames => {
            const linkDiv = document.getElementById('coingecko-link');
            if (coin in coinNames) {
                const url = `https://www.coingecko.com/en/coins/${coinNames[coin]}`;
                linkDiv.innerHTML = `
                    <a href="${url}" target="_blank" class="coingecko-link">
                        View on CoinGecko
                    </a>
                `;
            } else {
                linkDiv.innerHTML = '';
            }
        });
}

// Tab handling
function setupTabHandling() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });
} 