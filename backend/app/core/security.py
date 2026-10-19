import datetime
from typing import Optional, List
import bcrypt
import jwt
import pyotp
import qrcode
import io
import base64
from app.config import settings

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with standard salt rounds."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a cryptographically signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# ==================== TOTP Multi-Factor Authentication Helpers ====================

def generate_totp_secret() -> str:
    """Generate a base32 TOTP secret."""
    return pyotp.random_base32()

def get_totp_uri(secret: str, username: str) -> str:
    """Generate the otpauth:// URI for authenticator applications."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name="AI Continuous Auth")

def generate_qr_code_base64(uri: str) -> str:
    """Generate a PNG QR code encoded as a Base64 data URL."""
    qr = qrcode.QRCode(
        version=1,
        box_size=8,
        border=3
    )
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a 6-digit TOTP code with standard 30s window and 1-step tolerance."""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    # valid_window=1 allows 30s drift backwards or forwards
    return totp.verify(code.strip(), valid_window=1)
