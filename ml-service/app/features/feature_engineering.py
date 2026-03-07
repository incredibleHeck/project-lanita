import numpy as np
from typing import Dict, Any, List


FEATURE_NAMES = [
    "attendance_rate",
    "average_grade",
    "grade_trend",
    "absence_streak",
    "late_count",
    "fee_payment_status",
    "parent_engagement",
    "days_since_enrollment",
]


def extract_student_features(student_data: Dict[str, Any]) -> np.ndarray:
    """
    Extract ML features from student data dictionary.
    
    Args:
        student_data: Dictionary containing student metrics
        
    Returns:
        numpy array of features in the expected order
    """
    features = np.array([
        float(student_data.get("attendance_rate", 0)),
        float(student_data.get("average_grade", 0)),
        float(student_data.get("grade_trend", 0)),
        int(student_data.get("absence_streak", 0)),
        int(student_data.get("late_count", 0)),
        int(student_data.get("fee_payment_status", 2)),
        float(student_data.get("parent_engagement", 0)),
        int(student_data.get("days_since_enrollment", 0)),
    ])
    
    return features.reshape(1, -1)


def normalize_features(features: np.ndarray) -> np.ndarray:
    """
    Normalize features to 0-1 range based on expected ranges.
    """
    normalized = features.copy()
    
    ranges = {
        0: (0, 100),      # attendance_rate
        1: (0, 100),      # average_grade
        2: (-50, 50),     # grade_trend
        3: (0, 30),       # absence_streak
        4: (0, 50),       # late_count
        5: (0, 2),        # fee_payment_status
        6: (0, 100),      # parent_engagement
        7: (0, 1000),     # days_since_enrollment
    }
    
    for i, (min_val, max_val) in ranges.items():
        normalized[:, i] = (normalized[:, i] - min_val) / (max_val - min_val)
        normalized[:, i] = np.clip(normalized[:, i], 0, 1)
    
    return normalized


def compute_derived_features(features: np.ndarray) -> np.ndarray:
    """
    Compute additional derived features from base features.
    """
    attendance = features[:, 0]
    grades = features[:, 1]
    trend = features[:, 2]
    
    engagement_score = (attendance * 0.3 + grades * 0.4 + (trend + 50) * 0.3)
    
    return np.column_stack([features, engagement_score])


def get_feature_importance_names() -> List[str]:
    """Return human-readable feature names for model interpretation."""
    return [
        "Attendance Rate",
        "Academic Performance",
        "Grade Trend",
        "Absence Patterns",
        "Lateness",
        "Fee Payment",
        "Parent Engagement",
        "Time at School",
    ]


def identify_risk_factors(
    features: np.ndarray,
    feature_importances: np.ndarray,
    top_n: int = 3,
) -> List[str]:
    """
    Identify the top contributing factors to dropout risk.
    
    Args:
        features: Student feature array
        feature_importances: Model feature importances
        top_n: Number of top factors to return
        
    Returns:
        List of contributing factor names
    """
    risk_indicators = {
        0: lambda x: x < 75,      # Low attendance
        1: lambda x: x < 50,      # Poor grades
        2: lambda x: x < -10,     # Declining trend
        3: lambda x: x > 5,       # High absence streak
        4: lambda x: x > 10,      # Too many late arrivals
        5: lambda x: x < 2,       # Fee issues
        6: lambda x: x < 30,      # Low parent engagement
        7: lambda x: False,       # Days since enrollment (not a risk by itself)
    }
    
    factor_names = get_feature_importance_names()
    risk_factors = []
    
    weighted_risks = []
    for i in range(len(FEATURE_NAMES)):
        if risk_indicators[i](features[0, i]):
            weighted_risks.append((factor_names[i], feature_importances[i]))
    
    weighted_risks.sort(key=lambda x: -x[1])
    
    for name, _ in weighted_risks[:top_n]:
        risk_factors.append(name)
    
    while len(risk_factors) < top_n:
        sorted_importance = sorted(
            enumerate(feature_importances),
            key=lambda x: -x[1],
        )
        for idx, _ in sorted_importance:
            if factor_names[idx] not in risk_factors:
                risk_factors.append(factor_names[idx])
                if len(risk_factors) >= top_n:
                    break
    
    return risk_factors[:top_n]
