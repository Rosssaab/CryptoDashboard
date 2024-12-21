from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from utils.database import DatabaseManager
from utils.chart_utils import ChartManager
import pyodbc
import traceback
from config import DB_CONNECTION_STRING  # Import the full connection string
import decimal

app = Flask(__name__)
db_manager = DatabaseManager()
chart_manager = ChartManager()

def get_db_connection():
    try:
        print("Attempting database connection with configured string...")
        return pyodbc.connect(DB_CONNECTION_STRING)
    except Exception as e:
        print(f"Connection error: {str(e)}")
        print(f"Using connection string: {DB_CONNECTION_STRING}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/coins')
def get_coins():
    # Get the tab parameter, defaulting to None if not provided
    tab = request.args.get('tab')
    
    coins = db_manager.get_available_coins()
    
    # Add "All" option for all tabs
    coins.insert(0, "All")
        
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

@app.route('/api/sentiment/daterange')
def get_sentiment_date_range():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        SELECT 
            MIN(CONVERT(DATE, timestamp)) as min_date,
            MAX(CONVERT(DATE, timestamp)) as max_date
        FROM chat_data cd
        JOIN Coins c ON cd.coin_id = c.coin_id
        WHERE cd.sentiment_label IS NOT NULL
        """
        
        cursor.execute(query)
        row = cursor.fetchone()
        
        if not row or not row[0] or not row[1]:
            # Return default date range if no data
            now = datetime.now()
            week_ago = now - timedelta(days=7)
            return jsonify({
                'minDate': week_ago.strftime('%Y-%m-%d'),
                'maxDate': now.strftime('%Y-%m-%d')
            })
            
        return jsonify({
            'minDate': row[0].strftime('%Y-%m-%d'),
            'maxDate': row[1].strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        print(f"Error in get_sentiment_date_range: {str(e)}")
        # Return a default range on error
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        return jsonify({
            'minDate': week_ago.strftime('%Y-%m-%d'),
            'maxDate': now.strftime('%Y-%m-%d')
        })
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/sentiment/<coin>')
def get_sentiment_data(coin):
    print(f"\n\n=== Starting sentiment data request for {coin} ===")
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        # Convert ISO dates to SQL Server format
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            start_date = start_dt.strftime('%Y-%m-%d %H:%M:%S')
            end_date = end_dt.strftime('%Y-%m-%d %H:%M:%S')
        except Exception as e:
            print(f"Date parsing error: {str(e)}")
            return jsonify({'error': 'Invalid date format'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Modify query based on whether "All" is selected
        if coin.lower() == 'all':
            query = """
            SELECT 
                CONVERT(DATE, cd.timestamp) as date,
                COALESCE(cd.sentiment_label, 'Neutral') as sentiment_label,
                COUNT(*) as count
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE cd.timestamp BETWEEN ? AND ?
                AND cd.sentiment_label IS NOT NULL
            GROUP BY CONVERT(DATE, cd.timestamp), cd.sentiment_label
            ORDER BY date
            """
            cursor.execute(query, (start_date, end_date))
        else:
            query = """
            SELECT 
                CONVERT(DATE, cd.timestamp) as date,
                COALESCE(cd.sentiment_label, 'Neutral') as sentiment_label,
                COUNT(*) as count
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE c.symbol = ?
                AND cd.timestamp BETWEEN ? AND ?
                AND cd.sentiment_label IS NOT NULL
            GROUP BY CONVERT(DATE, cd.timestamp), cd.sentiment_label
            ORDER BY date
            """
            cursor.execute(query, (coin, start_date, end_date))
        
        rows = cursor.fetchall()
        print(f"\nQuery returned {len(rows)} rows")
        
        dates = []
        sentiment_data = {
            'Positive': [],
            'Neutral': [],
            'Negative': []
        }
        
        current_date = None
        current_data = {'Positive': 0, 'Neutral': 0, 'Negative': 0}
        
        for row in rows:
            # The date is already a string in YYYY-MM-DD format from SQL Server
            date = str(row[0])  # Convert to string in case it's not already
            sentiment = row[1]
            count = row[2]
            
            if date not in dates:
                if current_date is not None:
                    for sentiment_type in sentiment_data:
                        sentiment_data[sentiment_type].append(current_data[sentiment_type])
                
                dates.append(date)
                current_date = date
                current_data = {'Positive': 0, 'Neutral': 0, 'Negative': 0}
            
            if sentiment in current_data:
                current_data[sentiment] = count
        
        if current_date is not None:
            for sentiment_type in sentiment_data:
                sentiment_data[sentiment_type].append(current_data[sentiment_type])
        
        response_data = {
            'dates': dates,
            'sentiment_data': sentiment_data,
            'colors': {
                'Positive': '#28a745',
                'Neutral': '#6c757d',
                'Negative': '#dc3545'
            }
        }
        
        print(f"Returning data structure with {len(dates)} dates")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in get_sentiment_data: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
        
    finally:
        if 'conn' in locals():
            conn.close()

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
    sort_by = request.args.get('sort_by', 'total')
    try:
        days = {
            '24h': 1,
            '7d': 7,
            '30d': 30,
            '90d': 90
        }.get(timerange, 7)

        # Use parameterized query with proper SQL Server syntax
        query = """
        WITH SentimentCounts AS (
            SELECT 
                c.symbol,
                cd.sentiment_label,
                COUNT(*) as mentions
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE cd.timestamp >= DATEADD(day, ?, GETDATE())
            GROUP BY c.symbol, cd.sentiment_label
        )
        SELECT 
            symbol,
            sentiment_label,
            mentions,
            CAST(mentions AS FLOAT) * 100.0 / SUM(mentions) OVER (PARTITION BY symbol) as percentage
        FROM SentimentCounts
        ORDER BY symbol, sentiment_label
        """

        # Execute query with days parameter
        df = pd.read_sql_query(query, db_manager.get_engine(), params=(-days,))
        
        # Process data for each coin
        result = {'coins': []}
        
        for symbol in df['symbol'].unique():
            coin_data = df[df['symbol'] == symbol]
            total_mentions = int(coin_data['mentions'].sum())
            
            # Calculate sentiment distribution
            distribution = {
                'Positive': 0,
                'Neutral': 0,
                'Negative': 0,
                'Very Positive': 0,
                'Very Negative': 0
            }
            
            # Update distribution with actual values
            for _, row in coin_data.iterrows():
                sentiment = row['sentiment_label']
                if sentiment in distribution:
                    distribution[sentiment] = int(row['mentions'])
            
            result['coins'].append({
                'symbol': symbol,
                'total_mentions': total_mentions,
                'sentiment_distribution': distribution
            })
        
        # Sort the coins based on the sort_by parameter
        result['coins'].sort(key=lambda x: (
            -x['total_mentions'] if sort_by == 'total' else
            -(x['sentiment_distribution']['Positive'] / x['total_mentions'] * 100 if x['total_mentions'] > 0 else 0) if sort_by == 'positive' else
            -(x['sentiment_distribution']['Negative'] / x['total_mentions'] * 100 if x['total_mentions'] > 0 else 0) if sort_by == 'negative' else
            x['symbol']  # sort by name
        ))
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_mentions_chart_data: {str(e)}")
        return jsonify({
            'error': str(e),
            'coins': []
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

@app.route('/api/sentiment_distribution')
def get_sentiment_distribution():
    timerange = request.args.get('timerange', '7d')
    try:
        days = {
            '24h': 1,
            '7d': 7,
            '30d': 30,
            '90d': 90
        }.get(timerange, 7)

        query = """
        WITH SentimentCounts AS (
            SELECT 
                c.symbol,
                cd.sentiment_label,
                COUNT(*) as mention_count
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE cd.timestamp >= DATEADD(day, ?, GETDATE())
            GROUP BY c.symbol, cd.sentiment_label
        )
        SELECT 
            symbol,
            sentiment_label,
            mention_count,
            CAST(mention_count AS FLOAT) * 100.0 / SUM(mention_count) OVER (PARTITION BY symbol) as percentage
        FROM SentimentCounts
        ORDER BY symbol, sentiment_label
        """
        
        # Execute query with days parameter
        df = pd.read_sql_query(query, db_manager.get_engine(), params=(-days,))
        
        # Convert DataFrame to dictionary structure
        result = {}
        for symbol in df['symbol'].unique():
            symbol_data = df[df['symbol'] == symbol]
            total = int(symbol_data['mention_count'].sum())
            
            distribution = {}
            for _, row in symbol_data.iterrows():
                distribution[str(row['sentiment_label'])] = {
                    'count': int(row['mention_count']),
                    'percentage': float(row['percentage'])
                }
            
            result[symbol] = {
                'total': total,
                'distribution': distribution
            }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_sentiment_distribution: {str(e)}")
        return jsonify({})

@app.route('/api/predictions')
def get_predictions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Print column names for debugging
        cursor.execute("SELECT TOP 1 * FROM vw_predictions")
        columns = [column[0] for column in cursor.description]
        print("Column names:", columns)
        
        cursor.execute("""
            SELECT 
                PredictionDate,
                Symbol,
                [Price When Predicted],
                [Price Now],
                [Prediction 24h],
                [Actual 24h],
                [Predicted 7d],
                [Actual 7d],
                [Pred 30d],
                [Actual 30d],
                [Pred 90d],
                [Actual 90d],
                Sentiment,
                Confidence,
                Accuracy
            FROM vw_predictions
            ORDER BY PredictionDate DESC
        """)
        
        # Get column names from the cursor
        columns = [column[0] for column in cursor.description]
        
        predictions = []
        for row in cursor.fetchall():
            # Convert row to dict with correct column names
            prediction = {}
            for i, value in enumerate(row):
                # Convert Decimal to float for JSON serialization
                if isinstance(value, decimal.Decimal):
                    prediction[columns[i]] = float(value)
                else:
                    prediction[columns[i]] = value
            predictions.append(prediction)
        
        return jsonify({'predictions': predictions})
        
    except Exception as e:
        print(f"Error in get_predictions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data_loads')
def get_data_loads():
    try:
        # Get query parameters with defaults
        hours = request.args.get('hours', '1')
        source = request.args.get('source', 'all')
        coin = request.args.get('coin', 'all')

        print(f"Received request with params - hours: {hours}, source: {source}, coin: {coin}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Base query using chat_data table
        query = """
            SELECT 
                cd.timestamp as LoadDate,
                cs.source_name as ChatSource,
                c.symbol as Symbol,
                COUNT(*) as RecordsLoaded
            FROM chat_data cd
            JOIN chat_source cs ON cd.source_id = cs.source_id
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE cd.timestamp >= DATEADD(HOUR, -?, GETDATE())
        """
        params = [int(hours)]

        # Add source filter if specified
        if source.lower() != 'all':
            query += " AND cs.source_name = ?"
            params.append(source)

        # Add coin filter if specified
        if coin.lower() != 'all':
            query += " AND c.symbol = ?"
            params.append(coin)

        # Add grouping
        query += """
            GROUP BY cd.timestamp, cs.source_name, c.symbol
            ORDER BY cd.timestamp DESC
        """

        print(f"Executing query: {query}")
        print(f"With parameters: {params}")

        # Execute query
        cursor.execute(query, params)
        
        # Fetch results
        rows = cursor.fetchall()
        print(f"Found {len(rows)} rows")
        
        # Convert to list of dicts
        results = []
        for row in rows:
            results.append({
                'LoadDate': row[0].isoformat() if row[0] else None,
                'ChatSource': row[1],
                'Symbol': row[2],
                'RecordsLoaded': row[3]
            })

        return jsonify(results)

    except Exception as e:
        print(f"Error in get_data_loads: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/chat_sources')
def get_chat_sources():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get chat sources from the database
        cursor.execute("SELECT source_name FROM chat_source ORDER BY source_name")
        sources = [row[0] for row in cursor.fetchall()]
        
        return jsonify(sources)
        
    except Exception as e:
        print(f"Error in get_chat_sources: {str(e)}")
        return jsonify([]), 500
        
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True) 