import pyodbc
from sqlalchemy import create_engine
import pandas as pd
from config import DB_CONNECTION_STRING
from datetime import datetime, timedelta

class DatabaseManager:
    def __init__(self):
        # Use the connection string from config.py
        self.conn_str = DB_CONNECTION_STRING
        self.conn = None
        self.connect()

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = pyodbc.connect(self.conn_str)
            print("Database connection established")
        except Exception as e:
            print(f"Error connecting to database: {e}")

    def get_connection(self):
        """Get a raw PYODBC connection"""
        return pyodbc.connect(self.conn_str)

    def get_engine(self):
        """Get a SQLAlchemy engine"""
        return create_engine(f"mssql+pyodbc:///?odbc_connect={self.conn_str}")

    def get_available_coins(self):
        """Get list of available coins from database"""
        try:
            engine = self.get_engine()
            query = "SELECT symbol FROM Coins ORDER BY symbol"
            df = pd.read_sql_query(query, engine)
            return df['symbol'].tolist()
        except Exception as e:
            print(f"Error getting coins: {str(e)}")
            return []

    def get_price_data(self, coin, start_time):
        """Get price data for a specific coin and time range"""
        query = """
        SELECT pd.timestamp, pd.price_usd as price, pd.volume_24h as volume
        FROM Price_Data pd
        JOIN Coins c ON pd.coin_id = c.coin_id
        WHERE c.symbol = ? AND pd.timestamp >= ?
        ORDER BY pd.timestamp
        """
        try:
            engine = self.get_engine()
            start_time_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
            return pd.read_sql_query(query, engine, params=(coin, start_time_str))
        except Exception as e:
            print(f"Error getting price data: {str(e)}")
            return pd.DataFrame()

    def get_sentiment_data(self, coin):
        """Get sentiment data for a specific coin"""
        try:
            query = """
            WITH DailySentiment AS (
                SELECT 
                    CAST(cd.timestamp AS DATE) as date,
                    cd.sentiment_label,
                    COUNT(*) as count
                FROM chat_data cd
                JOIN Coins c ON cd.coin_id = c.coin_id
                WHERE c.symbol = ?
                    AND cd.sentiment_label IS NOT NULL
                    AND cd.timestamp >= DATEADD(day, -30, GETDATE())  -- Last 30 days of data
                GROUP BY CAST(cd.timestamp AS DATE), cd.sentiment_label
            )
            SELECT 
                date,
                sentiment_label,
                count,
                CAST(count AS FLOAT) / SUM(count) OVER (PARTITION BY date) * 100 as percentage
            FROM DailySentiment
            ORDER BY date ASC, sentiment_label
            """
            
            engine = self.get_engine()
            df = pd.read_sql_query(query, engine, params=(coin,))
            
            if df.empty:
                print(f"No sentiment data found for {coin}")
                return pd.DataFrame()
            
            # Ensure proper column types
            df['date'] = pd.to_datetime(df['date'])
            df['count'] = df['count'].astype(int)
            df['sentiment_label'] = df['sentiment_label'].astype(str)
            df['percentage'] = df['percentage'].astype(float)
            
            print(f"Retrieved sentiment data for {coin}:")
            print(df.head())
            print("\nDataFrame info:")
            print(df.info())
            
            return df
            
        except Exception as e:
            print(f"Error getting sentiment data: {str(e)}")
            print("Full error details:", e.__dict__)
            return pd.DataFrame()

    def get_mentions_data(self, timerange='24h'):
        """Get mentions data for different time periods"""
        try:
            if not self.conn:
                self.connect()
                
            # Base query to get mentions count by coin for different time periods
            base_query = """
            WITH MentionsCounts AS (
                SELECT 
                    c.symbol,
                    COUNT(*) as mention_count,
                    CASE 
                        WHEN cd.timestamp >= DATEADD(HOUR, -1, GETDATE()) THEN 'hour'
                        WHEN cd.timestamp >= DATEADD(DAY, -1, GETDATE()) THEN 'day'
                        WHEN cd.timestamp >= DATEADD(WEEK, -1, GETDATE()) THEN 'week'
                        WHEN cd.timestamp >= DATEADD(MONTH, -1, GETDATE()) THEN 'month'
                    END as time_period
                FROM chat_data cd
                JOIN Coins c ON cd.coin_id = c.coin_id
                WHERE cd.timestamp >= DATEADD(MONTH, -1, GETDATE())
                GROUP BY 
                    c.symbol,
                    CASE 
                        WHEN cd.timestamp >= DATEADD(HOUR, -1, GETDATE()) THEN 'hour'
                        WHEN cd.timestamp >= DATEADD(DAY, -1, GETDATE()) THEN 'day'
                        WHEN cd.timestamp >= DATEADD(WEEK, -1, GETDATE()) THEN 'week'
                        WHEN cd.timestamp >= DATEADD(MONTH, -1, GETDATE()) THEN 'month'
                    END
            )
            SELECT 
                symbol as coin,
                mention_count as mentions,
                time_period as timeframe
            FROM MentionsCounts
            ORDER BY time_period, mention_count DESC
            """
            
            df = pd.read_sql(base_query, self.conn)
            return df

        except Exception as e:
            print(f"Error getting mentions data: {e}")
            # If connection error, try to reconnect
            if "connection" in str(e).lower():
                self.connect()
            return pd.DataFrame(columns=['coin', 'mentions', 'timeframe'])

    def get_coin_details(self, coin):
        """Get detailed information for a specific coin"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Get price data
            price_query = """
            SELECT TOP 1 
                pd.price_usd,
                pd.volume_24h,
                pd.price_change_24h
            FROM Price_Data pd
            JOIN Coins c ON pd.coin_id = c.coin_id
            WHERE c.symbol = ?
            ORDER BY pd.timestamp DESC
            """
            cursor.execute(price_query, coin)
            price_data = cursor.fetchone()
            
            # Get sentiment data
            sentiment_query = """
            SELECT 
                sentiment_label,
                COUNT(*) as count,
                AVG(CAST(sentiment_score as float)) as avg_score
            FROM chat_data cd
            JOIN Coins c ON cd.coin_id = c.coin_id
            WHERE c.symbol = ?
            AND cd.timestamp >= DATEADD(day, -1, GETDATE())
            GROUP BY sentiment_label
            """
            cursor.execute(sentiment_query, coin)
            sentiment_data = cursor.fetchall()
            
            conn.close()
            return price_data, sentiment_data
            
        except Exception as e:
            print(f"Error getting coin details: {str(e)}")
            return None, None

    def get_coin_names(self):
        """Get dictionary of coin symbols and their full names from database"""
        try:
            query = """
            SELECT symbol, full_name 
            FROM Coins 
            ORDER BY symbol
            """
            engine = self.get_engine()
            df = pd.read_sql_query(query, engine)
            
            # Convert full names to URL format (lowercase, replace spaces with hyphens)
            coin_names = {}
            for _, row in df.iterrows():
                url_name = row['full_name'].lower().replace(' ', '-')
                coin_names[row['symbol']] = url_name
            
            return coin_names
        except Exception as e:
            print(f"Error getting coin names: {str(e)}")
            return {}

    def __del__(self):
        """Close database connection when object is destroyed"""
        if self.conn:
            self.conn.close()