// Mentions tab functionality
async function updateMentionsCharts() {
    try {
        const timeRange = document.getElementById('timeRange').value;
        const sortBy = document.getElementById('sortBy').value;
        
        const response = await fetch(`/api/mentions?timerange=${timeRange}&sort=${sortBy}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const container = document.getElementById('mentions-charts');
        container.innerHTML = ''; // Clear existing charts
        
        data.forEach(coinData => {
            // Create chart container
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            container.appendChild(chartDiv);
            
            // Initialize ECharts
            const chart = echarts.init(chartDiv);
            
            // Prepare data for pie chart
            const pieData = [
                { value: coinData.positive, name: 'Positive', itemStyle: { color: '#4CAF50' } },
                { value: coinData.negative, name: 'Negative', itemStyle: { color: '#f44336' } },
                { value: coinData.neutral, name: 'Neutral', itemStyle: { color: '#9E9E9E' } }
            ];
            
            // Chart options
            const option = {
                title: {
                    text: coinData.symbol,
                    subtext: `Total Mentions: ${coinData.total}`,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c} ({d}%)'
                },
                series: [{
                    type: 'pie',
                    radius: '70%',
                    data: pieData,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };
            
            // Set chart options
            chart.setOption(option);
            
            // Add click event
            chart.on('click', () => {
                showInsights(coinData);
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                chart.resize();
            });
        });
        
    } catch (error) {
        console.error('Error updating mentions charts:', error);
        const container = document.getElementById('mentions-charts');
        container.innerHTML = `
            <div class="alert alert-danger">
                Error loading mentions data: ${error.message}
            </div>`;
    }
}

// Export the function so it's available to main.js
window.updateMentionsCharts = updateMentionsCharts; 