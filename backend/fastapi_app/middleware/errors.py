"""
Error handling middleware for FastAPI.
Catches and formats all exceptions consistently.
"""
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from shared.utils.logger import log_error, get_logger

logger = get_logger("errors")


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and consistently format all errors.
    Provides standardized error responses across the API.
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        """
        Process request and handle exceptions.
        """
        try:
            return await call_next(request)
            
        except ValueError as e:
            log_error(
                f"Validation error: {str(e)}",
                path=request.url.path,
                method=request.method,
            )
            return JSONResponse(
                status_code=HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": str(e),
                    },
                },
            )
            
        except KeyError as e:
            log_error(
                f"Missing required field: {str(e)}",
                path=request.url.path,
                method=request.method,
            )
            return JSONResponse(
                status_code=HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "MISSING_FIELD",
                        "message": f"Missing required field: {str(e)}",
                    },
                },
            )
            
        except Exception as e:
            log_error(
                f"Unhandled error: {str(e)}",
                exception=e,
                path=request.url.path,
                method=request.method,
            )
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred. Please try again later.",
                    },
                },
            )
