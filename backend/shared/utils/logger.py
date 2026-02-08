"""Logging utilities."""
import logging
import json
from typing import Any, Dict

logger = logging.getLogger("trading")


def log_info(message: str, **kwargs):
    """Log an info message with structured data."""
    if kwargs:
        logger.info(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.info(message)


def log_warning(message: str, **kwargs):
    """Log a warning message with structured data."""
    if kwargs:
        logger.warning(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.warning(message)


def log_error(message: str, exception: Exception = None, **kwargs):
    """Log an error message with optional exception."""
    if exception:
        logger.error(f"{message} | Exception: {str(exception)}", exc_info=True)
    elif kwargs:
        logger.error(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.error(message)


def log_debug(message: str, **kwargs):
    """Log a debug message with structured data."""
    if kwargs:
        logger.debug(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.debug(message)


def get_logger(name: str) -> logging.Logger:
    """Get a logger by name."""
    return logging.getLogger(name)
