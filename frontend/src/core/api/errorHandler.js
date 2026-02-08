/**
 * API Error Handler
 * Centralized error handling and user feedback
 */

export class APIError extends Error {
  constructor(message, code = "UNKNOWN_ERROR", status = 500, details = null) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends APIError {
  constructor(message, fieldErrors = {}) {
    super(message, "VALIDATION_ERROR", 400);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthenticationError extends APIError {
  constructor(message = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

export class AuthorizationError extends APIError {
  constructor(message = "You do not have permission to access this resource") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

export class NotFoundError extends APIError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends APIError {
  constructor(message = "Conflict with existing resource") {
    super(message, "CONFLICT", 409);
  }
}

export class ServerError extends APIError {
  constructor(message = "Server error") {
    super(message, "SERVER_ERROR", 500);
  }
}

/**
 * Parse API error response
 */
export function parseAPIError(error) {
  if (error instanceof APIError) {
    return error;
  }

  if (error.response) {
    const data = error.response;
    const message = data?.error?.message || error.message || "Unknown error";
    const code = data?.error?.code || "UNKNOWN_ERROR";
    const status = error.status || 500;

    switch (status) {
      case 400:
        return new ValidationError(message, data?.error?.field_errors);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError(message);
      case 409:
        return new ConflictError(message);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message);
      default:
        return new APIError(message, code, status);
    }
  }

  return new APIError(error.message || "Unknown error");
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof APIError) {
    return error.message;
  }

  if (error.response?.error?.message) {
    return error.response.error.message;
  }

  if (error.message) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Handle API errors with logging and user feedback
 */
export function handleAPIError(error, options = {}) {
  const { showNotification = true, logError = true } = options;

  const parsedError = parseAPIError(error);

  if (logError) {
    console.error("[API Error]", {
      code: parsedError.code,
      status: parsedError.status,
      message: parsedError.message,
      details: parsedError.details,
    });
  }

  if (showNotification) {
    // Could dispatch to notification system here
    console.warn("[User Notification]", parsedError.message);
  }

  return parsedError;
}
