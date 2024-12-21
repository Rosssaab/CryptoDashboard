// Sentiment tab functionality
async function updateSentimentChart() {
    try {
        const coin = document.getElementById('sentimentCoinSelect').value;
        if (!coin) return;
        
        console.log('Fetching sentiment data for:', coin);
        const response = await fetch(`/api/sentiment/${coin}`);
        const data = await response.json();
        
        console.log('Received sentiment data:', data);
        
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
        
        console.log('Chart options:', option);
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

// Add event listener for coin selection
document.addEventListener('DOMContentLoaded', () => {
    // Add change event listener to coin select
    document.getElementById('sentimentCoinSelect')?.addEventListener('change', updateSentimentChart);
    
    // Fetch available coins for sentiment analysis
    fetch('/api/coins?tab=sentiment')
        .then(response => response.json())
        .then(coins => {
            const sentimentCoinSelect = document.getElementById('sentimentCoinSelect');
            if (sentimentCoinSelect) {
                coins.forEach(coin => {
                    const option = document.createElement('option');
                    option.value = coin;
                    option.textContent = coin;
                    sentimentCoinSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error loading coins:', error));
});

// Export the function so it's available to main.js
window.updateSentimentChart = updateSentimentChart; 