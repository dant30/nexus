"""
Centralized logging utilities for Nexus Trading.

- UTF-8 safe (Windows friendly)
- Structured logging
- API / OAuth / Trading ready
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any, Dict, Optional


# ---------- Formatter ----------

class JsonFormatter(logging.Formatter):
    """JSON log formatter (safe for UTF-8, prod, and log aggregators)."""

    def format(self, record: logging.LogRecord) -> str:
        log_record: Dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "time": self.formatTime(record, self.datefmt),
        }

        # Attach structured context if present
        if hasattr(record, "context") and isinstance(record.context, dict):
            log_record.update(record.context)

        # Attach exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record, ensure_ascii=False)


# ---------- Logger Setup ----------

def _configure_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger  # already configured

    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.stream.reconfigure(encoding="utf-8")

    formatter = JsonFormatter()
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    logger.propagate = False

    return logger


logger = _configure_logger("nexus-trading")


# ---------- Public API ----------

def log_info(message: str, **context: Any) -> None:
    logger.info(message, extra={"context": context} if context else None)


def log_warning(message: str, **context: Any) -> None:
    logger.warning(message, extra={"context": context} if context else None)


def log_debug(message: str, **context: Any) -> None:
    logger.debug(message, extra={"context": context} if context else None)


def log_error(
    message: str,
    *,
    exception: Optional[Exception] = None,
    **context: Any,
) -> None:
    logger.error(
        message,
        exc_info=exception,
        extra={"context": context} if context else None,
    )


def get_logger(name: str) -> logging.Logger:
    return _configure_logger(name)
