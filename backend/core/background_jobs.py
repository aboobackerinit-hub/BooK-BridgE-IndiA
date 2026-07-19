"""
Structured background job management.

Wraps FastAPI BackgroundTasks with logging, error handling,
and a registry of job types for monitoring.
"""
import time
import logging
import threading
from typing import Callable, Any, Optional

logger = logging.getLogger("bookbridge.background_jobs")

# Job execution log (last N jobs for monitoring)
_job_log: list[dict] = []
_job_log_lock = threading.Lock()
_MAX_LOG_SIZE = 200


def enqueue(background_tasks, job_type: str, func: Callable, *args: Any, **kwargs: Any) -> None:
    """
    Enqueue a background job with logging.

    Args:
        background_tasks: FastAPI BackgroundTasks instance.
        job_type: Human-readable job type name for logging.
        func: The function to execute.
        *args, **kwargs: Arguments to pass to the function.
    """
    logger.info(f"Enqueueing background job: {job_type}")
    background_tasks.add_task(_execute_job, job_type, func, *args, **kwargs)


def _execute_job(job_type: str, func: Callable, *args: Any, **kwargs: Any) -> None:
    """Execute a background job with timing and error handling."""
    start = time.time()
    status = "success"
    error_msg = None

    try:
        func(*args, **kwargs)
    except Exception as e:
        status = "error"
        error_msg = str(e)
        logger.error(f"Background job '{job_type}' failed: {e}", exc_info=True)

    elapsed = time.time() - start

    # Log the job execution
    entry = {
        "job_type": job_type,
        "status": status,
        "elapsed_seconds": round(elapsed, 3),
        "error": error_msg,
        "timestamp": time.time(),
    }

    with _job_log_lock:
        _job_log.append(entry)
        # Trim log to max size
        if len(_job_log) > _MAX_LOG_SIZE:
            _job_log.pop(0)

    if status == "success":
        logger.info(f"Background job '{job_type}' completed in {elapsed:.3f}s")


def get_recent_jobs(limit: int = 50) -> list[dict]:
    """Return the most recent job executions for monitoring."""
    with _job_log_lock:
        return list(reversed(_job_log[-limit:]))


def get_job_stats() -> dict:
    """Return aggregate job statistics."""
    with _job_log_lock:
        total = len(_job_log)
        if total == 0:
            return {"total": 0, "success": 0, "error": 0, "avg_duration": 0}

        success = sum(1 for j in _job_log if j["status"] == "success")
        errors = sum(1 for j in _job_log if j["status"] == "error")
        avg_duration = sum(j["elapsed_seconds"] for j in _job_log) / total

        return {
            "total": total,
            "success": success,
            "error": errors,
            "avg_duration_seconds": round(avg_duration, 3),
        }
