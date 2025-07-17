import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from scipy.stats import zscore
import joblib
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_and_preprocess_data(filepath):
    """Load and preprocess the dataset"""
    logger.info("Loading and preprocessing data...")
    
    # Load data
    df = pd.read_csv(filepath)
    
    # Convert datetime
    df["Date Time"] = pd.to_datetime(df["Date Time"], format="%d.%m.%Y %H:%M:%S")
    
    # Clean data
    df = df.drop_duplicates().ffill()
    
    # Downsample to hourly data (every 6th row)
    df = df.iloc[::6, :].reset_index(drop=True)
    
    return df

def prepare_features_target(df):
    """Select features and prepare target"""
    logger.info("Preparing features and target...")
    
    # Selected features
    features = ["p (mbar)", "T (degC)", "rh (%)", "wv (m/s)"]
    
    # Remove outliers using z-score (|z| < 3)
    z_scores = zscore(df[features])
    filter_mask = (np.abs(z_scores) < 3).all(axis=1)
    df = df[filter_mask]
    
    return df, features

def create_sequences(data, seq_length):
    """Create time-series sequences for LSTM"""
    logger.info(f"Creating sequences with length {seq_length}...")
    
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length, 1])  # Index 1 is temperature
    
    return np.array(X), np.array(y)

def build_model(input_shape):
    """Build LSTM model architecture"""
    logger.info("Building model architecture...")
    
    model = Sequential([
        Bidirectional(LSTM(100, return_sequences=True, input_shape=input_shape)),
        Dropout(0.1),
        LSTM(50, return_sequences=False),
        Dropout(0.1),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model

def train_baselines(X_train, y_train, X_test, y_test):
    """Train and evaluate baseline models"""
    logger.info("Training baseline models...")
    
    # Moving Average Baseline
    y_pred_ma = np.array([np.mean(y_train[-144:])] * len(y_test))
    mae_ma = mean_absolute_error(y_test, y_pred_ma)
    
    # Linear Regression Baseline
    lr_model = LinearRegression()
    X_train_flat = X_train.mean(axis=1)
    X_test_flat = X_test.mean(axis=1)
    
    lr_model.fit(X_train_flat, y_train)
    y_pred_lr = lr_model.predict(X_test_flat)
    mae_lr = mean_absolute_error(y_test, y_pred_lr)
    
    return mae_ma, mae_lr

def main():
    # Data pipeline
    df = load_and_preprocess_data("jena_climate_2009_2016.csv")
    df_clean, features = prepare_features_target(df)
    
    # Scale features
    feature_scaler = MinMaxScaler()
    scaled_features = feature_scaler.fit_transform(df_clean[features])
    joblib.dump(feature_scaler, 'feature_scaler.pkl')
    
    # Scale target (temperature)
    target_scaler = MinMaxScaler()
    scaled_target = target_scaler.fit_transform(df_clean["T (degC)"].values.reshape(-1, 1))
    joblib.dump(target_scaler, 'target_scaler.pkl')
    
    # Create sequences
    sequence_length = 144
    X, y = create_sequences(scaled_features, sequence_length)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )
    
    # Build and train LSTM model
    model = build_model((sequence_length, len(features)))
    
    early_stopping = EarlyStopping(
        monitor='val_mae',
        patience=5,
        restore_best_weights=True,
        mode='min'
    )
    
    history = model.fit(
        X_train, y_train,
        epochs=20,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stopping],
        verbose=1
    )
    
    # Save model
    model.save_weights("lstm_model.weights.h5")
    
    # Evaluate LSTM
    lstm_loss, lstm_mae = model.evaluate(X_test, y_test)
    
    # Evaluate baselines
    mae_ma, mae_lr = train_baselines(X_train, y_train, X_test, y_test)
    
    # Print results
    print("\nModel Performance Comparison:")
    print(f"LSTM Model MAE: {lstm_mae:.4f}")
    print(f"Moving Average Baseline MAE: {mae_ma:.4f}")
    print(f"Linear Regression Baseline MAE: {mae_lr:.4f}")

if __name__ == "__main__":
    main()