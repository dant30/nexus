"""
Request/Response logging middleware for FastAPI.
Logs all HTTP requests and responses with timing and error information.
"""
import time
import json
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("http")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all HTTP requests and responses.
    Captures:
    - Request method, path, query params
    - Response status code
    - Execution time
    - Error details
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and log details.
        """
        # Skip logging for health checks
        if request.url.path in ["/health", "/api/docs", "/api/redoc", "/api/openapi.json"]:
            return await call_next(request)
        
        start_time = time.time()
        
        # Capture request details
        method = request.method
        path = request.url.path
        query_params = dict(request.query_params)
        
        # Log request
        log_info(
            f"â†’ {method} {path}",
            method=method,
            path=path,
            query_params=query_params if query_params else None,
            client_host=request.client.host if request.client else None,
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Log response
            log_info(
                f"â† {method} {path} {response.status_code}",
                method=method,
                path=path,
                status_code=response.status_code,
                execution_time_ms=round(execution_time * 1000, 2),
            )
            
            # Add custom headers
            response.headers["X-Process-Time"] = str(execution_time)
            
            return response
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            log_error(
                f"âœ— {method} {path}",
                exception=e,
                method=method,
                path=path,
                execution_time_ms=round(execution_time * 1000, 2),
            )
            
            raise
