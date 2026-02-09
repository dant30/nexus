"""Environment configuration utilities."""
import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

# Load .env from backend root if present
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH, override=False)


class EnvConfig:
    """Parse and retrieve environment variables with type conversion."""

    def get(self, key: str, default=None):
        """Get environment variable with default fallback."""
        return os.getenv(key, default)

    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get environment variable as boolean."""
        value = os.getenv(key, str(default)).lower()
        return value in ("true", "1", "yes", "on")

    def get_int(self, key: str, default: int = 0) -> int:
        """Get environment variable as integer."""
        try:
            return int(os.getenv(key, default))
        except (TypeError, ValueError):
            return default

    def get_float(self, key: str, default: float = 0.0) -> float:
        """Get environment variable as float."""
        try:
            return float(os.getenv(key, default))
        except (TypeError, ValueError):
            return default

    def get_list(self, key: str, default: Optional[List] = None) -> List:
        """Get environment variable as list (comma-separated)."""
        if default is None:
            default = []
        value = os.getenv(key)
        if not value:
            return default
        return [item.strip() for item in value.split(",")]


# Singleton instance
env = EnvConfig()
