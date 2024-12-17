import tkinter as tk
from tkinter import ttk
import webbrowser
from config import COINGECKO_URL

class SentimentTab:
    def __init__(self, parent, db_manager, chart_manager):
        self.parent = parent
        self.db_manager = db_manager
        self.chart_manager = chart_manager
        
        # Create the tab
        self.frame = ttk.Frame(parent)
        self.setup_tab()

    def setup_tab(self):
        # Controls frame at top
        self.controls_frame = ttk.Frame(self.frame)
        self.controls_frame.pack(fill='x', padx=5, pady=5)
        
        # Coin selection
        ttk.Label(self.controls_frame, text="Coin:").pack(side='left', padx=5)
        self.coin_var = tk.StringVar()
        coins = self.db_manager.get_available_coins()
        self.coin_dropdown = ttk.Combobox(self.controls_frame, textvariable=self.coin_var, values=coins)
        self.coin_dropdown.pack(side='left', padx=5)
        self.coin_dropdown.set(coins[0] if coins else '')
        
        # Update button
        update_btn = ttk.Button(self.controls_frame, text="Update", command=self.update_charts)
        update_btn.pack(side='left', padx=5)
        
        # Link frame at bottom (create before charts frame)
        self.link_frame = ttk.Frame(self.frame)
        self.link_frame.pack(side='bottom', fill='x', padx=5, pady=5)
        
        # URL Label with styling
        self.url_label = ttk.Label(
            self.link_frame, 
            text="", 
            foreground="blue", 
            cursor="hand2",
            font=('Arial', 10, 'underline')
        )
        self.url_label.pack(pady=10)
        self.url_label.bind("<Button-1>", lambda e: self.open_coingecko())
        
        # Charts frame (create after link frame)
        self.charts_frame = ttk.Frame(self.frame)
        self.charts_frame.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Initial URL update
        self.update_url_label()

    def update_url_label(self):
        """Update the URL label with current coin's CoinGecko link"""
        coin = self.coin_var.get()
        print(f"Current coin: {coin}")
        
        coin_names = self.db_manager.get_coin_names()
        print(f"Got coin names from DB: {coin_names}")
        
        if coin in coin_names:
            url = f"{COINGECKO_URL}{coin_names[coin]}"
            print(f"Constructed URL: {url}")
            self.url_label.configure(text=url)
        else:
            print(f"Coin {coin} not found in coin_names")
            self.url_label.configure(text="")

    def open_coingecko(self):
        """Open CoinGecko page for current coin"""
        coin = self.coin_var.get()
        print(f"Opening CoinGecko for coin: {coin}")
        
        coin_names = self.db_manager.get_coin_names()
        print(f"Got coin names from DB: {coin_names}")
        
        if coin in coin_names:
            url = f"{COINGECKO_URL}{coin_names[coin]}"
            print(f"Opening URL: {url}")
            webbrowser.open(url)
        else:
            print(f"Coin {coin} not found in coin_names")

    def update_charts(self):
        try:
            coin = self.coin_var.get()
            
            # Clear existing charts
            for widget in self.charts_frame.winfo_children():
                widget.destroy()
            
            # Get data and create charts
            df = self.db_manager.get_sentiment_data(coin)
            if not df.empty:
                canvas = self.chart_manager.create_sentiment_charts(df, coin, self.charts_frame)
                canvas.get_tk_widget().pack(fill='both', expand=True)
            
            # Update URL label
            self.update_url_label()
            
        except Exception as e:
            print(f"Error updating sentiment charts: {str(e)}")

    def get_frame(self):
        return self.frame

    def get_current_coin(self):
        return self.coin_var.get()

    def set_coin(self, coin):
        """Set the selected coin in the dropdown and update charts"""
        if hasattr(self, 'coin_var'):
            self.coin_var.set(coin)
            self.coin_dropdown.set(coin)  # Explicitly set the dropdown
            self.frame.update_idletasks()  # Force GUI update
            self.update_charts()  # Immediately update the charts
