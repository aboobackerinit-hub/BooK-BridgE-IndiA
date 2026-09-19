import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from backend.core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

logger = logging.getLogger("bookbridge.email")


def send_email(to_email: str, subject: str, body_text: str, body_html: str = None):
    """
    Sends an email using the configured SMTP server (Brevo).
    Supports both plain text and HTML.
    """
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError(
            "Email service is not configured. "
            "SMTP_USER and SMTP_PASS environment variables must be set."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"BookBridge India <{SMTP_USER}>"
    msg["To"] = to_email

    # Attach plain text version
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    # Attach HTML version if provided
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
            logger.info(f"Email sent successfully to {to_email} | Subject: {subject}")
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed - check SMTP_USER and SMTP_PASS: {e}")
        raise
    except smtplib.SMTPConnectError as e:
        logger.error(f"SMTP connection failed to {SMTP_HOST}:{SMTP_PORT}: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise


def send_otp_email(to_email: str, otp: str):
    """Sends a styled OTP verification email."""
    subject = "Your BookBridge Verification Code"

    plain = (
        f"Your BookBridge India verification code is: {otp}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"The BookBridge Team"
    )

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a6b4a,#2d8f63);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">BookBridge India</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Verify your email address</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">Hello! Use the verification code below to complete your registration.</p>
          <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Verification Code</p>
            <p style="margin:0;color:#14532d;font-size:42px;font-weight:800;letter-spacing:0.3em;font-family:'Courier New',monospace;">{otp}</p>
          </div>
          <p style="margin:0 0 12px;color:#6b7280;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">If you did not create a BookBridge account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">2025 BookBridge India</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    send_email(to_email, subject, plain, html)
