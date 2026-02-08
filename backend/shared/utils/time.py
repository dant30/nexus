"""Time and date utilities."""
from datetime import datetime, timedelta, timezone
import time


def get_utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def get_timestamp() -> float:
    """Get current UNIX timestamp."""
    return time.time()


def timestamp_to_datetime(timestamp: float) -> datetime:
    """Convert UNIX timestamp to UTC datetime."""
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def datetime_to_timestamp(dt: datetime) -> float:
    """Convert datetime to UNIX timestamp."""
    return dt.timestamp()


def add_hours(dt: datetime = None, hours: int = 0) -> datetime:
    """Add hours to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(hours=hours)


def add_days(dt: datetime = None, days: int = 0) -> datetime:
    """Add days to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(days=days)


def add_minutes(dt: datetime = None, minutes: int = 0) -> datetime:
    """Add minutes to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(minutes=minutes)


def add_seconds(dt: datetime = None, seconds: int = 0) -> datetime:
    """Add seconds to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(seconds=seconds)
