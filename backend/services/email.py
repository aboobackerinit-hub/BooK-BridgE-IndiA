import smtplib
from email.mime.text import MIMEText
import logging
from backend.core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

logger = logging.getLogger("bookbridge.email")

def send_email(to_email: str, subject: str, body: str):
    """Sends an email using the configured SMTP server."""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_USER or "noreply@bookbridge.local"
    msg["To"] = to_email
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASS:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise
