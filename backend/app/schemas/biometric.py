from pydantic import BaseModel, Field
from typing import List, Optional

class BiometricFeatureVector(BaseModel):
    """
    Strict numerical behavioral features.
    Zero-content guarantee: NO raw keys, strings, or text coordinates are stored.
    """
    # Keystroke dynamics (timing only)
    mean_hold_time: float = Field(..., ge=0.0, description="Average key hold time in ms")
    std_hold_time: float = Field(..., ge=0.0, description="Variance in key hold time in ms")
    mean_flight_time: float = Field(..., ge=0.0, description="Average key-to-key latency in ms")
    std_flight_time: float = Field(..., ge=0.0, description="Variance in key flight latency in ms")
    typing_speed_cpm: float = Field(..., ge=0.0, description="Estimated characters per minute")
    pause_ratio: float = Field(..., ge=0.0, le=1.0, description="Ratio of inter-word pauses (>400ms)")

    # Mouse kinematics (dynamics only)
    mean_velocity: float = Field(..., ge=0.0, description="Average cursor velocity px/ms")
    max_velocity: float = Field(..., ge=0.0, description="Maximum cursor velocity px/ms")
    mean_acceleration: float = Field(..., ge=0.0, description="Average cursor acceleration px/ms^2")
    mean_jerk: float = Field(..., ge=0.0, description="Rate of acceleration change px/ms^3")
    curvature_ratio: float = Field(..., ge=1.0, description="Trajectory curve length / straight distance")
    mean_click_duration: float = Field(..., ge=0.0, description="Average duration of click hold in ms")

    # High-level interaction cadence
    movement_to_click_ratio: float = Field(..., ge=0.0, description="Mouse moves per click event")
    scroll_intensity: float = Field(..., ge=0.0, description="Scroll delta pixels per second")

    # High-discriminant biometric enhancements
    keystroke_overlap_ratio: Optional[float] = Field(0.35, ge=0.0, le=1.0, description="Ratio of overlapped consecutive key presses")
    flight_time_cv: Optional[float] = Field(0.22, ge=0.0, description="Coefficient of variation in flight time")

    def to_vector(self) -> List[float]:
        """Convert features to an ordered numerical vector for ML model inference."""
        return [
            self.mean_hold_time,
            self.std_hold_time,
            self.mean_flight_time,
            self.std_flight_time,
            self.typing_speed_cpm,
            self.pause_ratio,
            self.mean_velocity,
            self.max_velocity,
            self.mean_acceleration,
            self.mean_jerk,
            self.curvature_ratio,
            self.mean_click_duration,
            self.movement_to_click_ratio,
            self.scroll_intensity,
            self.keystroke_overlap_ratio if self.keystroke_overlap_ratio is not None else 0.35,
            self.flight_time_cv if self.flight_time_cv is not None else 0.22
        ]

    @classmethod
    def feature_names(cls) -> List[str]:
        return [
            "mean_hold_time",
            "std_hold_time",
            "mean_flight_time",
            "std_flight_time",
            "typing_speed_cpm",
            "pause_ratio",
            "mean_velocity",
            "max_velocity",
            "mean_acceleration",
            "mean_jerk",
            "curvature_ratio",
            "mean_click_duration",
            "movement_to_click_ratio",
            "scroll_intensity",
            "keystroke_overlap_ratio",
            "flight_time_cv"
        ]

class EnrollmentSubmission(BaseModel):
    samples: List[BiometricFeatureVector] = Field(..., min_length=10, description="At least 10 enrollment feature windows")

class EnrollmentResponse(BaseModel):
    status: str
    message: str
    samples_enrolled: int
    model_version: int
    baseline_summary: dict
