"""Shared predictor instance for dropout risk prediction."""
from app.models.dropout_model import DropoutPredictor

predictor: DropoutPredictor | None = None


def get_predictor() -> DropoutPredictor:
    if predictor is None:
        raise RuntimeError("Predictor not initialized")
    return predictor


def set_predictor(p: DropoutPredictor | None) -> None:
    global predictor
    predictor = p
