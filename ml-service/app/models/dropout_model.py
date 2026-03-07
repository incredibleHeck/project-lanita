import numpy as np
import joblib
import os
from typing import Dict, Any, List, Optional
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.features.feature_engineering import (
    identify_risk_factors,
    get_feature_importance_names,
    FEATURE_NAMES,
)


class DropoutPredictor:
    """
    Machine learning model for predicting student dropout risk.
    Uses Gradient Boosting Classifier trained on student metrics.
    """
    
    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self._default_importances = np.array([
            0.25,  # attendance_rate
            0.20,  # average_grade
            0.15,  # grade_trend
            0.12,  # absence_streak
            0.08,  # late_count
            0.10,  # fee_payment_status
            0.07,  # parent_engagement
            0.03,  # days_since_enrollment
        ])
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """
        Train the dropout prediction model.
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Target labels (0 = not at risk, 1 = at risk)
            
        Returns:
            Dictionary with training metrics
        """
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        train_accuracy = self.model.score(X_train_scaled, y_train)
        test_accuracy = self.model.score(X_test_scaled, y_test)
        
        return {
            "accuracy": test_accuracy,
            "train_accuracy": train_accuracy,
            "n_samples": len(X),
            "n_features": X.shape[1],
        }
    
    def predict_risk(self, features: np.ndarray) -> Dict[str, Any]:
        """
        Predict dropout risk for a student.
        
        Args:
            features: Feature array for a single student (1, n_features)
            
        Returns:
            Dictionary with risk score, level, and contributing factors
        """
        if self.is_trained:
            features_scaled = self.scaler.transform(features)
            proba = self.model.predict_proba(features_scaled)[0]
            risk_score = float(proba[1])
            feature_importances = self.model.feature_importances_
        else:
            risk_score = self._calculate_heuristic_risk(features)
            feature_importances = self._default_importances
        
        if risk_score > 0.7:
            risk_level = "HIGH"
        elif risk_score > 0.4:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        contributing_factors = identify_risk_factors(
            features,
            feature_importances,
            top_n=3,
        )
        
        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "contributing_factors": contributing_factors,
        }
    
    def _calculate_heuristic_risk(self, features: np.ndarray) -> float:
        """
        Calculate risk score using rule-based heuristics when model is not trained.
        """
        attendance = features[0, 0]
        grades = features[0, 1]
        trend = features[0, 2]
        absence_streak = features[0, 3]
        late_count = features[0, 4]
        fee_status = features[0, 5]
        parent_engagement = features[0, 6]
        
        risk_score = 0.0
        
        if attendance < 60:
            risk_score += 0.3
        elif attendance < 75:
            risk_score += 0.15
        elif attendance < 85:
            risk_score += 0.05
        
        if grades < 40:
            risk_score += 0.25
        elif grades < 50:
            risk_score += 0.15
        elif grades < 60:
            risk_score += 0.08
        
        if trend < -15:
            risk_score += 0.2
        elif trend < -5:
            risk_score += 0.1
        
        if absence_streak > 10:
            risk_score += 0.15
        elif absence_streak > 5:
            risk_score += 0.08
        
        if late_count > 20:
            risk_score += 0.05
        
        if fee_status == 0:
            risk_score += 0.1
        elif fee_status == 1:
            risk_score += 0.05
        
        if parent_engagement < 20:
            risk_score += 0.08
        elif parent_engagement < 40:
            risk_score += 0.04
        
        return min(risk_score, 1.0)
    
    def get_feature_importances(self) -> Dict[str, float]:
        """Get feature importance scores."""
        if self.is_trained:
            importances = self.model.feature_importances_
        else:
            importances = self._default_importances
        
        return dict(zip(FEATURE_NAMES, importances))
    
    def save(self, path: str) -> None:
        """Save the trained model to disk."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "is_trained": self.is_trained,
        }
        joblib.dump(model_data, path)
    
    def load(self, path: str) -> None:
        """Load a trained model from disk."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        
        model_data = joblib.load(path)
        self.model = model_data["model"]
        self.scaler = model_data["scaler"]
        self.is_trained = model_data["is_trained"]


def generate_synthetic_training_data(n_samples: int = 1000) -> tuple:
    """
    Generate synthetic training data for initial model training.
    Used for bootstrapping when real data is not available.
    """
    np.random.seed(42)
    
    normal_students = n_samples // 2
    at_risk_students = n_samples - normal_students
    
    normal_X = np.column_stack([
        np.random.normal(85, 10, normal_students),     # attendance
        np.random.normal(65, 15, normal_students),     # grades
        np.random.normal(5, 10, normal_students),      # trend
        np.random.randint(0, 3, normal_students),      # absence_streak
        np.random.randint(0, 10, normal_students),     # late_count
        np.random.choice([1, 2], normal_students),     # fee_status
        np.random.normal(60, 20, normal_students),     # parent_engagement
        np.random.randint(30, 500, normal_students),   # days_enrolled
    ])
    normal_y = np.zeros(normal_students)
    
    at_risk_X = np.column_stack([
        np.random.normal(55, 15, at_risk_students),    # attendance
        np.random.normal(40, 15, at_risk_students),    # grades
        np.random.normal(-10, 15, at_risk_students),   # trend
        np.random.randint(3, 15, at_risk_students),    # absence_streak
        np.random.randint(5, 30, at_risk_students),    # late_count
        np.random.choice([0, 1], at_risk_students),    # fee_status
        np.random.normal(25, 15, at_risk_students),    # parent_engagement
        np.random.randint(30, 500, at_risk_students),  # days_enrolled
    ])
    at_risk_y = np.ones(at_risk_students)
    
    X = np.vstack([normal_X, at_risk_X])
    y = np.concatenate([normal_y, at_risk_y])
    
    X[:, 0] = np.clip(X[:, 0], 0, 100)
    X[:, 1] = np.clip(X[:, 1], 0, 100)
    X[:, 2] = np.clip(X[:, 2], -50, 50)
    X[:, 5] = np.clip(X[:, 5], 0, 2).astype(int)
    X[:, 6] = np.clip(X[:, 6], 0, 100)
    
    shuffle_idx = np.random.permutation(len(X))
    return X[shuffle_idx], y[shuffle_idx]
