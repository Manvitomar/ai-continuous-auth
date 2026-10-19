from pydantic import BaseModel, Field
from typing import List, Optional

class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code_base64: str
    backup_codes: List[str]

class TOTPVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)
    session_token: Optional[str] = None

class TOTPVerifyResponse(BaseModel):
    verified: bool
    message: str
    risk_score_reset: bool
    new_risk_score: float
