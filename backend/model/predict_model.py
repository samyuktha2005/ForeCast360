import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import SimpleRNN, Dense, Dropout
import os

# Define Model Structure
def get_model():
    model = Sequential([
        SimpleRNN(50, return_sequences=True, input_shape=(144, 4)),
        Dropout(0.2),
        SimpleRNN(50, return_sequences=False),
        Dropout(0.2),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model

# Load trained model
def predict_weather(input_data):
    model = get_model()
    
    if os.path.exists("rnn_model.h5"):
        model.load_weights("rnn_model.h5")
    else:
        return {"error": "Model has not been trained yet!"}

    input_data = np.array(input_data).reshape(1, 144, 4)  # Ensure shape is correct
    prediction = model.predict(input_data)[0][0]
    
    return {"temperature_prediction": float(prediction)}

if __name__ == "__main__":
    # Test prediction
    sample_input = np.random.rand(144, 4).tolist()
    print(predict_weather(sample_input))
