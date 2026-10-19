import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class BiometricProfile(Base):
    __tablename__ = "biometric_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    model_version = Column(Integer, default=1)
    model_path = Column(String(255), nullable=False)
    scaler_path = Column(String(255), nullable=False)
    
    samples_count = Column(Integer, default=0)
    baseline_metrics = Column(Text, nullable=True)  # JSON summary of baseline feature statistics
    evaluation_metrics = Column(Text, nullable=True) # JSON evaluation benchmark metrics
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="biometric_profiles")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("user_sessions.id"), nullable=True)
    
    risk_score = Column(Float, nullable=False)
    raw_anomaly_score = Column(Float, nullable=False)
    risk_status = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH
    
    features_snapshot = Column(Text, nullable=False)   # JSON object of extracted numerical features
    explanations = Column(Text, nullable=True)         # JSON list of top deviation attributions
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="telemetry_logs")
