let sentimentChart = null;
let dateSlider = null;

async function updateSentimentChart() {
    try {
        const coin = document.getElementById('sentimentCoinSelect').value;
        if (!coin) return;
        
        // Make sure dateSlider is initialized
        if (!dateSlider || !dateSlider.noUiSlider) {
            console.warn('Date slider not initialized yet');
            return;
        }
        
        // Get date range from slider
        const dateRange = dateSlider.noUiSlider.get();
        const startDate = new Date(parseInt(dateRange[0]));
        const endDate = new Date(parseInt(dateRange[1]));
        
        // Show loading indicator
        const chartContainer = document.getElementById('sentiment-chart');
        if (!chartContainer) return;
        
        chartContainer.innerHTML = `
            <div class="text-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-2">Loading sentiment data for ${coin}...</div>
            </div>
        `;
        
        // Safely dispose of existing chart
        if (sentimentChart) {
            try {
                sentimentChart.dispose();
            } catch (e) {
                console.warn('Error disposing chart:', e);
            }
            sentimentChart = null;
        }
        
        const response = await fetch(`/api/sentiment/${coin}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
        const data = await response.json();
        
        // Clear the loading message
        chartContainer.innerHTML = '';
        
        // Create new chart
        sentimentChart = echarts.init(chartContainer);
        
        // Verify data
        if (!data.dates || !data.sentiment_data || !data.colors) {
            throw new Error('Invalid data structure received');
        }

        // Check for empty data
        const hasData = Object.values(data.sentiment_data).some(arr => arr.length > 0);
        if (!hasData) {
            chartContainer.innerHTML = `
                <div class="alert alert-info m-3">
                    <i class="fas fa-info-circle me-2"></i>
                    No sentiment data available for ${coin} in the selected date range
                </div>
            `;
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
        
        sentimentChart.setOption(option);
        
        // Handle window resize
        const handleResize = () => sentimentChart?.resize();
        window.removeEventListener('resize', handleResize);
        window.addEventListener('resize', handleResize);
        
    } catch (error) {
        console.error('Error updating sentiment chart:', error);
        const chartContainer = document.getElementById('sentiment-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading sentiment data: ${error.message}
                </div>
            `;
        }
    }
}

// Initialize the date range slider
async function initializeDateRange() {
    try {
        const response = await fetch('/api/sentiment/daterange');
        const { minDate, maxDate } = await response.json();
        
        const sliderElement = document.getElementById('dateSlider');
        if (!sliderElement) return;
        
        // Convert dates to timestamps
        const minTimestamp = new Date(minDate).getTime();
        const maxTimestamp = new Date(maxDate).getTime();
        
        // Create noUiSlider
        if (sliderElement.noUiSlider) {
            sliderElement.noUiSlider.destroy();
        }
        
        noUiSlider.create(sliderElement, {
            start: [minTimestamp, maxTimestamp],
            connect: true,
            range: {
                'min': minTimestamp,
                'max': maxTimestamp
            },
            step: 24 * 60 * 60 * 1000 // One day in milliseconds
        });
        
        // Store the slider instance
        dateSlider = sliderElement;
        
        // Update display when slider changes
        dateSlider.noUiSlider.on('update', function (values) {
            const startDate = new Date(parseInt(values[0]));
            const endDate = new Date(parseInt(values[1]));
            
            document.getElementById('sentimentDateDisplay').textContent = 
                `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        });
        
        // Update chart when sliding stops
        dateSlider.noUiSlider.on('change', updateSentimentChart);
        
        // Initial chart update
        if (document.getElementById('sentimentCoinSelect').value) {
            updateSentimentChart();
        }
        
    } catch (error) {
        console.error('Error initializing date range:', error);
        const dateDisplay = document.getElementById('sentimentDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = 'Error loading date range';
        }
    }
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize date range first
    initializeDateRange();
    
    // Add change event listener to coin select
    const coinSelect = document.getElementById('sentimentCoinSelect');
    if (coinSelect) {
        coinSelect.addEventListener('change', updateSentimentChart);
    }
    
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