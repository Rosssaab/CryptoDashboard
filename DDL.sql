USE [CryptoAiDb]
GO
/****** Object:  UserDefinedFunction [dbo].[fn_GetCurrentPrice]    Script Date: 21/12/2024 10:08:07 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Create function to get current price
CREATE   FUNCTION [dbo].[fn_GetCurrentPrice](@coin_id int)
RETURNS decimal(18,8)
AS
BEGIN
   DECLARE @current_price decimal(18,8)
    SELECT TOP 1 @current_price = price_usd
   FROM price_data
   WHERE coin_id = @coin_id
   ORDER BY timestamp DESC
    RETURN ISNULL(@current_price, 0)
END
GO
/****** Object:  Table [dbo].[chat_source]    Script Date: 21/12/2024 10:08:07 ******/
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
/****** Object:  Table [dbo].[chat_data]    Script Date: 21/12/2024 10:08:07 ******/
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
/****** Object:  Table [dbo].[Coins]    Script Date: 21/12/2024 10:08:07 ******/
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
/****** Object:  View [dbo].[ChatView]    Script Date: 21/12/2024 10:08:07 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[ChatView]
AS
SELECT        dbo.Coins.symbol, dbo.chat_source.source_id, dbo.chat_data.[content], dbo.chat_data.sentiment_score, dbo.chat_source.source_name
FROM            dbo.chat_data INNER JOIN
                         dbo.chat_source ON dbo.chat_data.source_id = dbo.chat_source.source_id INNER JOIN
                         dbo.Coins ON dbo.chat_data.coin_id = dbo.Coins.coin_id
GO
/****** Object:  Table [dbo].[Price_Data]    Script Date: 21/12/2024 10:08:07 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Price_Data](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[coin_id] [int] NULL,
	[price_date] [datetime] NULL,
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
/****** Object:  Table [dbo].[predictions]    Script Date: 21/12/2024 10:08:07 ******/
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
/****** Object:  View [dbo].[vw_predictions]    Script Date: 21/12/2024 10:08:07 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Update the view to use the function
CREATE   VIEW [dbo].[vw_predictions] AS
SELECT 
   p.prediction_date AS PredictionDate,
   c.symbol AS Symbol,
   p.current_price AS [Price When Predicted],
   (
       SELECT TOP 1 pd.price_usd
       FROM price_data pd
       WHERE pd.coin_id = p.coin_id
       ORDER BY pd.price_date DESC
   ) AS [Price Now],
   p.prediction_24h AS [Prediction 24h],
   (
       SELECT TOP 1 pd.price_usd
       FROM price_data pd
       WHERE pd.coin_id = p.coin_id 
         AND pd.price_date >= DATEADD(HOUR, 24, p.prediction_date)
       ORDER BY pd.price_date ASC
   ) AS [Actual 24h],
   p.prediction_7d AS [Predicted 7d],
   (
       SELECT TOP 1 pd.price_usd
       FROM price_data pd
       WHERE pd.coin_id = p.coin_id 
         AND pd.price_date >= DATEADD(DAY, 7, p.prediction_date)
       ORDER BY pd.price_date ASC
   ) AS [Actual 7d],
   p.prediction_30d AS [Pred 30d],
   (
       SELECT TOP 1 pd.price_usd
       FROM price_data pd
       WHERE pd.coin_id = p.coin_id 
         AND pd.price_date >= DATEADD(DAY, 30, p.prediction_date)
       ORDER BY pd.price_date ASC
   ) AS [Actual 30d],
   p.prediction_90d AS [Pred 90d],
   (
       SELECT TOP 1 pd.price_usd
       FROM price_data pd
       WHERE pd.coin_id = p.coin_id 
         AND pd.price_date >= DATEADD(DAY, 90, p.prediction_date)
       ORDER BY pd.price_date ASC
   ) AS [Actual 90d],
   p.market_conditions AS Sentiment,
   p.confidence_score AS Confidence,
   p.accuracy_score AS Accuracy
FROM predictions p
INNER JOIN Coins c ON p.coin_id = c.coin_id
GO
/****** Object:  Table [dbo].[model_performance_metrics]    Script Date: 21/12/2024 10:08:07 ******/
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
/****** Object:  Table [dbo].[prediction_feature_importance]    Script Date: 21/12/2024 10:08:07 ******/
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
ALTER TABLE [dbo].[chat_data]  WITH CHECK ADD FOREIGN KEY([source_id])
REFERENCES [dbo].[chat_source] ([source_id])
GO
ALTER TABLE [dbo].[chat_data]  WITH CHECK ADD FOREIGN KEY([source_id])
REFERENCES [dbo].[chat_source] ([source_id])
GO
ALTER TABLE [dbo].[prediction_feature_importance]  WITH CHECK ADD FOREIGN KEY([prediction_id])
REFERENCES [dbo].[predictions] ([prediction_id])
GO
ALTER TABLE [dbo].[prediction_feature_importance]  WITH CHECK ADD FOREIGN KEY([prediction_id])
REFERENCES [dbo].[predictions] ([prediction_id])
GO
ALTER TABLE [dbo].[prediction_feature_importance]  WITH CHECK ADD FOREIGN KEY([prediction_id])
REFERENCES [dbo].[predictions] ([prediction_id])
GO
ALTER TABLE [dbo].[predictions]  WITH CHECK ADD FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[predictions]  WITH CHECK ADD FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[predictions]  WITH CHECK ADD FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[Price_Data]  WITH CHECK ADD  CONSTRAINT [FK_Price_Data_Coins] FOREIGN KEY([coin_id])
REFERENCES [dbo].[Coins] ([coin_id])
GO
ALTER TABLE [dbo].[Price_Data] CHECK CONSTRAINT [FK_Price_Data_Coins]
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "chat_data"
            Begin Extent = 
               Top = 6
               Left = 38
               Bottom = 257
               Right = 213
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "chat_source"
            Begin Extent = 
               Top = 180
               Left = 285
               Bottom = 343
               Right = 455
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "Coins"
            Begin Extent = 
               Top = 116
               Left = 583
               Bottom = 315
               Right = 753
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 9
         Width = 284
         Width = 1500
         Width = 1500
         Width = 5280
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'ChatView'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'ChatView'
GO
