from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np

from app.features.feature_engineering import extract_student_features
from app.predictor import get_predictor

router = APIRouter()


class StudentFeatures(BaseModel):
    student_id: str
    attendance_rate: float = Field(..., ge=0, le=100, description="Attendance rate percentage")
    average_grade: float = Field(..., ge=0, le=100, description="Average grade percentage")
    grade_trend: float = Field(..., ge=-100, le=100, description="Grade trend slope")
    absence_streak: int = Field(..., ge=0, description="Maximum consecutive absences")
    late_count: int = Field(..., ge=0, description="Total late arrivals")
    fee_payment_status: int = Field(..., ge=0, le=2, description="0=overdue, 1=partial, 2=paid")
    parent_engagement: float = Field(..., ge=0, le=100, description="Parent engagement score")
    days_since_enrollment: int = Field(..., ge=0, description="Days since enrollment")


class RiskPrediction(BaseModel):
    student_id: str
    risk_score: float
    risk_level: str
    contributing_factors: List[str]


class BatchPredictionRequest(BaseModel):
    students: List[StudentFeatures]


class BatchPredictionResponse(BaseModel):
    predictions: List[RiskPrediction]
    total_high_risk: int
    total_medium_risk: int
    total_low_risk: int


@router.post("/dropout-risk", response_model=RiskPrediction)
async def predict_dropout_risk(data: StudentFeatures):
    """Predict dropout risk for a single student."""
    try:
        predictor = get_predictor()
        features = extract_student_features(data.model_dump())
        prediction = predictor.predict_risk(features)
        
        return RiskPrediction(
            student_id=data.student_id,
            risk_score=prediction["risk_score"],
            risk_level=prediction["risk_level"],
            contributing_factors=prediction["contributing_factors"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """Predict dropout risk for multiple students."""
    try:
        predictor = get_predictor()
        predictions = []
        
        for student in request.students:
            features = extract_student_features(student.model_dump())
            prediction = predictor.predict_risk(features)
            
            predictions.append(RiskPrediction(
                student_id=student.student_id,
                risk_score=prediction["risk_score"],
                risk_level=prediction["risk_level"],
                contributing_factors=prediction["contributing_factors"],
            ))
        
        high_risk = sum(1 for p in predictions if p.risk_level == "HIGH")
        medium_risk = sum(1 for p in predictions if p.risk_level == "MEDIUM")
        low_risk = sum(1 for p in predictions if p.risk_level == "LOW")
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_high_risk=high_risk,
            total_medium_risk=medium_risk,
            total_low_risk=low_risk,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TrainingData(BaseModel):
    features: List[List[float]]
    labels: List[int]


class TrainingResponse(BaseModel):
    success: bool
    accuracy: float
    message: str


@router.post("/train", response_model=TrainingResponse)
async def train_model(data: TrainingData):
    """Train the dropout prediction model with new data."""
    try:
        predictor = get_predictor()
        X = np.array(data.features)
        y = np.array(data.labels)
        
        if len(X) < 10:
            raise HTTPException(
                status_code=400,
                detail="At least 10 training samples required"
            )
        
        result = predictor.train(X, y)
        predictor.save("trained_models/dropout_classifier.pkl")
        
        return TrainingResponse(
            success=True,
            accuracy=result["accuracy"],
            message=f"Model trained successfully with {len(X)} samples",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
