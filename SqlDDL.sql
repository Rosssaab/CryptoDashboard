USE [CryptoAiDb]
GO
/****** Object:  Table [dbo].[chat_data]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chat_data](
	[chat_id] [int] IDENTITY(1,1) NOT NULL,
	[timestamp] [datetime] NOT NULL,
	[coin_id] [int] NOT NULL,
	[source_id] [int] NOT NULL,
	[content] [text] NULL,
	[sentiment_score] [decimal](5, 2) NULL,
	[sentiment_label] [varchar](20) NULL,
	[url] [varchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[chat_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[chat_source]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chat_source](
	[source_id] [int] IDENTITY(1,1) NOT NULL,
	[source_name] [varchar](50) NOT NULL,
	[api_base_url] [varchar](255) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[source_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[source_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Coins]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Coins](
	[coin_id] [int] IDENTITY(1,1) NOT NULL,
	[symbol] [varchar](20) NOT NULL,
	[full_name] [varchar](100) NULL,
	[description] [varchar](100) NULL,
 CONSTRAINT [PK_Coins] PRIMARY KEY CLUSTERED 
(
	[coin_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[model_performance_metrics]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[model_performance_metrics](
	[metric_id] [int] IDENTITY(1,1) NOT NULL,
	[model_version] [varchar](50) NULL,
	[evaluation_date] [datetime] NULL,
	[mae_24h] [decimal](18, 8) NULL,
	[mae_7d] [decimal](18, 8) NULL,
	[mae_30d] [decimal](18, 8) NULL,
	[mae_90d] [decimal](18, 8) NULL,
	[rmse_24h] [decimal](18, 8) NULL,
	[rmse_7d] [decimal](18, 8) NULL,
	[rmse_30d] [decimal](18, 8) NULL,
	[rmse_90d] [decimal](18, 8) NULL,
	[r2_score] [decimal](10, 4) NULL,
	[sample_size] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[metric_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[prediction_feature_importance]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[prediction_feature_importance](
	[feature_id] [int] IDENTITY(1,1) NOT NULL,
	[prediction_id] [int] NULL,
	[feature_name] [varchar](100) NULL,
	[importance_score] [decimal](10, 4) NULL,
PRIMARY KEY CLUSTERED 
(
	[feature_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[predictions]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[predictions](
	[prediction_id] [int] IDENTITY(1,1) NOT NULL,
	[coin_id] [int] NULL,
	[prediction_date] [datetime] NULL,
	[current_price] [decimal](18, 8) NULL,
	[prediction_24h] [decimal](18, 8) NULL,
	[prediction_7d] [decimal](18, 8) NULL,
	[prediction_30d] [decimal](18, 8) NULL,
	[prediction_90d] [decimal](18, 8) NULL,
	[sentiment_score] [decimal](5, 2) NULL,
	[confidence_score] [decimal](5, 2) NULL,
	[actual_price_24h] [decimal](18, 8) NULL,
	[actual_price_7d] [decimal](18, 8) NULL,
	[actual_price_30d] [decimal](18, 8) NULL,
	[actual_price_90d] [decimal](18, 8) NULL,
	[accuracy_score] [decimal](5, 2) NULL,
	[features_used] [varchar](max) NULL,
	[model_version] [varchar](50) NULL,
	[training_window_days] [int] NULL,
	[data_points_count] [int] NULL,
	[market_conditions] [varchar](50) NULL,
	[volatility_index] [decimal](10, 2) NULL,
	[prediction_error_24h] [decimal](18, 8) NULL,
	[prediction_error_7d] [decimal](18, 8) NULL,
	[prediction_error_30d] [decimal](18, 8) NULL,
	[prediction_error_90d] [decimal](18, 8) NULL,
	[model_parameters] [varchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[prediction_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Price_Data]    Script Date: 19/12/2024 00:24:18 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Price_Data](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[coin_id] [int] NULL,
	[timestamp] [datetime] NULL,
	[price_usd] [decimal](18, 8) NULL,
	[volume_24h] [decimal](18, 2) NULL,
	[price_change_24h] [decimal](18, 2) NULL,
	[data_source] [varchar](50) NULL,
 CONSTRAINT [PK__price_da__3213E83F0179090B] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[chat_source] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[predictions] ADD  DEFAULT (getdate()) FOR [prediction_date]
GO
ALTER TABLE [dbo].[chat_data]  WITH CHECK ADD  CONSTRAINT [FK__chat_data__coin___4AB81AF0] FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[chat_data] CHECK CONSTRAINT [FK__chat_data__coin___4AB81AF0]
GO
ALTER TABLE [dbo].[chat_data]  WITH CHECK ADD FOREIGN KEY([source_id])
REFERENCES [dbo].[chat_source] ([source_id])
GO
ALTER TABLE [dbo].[prediction_feature_importance]  WITH CHECK ADD FOREIGN KEY([prediction_id])
REFERENCES [dbo].[predictions] ([prediction_id])
GO
ALTER TABLE [dbo].[predictions]  WITH CHECK ADD FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[Price_Data]  WITH CHECK ADD  CONSTRAINT [FK_Price_Data_Coins] FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[Price_Data] CHECK CONSTRAINT [FK_Price_Data_Coins]
GO
