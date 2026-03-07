from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api.routes import router as prediction_router
from app.api.timetable_routes import router as timetable_router
from app.models.dropout_model import DropoutPredictor

predictor: DropoutPredictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    model_path = os.environ.get("MODEL_PATH", "trained_models/dropout_classifier.pkl")
    predictor = DropoutPredictor()
    
    if os.path.exists(model_path):
        predictor.load(model_path)
        print(f"Loaded model from {model_path}")
    else:
        print(f"No pre-trained model found at {model_path}. Using untrained predictor.")
    
    yield
    
    print("Shutting down ML service")


app = FastAPI(
    title="Lanita ML Service",
    description="Machine Learning microservice for Lanita School Management System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/predict", tags=["Predictions"])
app.include_router(timetable_router, prefix="/timetable", tags=["Timetable"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": predictor is not None and predictor.is_trained,
    }


@app.get("/")
async def root():
    return {
        "service": "Lanita ML Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "dropout_risk": "/predict/dropout-risk",
            "batch_predict": "/predict/batch",
            "timetable_generate": "/timetable/generate",
        },
    }


def get_predictor() -> DropoutPredictor:
    if predictor is None:
        raise RuntimeError("Predictor not initialized")
    return predictor
