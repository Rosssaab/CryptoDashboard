// Price tab functionality
async function updatePriceChart() {
    try {
        const coin = document.getElementById('coinSelect').value;
        if (!coin) return; // Don't make the API call if no coin is selected
        
        const timeRange = document.getElementById('priceTimeRange').value;
        const response = await fetch(`/api/price/${coin}?timerange=${timeRange}`);
        const data = await response.json();

        const chartContainer = document.getElementById('price-chart');
        if (!chartContainer) return;

        const chart = echarts.init(chartContainer);
        
        const option = {
            title: {
                text: `${coin} Price Chart`,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const date = new Date(params[0].value[0]);
                    return `${date.toLocaleString()}<br/>
                            Price: $${params[0].value[1].toFixed(6)}`;
                }
            },
            xAxis: {
                type: 'time',
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                name: 'Price ($)',
                axisLabel: {
                    formatter: '${value}'
                }
            },
            series: [{
                name: 'Price',
                type: 'line',
                data: data.prices.map((price, index) => [data.timestamps[index], price]),
                smooth: true,
                areaStyle: {
                    opacity: 0.1
                }
            }]
        };
        
        chart.setOption(option);

        // Handle window resize
        window.addEventListener('resize', () => {
            chart.resize();
        });

    } catch (error) {
        console.error('Error updating price chart:', error);
        const chartContainer = document.getElementById('price-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="alert alert-danger">Error loading price data</div>';
        }
    }
}

// Initialize price data
function initializePriceData() {
    // When populating the price tab's coin selector
    fetch('/api/coins?tab=price')
        .then(response => response.json())
        .then(coins => {
            const coinSelect = document.getElementById('coinSelect');
            if (!coinSelect) return;
            
            coins.forEach(coin => {
                const option = document.createElement('option');
                option.value = coin;
                option.textContent = coin;
                coinSelect.appendChild(option);
            });

            // Load initial chart if we have coins
            if (coins.length > 0) {
                updatePriceChart();
            }
        })
        .catch(error => {
            console.error('Error loading coins:', error);
        });
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePriceData();
    
    // Add event listeners for price controls
    document.getElementById('coinSelect')?.addEventListener('change', updatePriceChart);
    document.getElementById('priceTimeRange')?.addEventListener('change', updatePriceChart);
});

// Export the function so it's available to main.js
window.updatePriceChart = updatePriceChart; 