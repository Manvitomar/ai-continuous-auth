from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import datetime
from app.schemas.biometric import BiometricFeatureVector

class FeatureAnomalyExplanation(BaseModel):
    feature_name: str
    feature_label: str
    observed_value: float
    baseline_mean: float
    deviation_z_score: float
    direction: str  # HIGHER or LOWER
    severity: str   # CRITICAL, WARNING, NORMAL
    description: str

class TelemetryEvaluationRequest(BaseModel):
    features: BiometricFeatureVector
    session_token: Optional[str] = None
    is_simulation: bool = False
    simulation_label: Optional[str] = None

class TelemetryEvaluationResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Calibrated risk score between 0 and 100")
    raw_anomaly_score: float = Field(..., description="Raw Isolation Forest decision function output")
    risk_status: str  # LOW, MEDIUM, HIGH
    is_mfa_required: bool
    is_session_locked: bool
    explanations: List[FeatureAnomalyExplanation]
    session_token: Optional[str] = None
    timestamp: datetime.datetime

class SensitiveActionRequest(BaseModel):
    action_type: str = Field(..., example="WIRE_TRANSFER")
    amount: Optional[float] = 0.0
    target: Optional[str] = None
    session_token: Optional[str] = None
    threshold: Optional[float] = None

class SensitiveActionResponse(BaseModel):
    success: bool
    status: str
    message: str
    risk_score_at_execution: float
    requires_step_up_mfa: bool
    transaction_id: Optional[str] = None
