from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional,Input
import logging
from datetime import datetime
import os
import math
from fastapi.middleware.cors import CORSMiddleware

# ================ INITIALIZATION ================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ================ MODEL CONFIGURATION ================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = SCRIPT_DIR

# File paths
MODEL_FILES = {
    'weights': os.path.join(MODEL_DIR, "lstm_model.weights.h5"),
    'feature_scaler': os.path.join(MODEL_DIR, "feature_scaler.pkl"),
    'target_scaler': os.path.join(MODEL_DIR, "target_scaler.pkl")
}

# ================ GLOBALS ================
model = None
feature_scaler = None
target_scaler = None
model_ready = False

# ================ WEATHER FORMULAS ================
def calculate_vapor_pressure(T_degC: float) -> float:
    """Calculate saturation vapor pressure in mbar using Magnus formula"""
    return 6.112 * math.exp((17.67 * T_degC) / (T_degC + 243.5))

def calculate_dewpoint(T_degC: float, rh_percent: float) -> float:
    """Calculate dew point temperature in °C"""
    if rh_percent == 0:
        return -273.15  # Absolute zero as fallback
    vp = calculate_vapor_pressure(T_degC) * (rh_percent / 100)
    return (243.5 * math.log(vp / 6.112)) / (17.67 - math.log(vp / 6.112))

def calculate_relative_humidity(T_degC: float, Tdew_degC: float) -> float:
    """Calculate relative humidity in % from temperature and dew point"""
    e = calculate_vapor_pressure(Tdew_degC)
    es = calculate_vapor_pressure(T_degC)
    return min(100, max(0, (e / es) * 100))

def calculate_absolute_humidity(T_degC: float, rh_percent: float) -> float:
    """Calculate absolute humidity in g/m³"""
    vp = calculate_vapor_pressure(T_degC) * (rh_percent / 100)
    return (vp * 100) / (461.5 * (T_degC + 273.15)) * 1000

# ================ DATA MODELS ================
class WeatherDataPoint(BaseModel):
    Date_Time: str
    p_mbar: float = Field(..., alias="p (mbar)")
    T_degC: float = Field(..., alias="T (degC)")
    rh_percent: Optional[float] = Field(None, alias="rh (%)")
    wv_ms: float = Field(..., alias="wv (m/s)")
    Tdew_degC: Optional[float] = Field(None, alias="Tdew (degC)")
    VPmax_mbar: Optional[float] = Field(None, alias="VPmax (mbar)")
    VPact_mbar: Optional[float] = Field(None, alias="VPact (mbar)")
    VPdef_mbar: Optional[float] = Field(None, alias="VPdef (mbar)")

    class Config:
        allow_population_by_field_name = True

class PredictionRequest(BaseModel):
    weather_data: List[WeatherDataPoint]

class PredictionResponse(BaseModel):
    predicted_temperature: float
    confidence: float
    status: str
    features_used: List[str] = ["p (mbar)", "T (degC)", "rh (%)", "wv (m/s)"]
    
# ================ MODEL ARCHITECTURE ================
def create_model():
    # Explicitly define model architecture with input shape
    model = Sequential([
        Input(shape=(144, 4)),  # Add Input layer first
        Bidirectional(LSTM(100, return_sequences=True)),
        Dropout(0.1),
        LSTM(50, return_sequences=False),
        Dropout(0.1),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    return model

# Initialize and build model
model = create_model()

# Explicitly build the model with sample data shape
model.build(input_shape=(None, 144, 4))  # (batch_size, timesteps, features)

# Now load weights
model.load_weights("lstm_model.weights.h5")

# Verify architecture
model.summary()
# ================ CORE FUNCTIONS ================
def verify_model_files():
    """Check if all required model files exist"""
    missing_files = [name for name, path in MODEL_FILES.items() if not os.path.exists(path)]
    if missing_files:
        logger.error(f"Missing model files: {missing_files}")
        logger.info(f"Files in directory: {os.listdir(MODEL_DIR)}")
        return False
    return True

def load_artifacts():
    """Load model weights and scalers with comprehensive error handling"""
    global model, feature_scaler, target_scaler, model_ready
    
    try:
        if not verify_model_files():
            return False

        logger.info("Creating model architecture...")
        model = create_model()
        
        logger.info(f"Loading weights from {MODEL_FILES['weights']}")
        model.load_weights(MODEL_FILES['weights'])
        
        logger.info(f"Loading feature scaler from {MODEL_FILES['feature_scaler']}")
        feature_scaler = joblib.load(MODEL_FILES['feature_scaler'])
        
        logger.info(f"Loading target scaler from {MODEL_FILES['target_scaler']}")
        target_scaler = joblib.load(MODEL_FILES['target_scaler'])
        
        model_ready = True
        logger.info("All artifacts loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error loading artifacts: {str(e)}", exc_info=True)
        model_ready = False
        return False

def calculate_missing_fields(data_point):
    # Use .get() to safely access keys
    rh = data_point.get('rh_percent')
    Tdew = data_point.get('Tdew_degC')
    temp = data_point.get('temp_degC')
    pres = data_point.get('pres_hPa')
    
    # Check conditions with safe defaults
    if rh is None and Tdew is not None and temp is not None:
        # Calculate rh_percent if possible
        data_point['rh_percent'] = calculate_rh(Tdew, temp)
    if Tdew is None and rh is not None and temp is not None:
        # Calculate Tdew_degC if possible
        data_point['Tdew_degC'] = calculate_dewpoint(temp, rh)
    # Include similar checks for other fields...
    return data_point

def prepare_sequence(weather_points: List[WeatherDataPoint]):
    """Convert and validate input sequence"""
    processed_points = []
    calculated_fields = {}
    
    for i, point in enumerate(weather_points):
        point_dict = point.model_dump(by_alias=True)
        
        # Calculate any missing fields
        calculated = calculate_missing_fields(point_dict)
        if calculated:
            calculated_fields[i] = calculated
        
        processed_points.append(point_dict)
    
    # Convert to DataFrame
    df = pd.DataFrame(processed_points)
    
    # Ensure chronological order
    df['Date_Time'] = pd.to_datetime(df['Date_Time'])
    df = df.sort_values('Date_Time')
    
    # Select and scale features
    features = ["p (mbar)", "T (degC)", "rh (%)", "wv (m/s)"]
    scaled_data = feature_scaler.transform(df[features])
    
    # Reshape for LSTM (batch_size=1, timesteps=144, features=4)
    sequence = scaled_data.reshape(1, len(weather_points), len(features))
    
    return sequence, df.iloc[-1]['T (degC)'], calculated_fields

# ================ API ENDPOINTS ================
@app.on_event("startup")
async def startup_event():
    """Initialize model on application startup"""
    try:
        logger.info(f"Starting model initialization in {MODEL_DIR}")
        
        if not load_artifacts():
            raise RuntimeError("Failed to load model artifacts - check logs for details")
        
        # Warm up the model
        logger.info("Warming up model...")
        dummy_data = np.zeros((1, 144, 4))
        model.predict(dummy_data)
        logger.info("Model ready for predictions")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}", exc_info=True)
        raise RuntimeError("Application startup failed")

@app.options("/predict/")
async def predict_options():
    return {"message": "OK"}

@app.get("/health")
async def health_check():
    return {
        "status": "ready" if model_ready else "unhealthy",
        "model_ready": model_ready,
        "files_loaded": {name: os.path.exists(path) for name, path in MODEL_FILES.items()}
    }

@app.post("/predict/", response_model=PredictionResponse)
async def predict_temperature(request: PredictionRequest):
    try:
        if not model_ready:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Prepare input data
        sequence, last_temp, calculated_fields = prepare_sequence(request.weather_data)
        
        # Make prediction
        scaled_pred = model.predict(sequence)
        
        # Inverse transform prediction
        predicted_temp = target_scaler.inverse_transform(scaled_pred)[0][0]
        
        # Calculate confidence
        confidence = min(0.95, 0.7 + (0.002 * len(request.weather_data)))
        
        return {
            "predicted_temperature": float(predicted_temp),
            "actual_temperature": float(last_temp),
            "status": "success",
            "confidence": float(confidence),
            "calculated_fields": calculated_fields if calculated_fields else None
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction processing failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", reload=False)