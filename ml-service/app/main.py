from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api.routes import router as prediction_router
from app.api.timetable_routes import router as timetable_router
from app.models.dropout_model import DropoutPredictor
from app.predictor import set_predictor, get_predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = os.environ.get("MODEL_PATH", "trained_models/dropout_classifier.pkl")
    pred = DropoutPredictor()
    if os.path.exists(model_path):
        pred.load(model_path)
        print(f"Loaded model from {model_path}")
    else:
        print(f"No pre-trained model found at {model_path}. Using untrained predictor.")
    set_predictor(pred)
    yield
    set_predictor(None)
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
    try:
        p = get_predictor()
        model_loaded = p.is_trained
    except RuntimeError:
        model_loaded = False
    return {"status": "healthy", "model_loaded": model_loaded}


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


