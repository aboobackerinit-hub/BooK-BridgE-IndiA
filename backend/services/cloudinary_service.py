"""
Cloudinary image upload service.

Replaces Firebase Storage for all image operations.
All images are uploaded to Cloudinary and only the secure HTTPS URL is stored in Firestore.
"""
import logging
import uuid
import base64
from typing import Optional

logger = logging.getLogger("bookbridge.cloudinary")

# Lazy-initialized Cloudinary — avoids import failure if cloudinary is not installed yet
_cloudinary_configured = False


def _ensure_configured():
    """Initialize Cloudinary SDK with env vars (lazy, once)."""
    global _cloudinary_configured
    if _cloudinary_configured:
        return

    try:
        import cloudinary
        from backend.core.config import (
            CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET,
        )

        if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
            logger.warning(
                "Cloudinary credentials not fully configured. "
                "Image uploads will fall back to storing data URLs."
            )
            return

        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
        _cloudinary_configured = True
        logger.info("Cloudinary SDK configured successfully.")
    except ImportError:
        logger.error("cloudinary package not installed. Run: pip install cloudinary")
    except Exception as e:
        logger.error(f"Cloudinary configuration failed: {e}")


def upload_image(file_bytes: bytes, content_type: str, folder: str = "general") -> str:
    """
    Upload raw image bytes to Cloudinary.

    Args:
        file_bytes: Raw binary image data.
        content_type: MIME type (e.g., 'image/jpeg').
        folder: Cloudinary folder to organize uploads.

    Returns:
        Cloudinary secure HTTPS URL, or empty string on failure.
    """
    _ensure_configured()
    if not _cloudinary_configured:
        logger.warning("Cloudinary not configured; cannot upload image.")
        return ""

    try:
        import cloudinary.uploader

        result = cloudinary.uploader.upload(
            file_bytes,
            folder=f"bookbridge/{folder}",
            resource_type="image",
            unique_filename=True,
            overwrite=False,
            quality="auto",
            fetch_format="auto",
        )
        secure_url = result.get("secure_url", "")
        logger.info(f"Cloudinary upload success: {secure_url[:80]}...")
        return secure_url
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return ""


async def upload_fastapi_file(file, folder: str = "general") -> str:
    """
    Upload a FastAPI UploadFile to Cloudinary directly via stream.
    Validates MIME type and enforces size limits.
    """
    from fastapi import HTTPException
    
    # 1. Validate MIME type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported media type. Only JPEG, PNG, and WebP are allowed.")
        
    # 2. Enforce upload size limits
    # Profile images (avatars folder): 5 MB (5 * 1024 * 1024 bytes)
    # Book/Post images: 10 MB (10 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024 if folder == "avatars" else 10 * 1024 * 1024
    
    if hasattr(file, "size") and file.size is not None:
        if file.size > max_size:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB.")
    else:
        # Fallback if size attribute is missing
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > max_size:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB.")

    # 3. Stream to Cloudinary
    _ensure_configured()
    if not _cloudinary_configured:
        logger.warning("Cloudinary not configured; cannot upload image.")
        return ""

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"bookbridge/{folder}",
            resource_type="image",
            unique_filename=True,
            overwrite=False,
            quality="auto",
            fetch_format="auto",
        )
        secure_url = result.get("secure_url", "")
        logger.info(f"Cloudinary upload success: {secure_url[:80]}...")
        return secure_url
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return ""


def upload_base64_image(data_url: str, folder: str = "general") -> str:
    """
    Upload a base64 data URL to Cloudinary (backward compatibility).
    Enforces MIME type and size limits.
    """
    if not data_url:
        return data_url

    # Already a URL — return as-is
    if data_url.startswith("http://") or data_url.startswith("https://"):
        return data_url

    # Not a data URL — return as-is
    if not data_url.startswith("data:image/"):
        return data_url
        
    from fastapi import HTTPException
    
    # 1. Validate MIME type
    header = data_url.split(';')[0]
    mime_type = header.replace('data:', '')
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if mime_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported media type. Only JPEG, PNG, and WebP are allowed.")
        
    # 2. Enforce upload size limits
    # A base64 string length relates to byte size by: bytes = (len(string) * 3) / 4
    raw_b64 = data_url.split(',', 1)[-1] if ',' in data_url else data_url
    approx_size = (len(raw_b64) * 3) / 4
    max_size = 5 * 1024 * 1024 if folder == "avatars" else 10 * 1024 * 1024
    
    if approx_size > max_size:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB.")

    _ensure_configured()
    if not _cloudinary_configured:
        logger.warning("Cloudinary not configured; keeping base64 data URL.")
        return data_url

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            data_url,
            folder=f"bookbridge/{folder}",
            resource_type="image",
            unique_filename=True,
            overwrite=False,
            quality="auto",
            fetch_format="auto",
        )
        secure_url = result.get("secure_url", "")
        logger.info(f"Cloudinary base64 upload success: {secure_url[:80]}...")
        return secure_url
    except Exception as e:
        logger.error(f"Cloudinary base64 upload failed: {e}")
        return data_url


def delete_image(secure_url: str) -> bool:
    """
    Delete an image from Cloudinary by its secure URL.

    Args:
        secure_url: The Cloudinary secure URL of the image.

    Returns:
        True if deleted successfully, False otherwise.
    """
    if not secure_url or not secure_url.startswith("https://res.cloudinary.com"):
        return False

    _ensure_configured()
    if not _cloudinary_configured:
        return False

    try:
        import cloudinary.uploader

        # Extract public_id from URL
        # URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
        parts = secure_url.split("/upload/")
        if len(parts) < 2:
            return False

        path = parts[1]
        # Remove version prefix if present (v1234567890/)
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        # Remove file extension
        public_id = path.rsplit(".", 1)[0] if "." in path else path

        result = cloudinary.uploader.destroy(public_id)
        success = result.get("result") == "ok"
        if success:
            logger.info(f"Cloudinary delete success: {public_id}")
        else:
            logger.warning(f"Cloudinary delete returned: {result}")
        return success
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return False


def get_optimized_url(secure_url: str, width: Optional[int] = None, height: Optional[int] = None) -> str:
    """
    Generate an optimized Cloudinary URL with transformations.

    Args:
        secure_url: Original Cloudinary URL.
        width: Optional width constraint.
        height: Optional height constraint.

    Returns:
        Transformed URL with auto quality and format.
    """
    if not secure_url or "res.cloudinary.com" not in secure_url:
        return secure_url

    try:
        # Insert transformation parameters into the URL
        transforms = ["q_auto", "f_auto"]
        if width:
            transforms.append(f"w_{width}")
        if height:
            transforms.append(f"h_{height}")
        if width or height:
            transforms.append("c_limit")  # Maintain aspect ratio

        transform_str = ",".join(transforms)

        # Insert after /upload/
        return secure_url.replace("/upload/", f"/upload/{transform_str}/")
    except Exception:
        return secure_url
