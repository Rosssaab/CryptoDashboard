import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Binance API Configuration
BINANCE_API_KEY = os.getenv('BINANCE_API_KEY')
BINANCE_SECRET_KEY = os.getenv('BINANCE_SECRET_KEY')

# Database Configuration
DB_SERVER = 'MICROBOX\\SQLEXPRESS'
DB_NAME = 'CryptoAiDb'
DB_USER = 'CryptoAdm'
DB_PASSWORD = 'oracle69'

# Create the full connection string
DB_CONNECTION_STRING = (
    "Driver={SQL Server};"
    f"Server={DB_SERVER};"
    f"Database={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
)

# Social Media API Keys
REDDIT_CLIENT_ID = os.getenv('REDDIT_CLIENT_ID')
REDDIT_CLIENT_SECRET = os.getenv('REDDIT_CLIENT_SECRET')
TWITTER_BEARER_TOKEN = os.getenv('TWITTER_BEARER_TOKEN')
CRYPTOCOMPARE_API_KEY = os.getenv('CRYPTOCOMPARE_API_KEY')

COINGECKO_URL = "https://www.coingecko.com/en/coins/"





