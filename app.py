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
    timeframe = request.args.get('timeframe', '24h')
    
    print(f"\n=== Predictions Request ===")
    print(f"Symbol: {symbol}")
    print(f"Timeframe: {timeframe}")
    
    try:
        print("Attempting database connection...")
        conn = get_db_connection()
        print("Database connection successful")
        cursor = conn.cursor()

        # First check if the symbol exists
        print(f"Checking if symbol {symbol} exists...")
        check_symbol_query = """
            SELECT coin_id 
            FROM Coins 
            WHERE symbol = ?
        """
        cursor.execute(check_symbol_query, symbol)
        coin_result = cursor.fetchone()
        
        if not coin_result:
            print(f"Symbol {symbol} not found in database")
            return jsonify({
                'error': f'Invalid symbol: {symbol}',
                'predictions': []
            }), 400

        print(f"Symbol {symbol} found with coin_id: {coin_result.coin_id}")

        # Get predictions with all related data
        predictions_query = """
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
                p.prediction_error_7d,
                p.prediction_error_30d,
                p.prediction_error_90d,
                p.model_version,
                c.symbol
            FROM predictions p
            JOIN Coins c ON p.coin_id = c.coin_id
            WHERE c.symbol = ?
            ORDER BY p.prediction_date DESC
        """
        
        print("Executing predictions query...")
        cursor.execute(predictions_query, symbol)
        rows = cursor.fetchall()
        print(f"Found {len(rows)} prediction records")

        predictions = []
        for row in rows:
            pred_dict = {
                'prediction_id': row.prediction_id,
                'prediction_date': row.prediction_date.isoformat() if row.prediction_date else None,
                'current_price': float(row.current_price) if row.current_price else None,
                'predicted_price': float(row.prediction_24h) if row.prediction_24h else None,
                'actual_price': float(row.actual_price_24h) if row.actual_price_24h else None,
                'confidence_score': float(row.confidence_score) if row.confidence_score else None,
                'accuracy_score': float(row.accuracy_score) if row.accuracy_score else None,
                'market_conditions': row.market_conditions,
                'volatility_index': float(row.volatility_index) if row.volatility_index else None,
                'prediction_error': float(row.prediction_error_24h) if row.prediction_error_24h else None,
                'model_version': row.model_version,
                'features': []
            }
            
            # Get feature importance for this prediction
            feature_query = """
                SELECT feature_name, importance_score
                FROM prediction_feature_importance
                WHERE prediction_id = ?
                ORDER BY importance_score DESC
            """
            cursor.execute(feature_query, row.prediction_id)
            features = cursor.fetchall()
            
            pred_dict['features'] = [
                {
                    'name': f.feature_name,
                    'importance': float(f.importance_score) if f.importance_score else 0
                }
                for f in features
            ]
            
            predictions.append(pred_dict)

        return jsonify({
            'predictions': predictions,
            'symbol': symbol,
            'timeframe': timeframe
        })

    except Exception as e:
        print("\n=== Error in Predictions ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({
            'error': f"Server error: {type(e).__name__} - {str(e)}",
            'predictions': []
        }), 500
        
    finally:
        if 'conn' in locals():
            print("Closing database connection")
            conn.close()

@app.route('/api/data_loads')
def get_data_loads():
    load_date = request.args.get('date')
    source = request.args.get('source', 'all')
    coin = request.args.get('coin', 'all')
    
    print(f"\n=== Data Loads Request ===")
    print(f"Date: {load_date}")
    print(f"Source: {source}")
    print(f"Coin: {coin}")
    
    try:
        print("Attempting database connection...")
        conn = get_db_connection()
        print("Database connection successful")
        cursor = conn.cursor()

        print("Fetching coins for dropdown...")
        cursor.execute("""
            SELECT coin_id, symbol 
            FROM Coins 
            ORDER BY symbol
        """)
        coins = [{"id": str(row.coin_id), "symbol": row.symbol} for row in cursor.fetchall()]
        print(f"Found {len(coins)} coins")

        print("Fetching chat sources...")
        cursor.execute("""
            SELECT source_id, source_name 
            FROM chat_source 
            ORDER BY source_name
        """)
        sources = [{"id": str(row.source_id), "name": row.source_name} for row in cursor.fetchall()]
        print(f"Found {len(sources)} sources")

        # Time windows in hours
        windows = [
            (1, "Past Hour"),
            (12, "Past 12 Hours"),
            (24, "Past 24 Hours"),
            (72, "Past 3 Days"),
            (168, "Past 7 Days")
        ]

        stats = []
        for hours, label in windows:
            print(f"\nProcessing window: {label}")
            params = []
            where_clauses = []

            where_clauses.append(f"cd.timestamp >= DATEADD(HOUR, -{hours}, GETDATE())")
            
            if load_date:
                where_clauses.append("CONVERT(DATE, cd.timestamp) = ?")
                params.append(load_date)

            if coin != 'all':
                where_clauses.append("c.symbol = ?")
                params.append(coin)

            if source != 'all':
                where_clauses.append("cd.source_id = ?")
                params.append(source)

            where_clause = " AND ".join(where_clauses)

            chat_query = f"""
                SELECT 
                    COUNT(*) as chat_count,
                    MAX(cd.timestamp) as last_update
                FROM chat_data cd
                JOIN Coins c ON cd.coin_id = c.coin_id
                JOIN chat_source cs ON cd.source_id = cs.source_id
                WHERE {where_clause}
            """
            
            print(f"Executing query with params: {params}")
            print(f"Query: {chat_query}")
            
            cursor.execute(chat_query, params)
            result = cursor.fetchone()
            chat_count = result.chat_count if result else 0
            last_update = result.last_update if result and result.last_update else None
            
            print(f"Results - Count: {chat_count}, Last Update: {last_update}")

            stats.append({
                "window": label,
                "chat_count": chat_count,
                "last_update": last_update.isoformat() if last_update else None
            })

        return jsonify({
            "coins": coins,
            "sources": sources,
            "stats": stats
        })

    except Exception as e:
        print("\n=== Error in Data Loads ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({
            "error": f"Server error: {type(e).__name__} - {str(e)}"
        }), 500

    finally:
        if 'conn' in locals():
            print("Closing database connection")
            conn.close()

if __name__ == '__main__':
    app.run(debug=True) 