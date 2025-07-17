#!/usr/bin/env python
# coding: utf-8


# In[3]:


import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import SimpleRNN, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, r2_score
from scipy.stats import zscore
from sklearn.linear_model import LinearRegression

# ==============================
# DATA LOADING & PREPROCESSING
# ==============================

# Load dataset
df = pd.read_csv("jena_climate_2009_2016.csv")

# Convert "Date Time" to datetime format
df["Date Time"] = pd.to_datetime(df["Date Time"], format="%d.%m.%Y %H:%M:%S")

# Drop duplicate rows if any
df = df.drop_duplicates()

# Fill missing values (forward fill method)
df.fillna(method='ffill', inplace=True)

# Downsample the dataset (taking every 6th row to get hourly readings)
df_downsampled = df.iloc[::6, :].reset_index(drop=True)

# Select key features
selected_features = ["p (mbar)", "T (degC)", "rh (%)", "wv (m/s)"]

# Remove outliers using z-score method
df_downsampled = df_downsampled[(np.abs(zscore(df_downsampled[selected_features])) < 3).all(axis=1)]

# Normalize selected features
scaler = MinMaxScaler()
df_downsampled[selected_features] = scaler.fit_transform(df_downsampled[selected_features])

# ==============================
# SEQUENCE CREATION FOR RNN
# ==============================

def create_sequences(data, seq_length):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length, 1])  # Predicting temperature (T (degC))
    return np.array(X), np.array(y)

sequence_length = 144  # Using past 144 hours (~6 days) to predict the next step
data = df_downsampled[selected_features].values
X, y = create_sequences(data, sequence_length)

# Split into training and testing sets (80% train, 20% test)
split_idx = int(0.8 * len(X))
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

# ==============================
# BUILDING & TRAINING RNN MODEL
# ==============================

rnn_model = Sequential([
    SimpleRNN(50, return_sequences=True, input_shape=(sequence_length, len(selected_features))),
    Dropout(0.2),
    SimpleRNN(50, return_sequences=False),
    Dropout(0.2),
    Dense(25, activation='relu'),
    Dense(1)
])

# Compile Model
rnn_model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# Train Model
history_rnn = rnn_model.fit(X_train, y_train, epochs=10, batch_size=64, validation_data=(X_test, y_test))
rnn_model.save_weights("rnn_model.h5")

# Evaluate Model
y_pred_rnn = rnn_model.predict(X_test)
mae_rnn = mean_absolute_error(y_test, y_pred_rnn)
r2_rnn = r2_score(y_test, y_pred_rnn)

print(f"Test MAE (RNN): {mae_rnn:.4f}")
print(f"R² Score (RNN): {r2_rnn:.4f}")

# ==============================
# BASELINE MODEL COMPARISON
# ==============================

# 1. Moving Average Baseline
y_pred_baseline = np.array([np.mean(y_train[-sequence_length:])] * len(y_test))
baseline_mae = mean_absolute_error(y_test, y_pred_baseline)

# 2. Linear Regression Baseline
lr_model = LinearRegression()
X_train_lr = np.mean(X_train, axis=1)  # Flatten time-series to single values
X_test_lr = np.mean(X_test, axis=1)

lr_model.fit(X_train_lr, y_train)
y_pred_lr = lr_model.predict(X_test_lr)

lr_mae = mean_absolute_error(y_test, y_pred_lr)
lr_r2 = r2_score(y_test, y_pred_lr)

# ==============================
# COMPARISON RESULTS
# ==============================
print("\nModel Performance Comparison:")
print(f"RNN Model MAE: {mae_rnn:.4f}, R² Score: {r2_rnn:.4f}")
print(f"Moving Average Baseline MAE: {baseline_mae:.4f}")
print(f"Linear Regression Baseline MAE: {lr_mae:.4f}, R² Score: {lr_r2:.4f}")

#Lower MAE → Better Predictions

#If LSTM MAE < RNN MAE, LSTM is more accurate.

#If RNN MAE < LSTM MAE, RNN is more accurate

