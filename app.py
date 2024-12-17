from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from utils.database import DatabaseManager
from utils.chart_utils import ChartManager

app = Flask(__name__)
db_manager = DatabaseManager()
chart_manager = ChartManager()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/coins')
def get_coins():
    coins = db_manager.get_available_coins()
    return jsonify(coins)

@app.route('/api/price/<coin>')
def get_price_data(coin):
    timerange = request.args.get('timerange', '24h')
    
    # Convert timerange to datetime
    now = datetime.now()
    if timerange == '24h':
        start_time = now - timedelta(hours=24)
    elif timerange == '7d':
        start_time = now - timedelta(days=7)
    elif timerange == '30d':
        start_time = now - timedelta(days=30)
    else:  # 90d
        start_time = now - timedelta(days=90)
    
    df = db_manager.get_price_data(coin, start_time)
    
    # Ensure we have a timestamp column
    if 'timestamp' not in df.columns and 'date' not in df.columns:
        return jsonify({
            'timestamps': [],
            'prices': [],
            'volumes': []
        })
    
    # Use timestamp column if it exists, otherwise use date
    time_col = 'timestamp' if 'timestamp' in df.columns else 'date'
    
    # Format the response
    return jsonify({
        'timestamps': df[time_col].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
        'prices': df['price'].tolist() if 'price' in df.columns else [],
        'volumes': df['volume'].tolist() if 'volume' in df.columns else []
    })

@app.route('/api/sentiment/<coin>')
def get_sentiment_data(coin):
    try:
        df = db_manager.get_sentiment_data(coin)
        print(f"Retrieved sentiment data for {coin}:")
        print(df)
        print("\nDataFrame info:")
        print(df.info())

        # Convert sentiment data to match the actual DataFrame structure
        sentiment_data = {
            'dates': df['date'].dt.strftime('%Y-%m-%d').tolist(),
            'sentiment_data': {
                'Positive': df[df['sentiment_label'] == 'Positive']['count'].tolist(),
                'Neutral': df[df['sentiment_label'] == 'Neutral']['count'].tolist(),
                'Negative': df[df['sentiment_label'] == 'Negative']['count'].tolist()
            },
            'colors': {
                'Positive': '#00ff00',    # Green
                'Neutral': '#808080',     # Gray
                'Negative': '#ff0000'     # Red
            }
        }
        
        return jsonify(sentiment_data)
        
    except Exception as e:
        print(f"Error in get_sentiment_data: {str(e)}")
        return jsonify({
            'dates': [],
            'sentiment_data': {},
            'colors': {}
        })

@app.route('/api/mentions')
def get_mentions_data():
    timerange = request.args.get('timerange', '24h')
    
    try:
        df = db_manager.get_mentions_data(timerange)
        
        # Process data for each timeframe
        hour_df = df[df['timeframe'] == 'hour']
        day_df = df[df['timeframe'] == 'day']
        week_df = df[df['timeframe'] == 'week']
        month_df = df[df['timeframe'] == 'month']
        
        return jsonify({
            'hour_labels': hour_df['coin'].tolist(),
            'hour_values': hour_df['mentions'].tolist(),
            'day_labels': day_df['coin'].tolist(),
            'day_values': day_df['mentions'].tolist(),
            'week_labels': week_df['coin'].tolist(),
            'week_values': week_df['mentions'].tolist(),
            'month_labels': month_df['coin'].tolist(),
            'month_values': month_df['mentions'].tolist()
        })
        
    except Exception as e:
        print(f"Error in get_mentions_data: {str(e)}")
        return jsonify({
            'hour_labels': [], 'hour_values': [],
            'day_labels': [], 'day_values': [],
            'week_labels': [], 'week_values': [],
            'month_labels': [], 'month_values': []
        })

@app.route('/api/coin_details/<coin>')
def get_coin_details(coin):
    price_data, sentiment_data = db_manager.get_coin_details(coin)
    
    # Convert price_data tuple to dictionary
    price_dict = None
    if price_data:
        price_dict = {
            'price': float(price_data[0]) if price_data[0] else None,
            'volume': float(price_data[1]) if price_data[1] else None,
            'change': float(price_data[2]) if price_data[2] else None
        }
    
    # Convert sentiment_data rows to list of dictionaries
    sentiment_list = []
    if sentiment_data:
        for row in sentiment_data:
            sentiment_list.append({
                'label': str(row[0]),
                'count': int(row[1]),
                'avg_score': float(row[2]) if row[2] else None
            })
    
    return jsonify({
        'price_data': price_dict,
        'sentiment_data': sentiment_list
    })

@app.route('/api/mentions_chart')
def get_mentions_chart_data():
    timerange = request.args.get('timerange', '7d')
    df = db_manager.get_mentions_data(timerange)
    
    if df.empty:
        return jsonify({'error': 'No data available'})
    
    # Convert DataFrame to native Python types
    df = df.copy()  # Create a copy to avoid modifying the original
    df['mention_count'] = df['mention_count'].astype(float)  # Convert numpy types to native Python types
    
    # Group and sort the data
    sorted_coins = df.groupby('symbol')['mention_count'].sum().sort_values(ascending=False).index.tolist()
    
    # Calculate sentiment percentages for each coin
    coin_data = []
    for coin in sorted_coins:
        coin_df = df[df['symbol'] == coin]
        total_mentions = float(coin_df['mention_count'].sum())  # Convert to native Python float
        
        # Calculate sentiment distribution
        sentiment_data = {
            label: float(value)  # Convert numpy.float64 to native Python float
            for label, value in coin_df.groupby('sentiment_label')['mention_count'].sum().items()
        }
        
        # Calculate positive sentiment percentage
        positive_mentions = sentiment_data.get('Positive', 0.0) + sentiment_data.get('Very Positive', 0.0)
        positive_percentage = (positive_mentions / total_mentions * 100) if total_mentions > 0 else 0.0
        
        coin_data.append({
            'symbol': str(coin),  # Ensure string type
            'total_mentions': int(total_mentions),  # Convert to integer
            'sentiment_distribution': sentiment_data,
            'positive_percentage': float(positive_percentage)  # Ensure float type
        })
    
    # Define color mapping
    colors = {
        'Positive': '#00ff00',
        'Very Positive': '#008000',
        'Neutral': '#808080',
        'Negative': '#ff0000',
        'Very Negative': '#800000'
    }
    
    return jsonify({
        'coins': coin_data,
        'colors': colors
    })

@app.route('/api/coin_names')
def get_coin_names():
    """Get dictionary of coin symbols and their CoinGecko names"""
    coin_names = db_manager.get_coin_names()
    return jsonify(coin_names)

@app.route('/api/sentiment_charts/<coin>')
def get_sentiment_charts(coin):
    """Get sentiment chart data for a specific coin"""
    try:
        df = db_manager.get_sentiment_data(coin)
        
        if df.empty:
            return jsonify({
                'error': 'No data available',
                'dates': [],
                'sentiment_data': {},
                'colors': {}
            })
        
        # Group by date and sentiment
        sentiment_over_time = df.pivot(
            index='date',
            columns='sentiment_label',
            values='count'
        ).fillna(0)
        
        # Convert to format suitable for Plotly
        chart_data = {
            'dates': sentiment_over_time.index.strftime('%Y-%m-%d').tolist(),
            'sentiment_data': {
                label: sentiment_over_time[label].astype(int).tolist()
                for label in sentiment_over_time.columns
            },
            'colors': {
                'Positive': '#00ff00',
                'Very Positive': '#008000',
                'Neutral': '#808080',
                'Negative': '#ff0000',
                'Very Negative': '#800000'
            }
        }
        
        return jsonify(chart_data)
        
    except Exception as e:
        print(f"Error in get_sentiment_charts: {str(e)}")
        return jsonify({
            'error': str(e),
            'dates': [],
            'sentiment_data': {},
            'colors': {}
        })

if __name__ == '__main__':
    app.run(debug=True) 