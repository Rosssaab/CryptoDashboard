from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from utils.database import DatabaseManager
from utils.chart_utils import ChartManager
import pyodbc
import traceback
from config import DB_CONNECTION_STRING  # Import the full connection string

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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                CAST(timestamp AS DATE) as date,
                sentiment_label,
                COUNT(*) as count
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE c.symbol = ?
            GROUP BY CAST(timestamp AS DATE), sentiment_label
            ORDER BY date
        """
        
        cursor.execute(query, [coin])
        rows = cursor.fetchall()
        
        # Create lists for each column
        dates = []
        labels = []
        counts = []
        
        for row in rows:
            dates.append(row[0])
            labels.append(row[1])
            counts.append(row[2])
        
        # Create DataFrame with explicit column names
        df = pd.DataFrame({
            'date': dates,
            'sentiment_label': labels,
            'count': counts
        })
        
        # Get unique dates for x-axis
        unique_dates = df['date'].dt.strftime('%Y-%m-%d').unique().tolist()
        
        # Initialize sentiment data with zeros
        sentiment_data = {
            'Positive': [0] * len(unique_dates),
            'Neutral': [0] * len(unique_dates),
            'Negative': [0] * len(unique_dates)
        }
        
        # Fill in the actual values
        for date, group in df.groupby('date'):
            date_str = date.strftime('%Y-%m-%d')
            date_idx = unique_dates.index(date_str)
            for _, row in group.iterrows():
                sentiment_data[row['sentiment_label']][date_idx] = row['count']
        
        return jsonify({
            'dates': unique_dates,
            'sentiment_data': sentiment_data,
            'colors': {
                'Positive': '#28a745',  # Green
                'Neutral': '#6c757d',   # Gray
                'Negative': '#dc3545'   # Red
            }
        })
        
    except Exception as e:
        print(f"Error in get_sentiment_data: {str(e)}")
        traceback.print_exc()  # Add this to get more detailed error information
        return jsonify({
            'error': str(e),
            'dates': [],
            'sentiment_data': {},
            'colors': {}
        }), 500
        
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

@app.route('/api/predictions/<symbol>')
def get_predictions(symbol):
    try:
        # Get date filter from request parameters
        filter_date = request.args.get('filter_date')
        
        conn = get_db_connection()
        cursor = conn.cursor()

        # Base query
        query = """
            SELECT 
                p.prediction_id,
                p.prediction_date,
                p.current_price,
                p.prediction_24h,
                p.prediction_7d,
                p.prediction_30d,
                p.prediction_90d,
                p.actual_price_24h,
                p.actual_price_7d,
                p.actual_price_30d,
                p.actual_price_90d,
                p.confidence_score,
                p.accuracy_score,
                p.market_conditions,
                p.volatility_index,
                p.prediction_error_24h,
                p.model_version,
                c.symbol
            FROM predictions p
            JOIN Coins c ON p.coin_id = c.coin_id
            WHERE 1=1
        """
        
        params = []
        
        # Add symbol filter if not 'all'
        if symbol.lower() != 'all':
            query += " AND c.symbol = ?"
            params.append(symbol)
            
        # Add date filter if provided
        if filter_date:
            query += " AND CAST(p.prediction_date AS DATE) = CAST(? AS DATE)"
            params.append(filter_date)
            
        query += " ORDER BY p.prediction_date DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            result = {
                'prediction_id': row.prediction_id,
                'prediction_date': row.prediction_date.isoformat() if row.prediction_date else None,
                'symbol': row.symbol,
                'current_price': float(row.current_price) if row.current_price else None,
                'prediction_24h': float(row.prediction_24h) if row.prediction_24h else None,
                'prediction_7d': float(row.prediction_7d) if row.prediction_7d else None,
                'prediction_30d': float(row.prediction_30d) if row.prediction_30d else None,
                'prediction_90d': float(row.prediction_90d) if row.prediction_90d else None,
                'actual_price_24h': float(row.actual_price_24h) if row.actual_price_24h else None,
                'actual_price_7d': float(row.actual_price_7d) if row.actual_price_7d else None,
                'actual_price_30d': float(row.actual_price_30d) if row.actual_price_30d else None,
                'actual_price_90d': float(row.actual_price_90d) if row.actual_price_90d else None,
                'confidence_score': float(row.confidence_score) if row.confidence_score else None,
                'accuracy_score': float(row.accuracy_score) if row.accuracy_score else None,
                'market_conditions': row.market_conditions,
                'volatility_index': float(row.volatility_index) if row.volatility_index else None,
                'prediction_error': float(row.prediction_error_24h) if row.prediction_error_24h else None,
                'model_version': row.model_version
            }
            results.append(result)

        return jsonify({
            'predictions': results,
            'symbol': symbol
        })

    except Exception as e:
        print(f"Error in get_predictions: {str(e)}")
        return jsonify({
            'error': str(e),
            'predictions': []
        }), 500

    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/data_loads')
def get_data_loads():
    hours = request.args.get('hours', '24')
    source = request.args.get('source', 'all')
    coin = request.args.get('coin', 'all')
    
    print(f"\n=== Data Loads Request ===")
    print(f"Hours: {hours}")
    print(f"Source: {source}")
    print(f"Coin: {coin}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get coins for dropdown
        print("Fetching coins...")
        cursor.execute("SELECT coin_id, symbol FROM Coins ORDER BY symbol")
        coins = [{"id": str(row[0]), "symbol": row[1]} for row in cursor.fetchall()]
        print(f"Found {len(coins)} coins")

        # Get chat sources for dropdown
        print("Fetching sources...")
        cursor.execute("SELECT source_id, source_name FROM chat_source ORDER BY source_name")
        sources = [{"id": str(row[0]), "name": row[1]} for row in cursor.fetchall()]
        print(f"Found {len(sources)} sources")

        # Main query for stats
        params = [int(hours)]  # Initialize params list
        where_clauses = ["cd.timestamp >= DATEADD(HOUR, -?, GETDATE())"]  # Initialize where_clauses list

        if source != 'all':
            where_clauses.append("cd.source_id = ?")
            params.append(int(source))

        if coin != 'all':
            where_clauses.append("c.symbol = ?")
            params.append(coin)

        where_clause = " AND ".join(where_clauses)

        query = """
            SELECT 
                cs.source_name,
                c.symbol,
                COUNT(cd.chat_id) as record_count,
                AVG(CONVERT(float, cd.sentiment_score)) as avg_sentiment
            FROM chat_data cd
            INNER JOIN Coins c 
                ON cd.coin_id = c.coin_id
            INNER JOIN chat_source cs 
                ON cd.source_id = cs.source_id
            WHERE {where_clause}
            GROUP BY 
                cs.source_name,
                c.symbol
            ORDER BY 
                cs.source_name,
                c.symbol
        """.format(where_clause=where_clause)

        # Debug output
        print("\n=== SQL Query ===")
        print("Query template:")
        print(query)
        print("\nParameters:", params)
        
        # Show complete SQL with parameters
        debug_sql = query
        for param in params:
            debug_sql = debug_sql.replace('?', str(param) if isinstance(param, (int, float)) else f"'{param}'", 1)
        print("\nComplete SQL with parameters:")
        print(debug_sql)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        print(f"Found {len(rows)} result rows")
        
        stats = []
        for row in rows:
            try:
                stats.append({
                    'source': str(row[0]),    # source_name
                    'symbol': str(row[1]),    # symbol
                    'count': int(row[2]),     # record_count
                    'sentiment': float(row[3]) if row[3] is not None else 0.0  # avg_sentiment
                })
            except Exception as e:
                print(f"Error processing row {row}: {str(e)}")

        result = {
            "coins": coins,
            "sources": sources,
            "stats": stats
        }
        
        print("\nReturning result:")
        print(f"- {len(coins)} coins")
        print(f"- {len(sources)} sources")
        print(f"- {len(stats)} stat rows")
        
        return jsonify(result)

    except Exception as e:
        print("\n=== Error in Data Loads ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        
        return jsonify({
            "error": str(e),
            "error_type": type(e).__name__,
            "coins": [],
            "sources": [],
            "stats": []
        }), 500

    finally:
        if 'conn' in locals():
            print("Closing database connection")
            conn.close()

if __name__ == '__main__':
    app.run(debug=True) 