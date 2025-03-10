/**
 * Custom errors that are shown to the user
 */
export class UserError extends Error {
  status: number = 500;
  payload: any;
  constructor(message: string, payload?: any) {
    super(message);
    this.payload = payload;
  }
}

/**
 * Error thrown when the request body is invalid
 */
export class ValidationError extends UserError {
  constructor(public readonly errors: any) {
    super("Validation Error", errors);
    this.status = 400;
  }
}

/**
 * Error thrown when the user is not authorized to perform the action
 */
export class UnauthorizedError extends UserError {
  constructor(message: string) {
    super(message);
    this.status = 401;
  }
}

/**
 * Error thrown when the user is forbidden from performing the action
 */
export class ForbiddenError extends UserError {
  constructor(message: string) {
    super(message);
    this.status = 403;
  }
}

export class RateLimitError extends UserError {
  constructor(message: string) {
    super(message);
    this.status = 429;
  }
}

/**
 * Error thrown when the resource is not found
 */
export class NotFoundError extends UserError {
  constructor(message: string) {
    super(message);
    this.status = 404;
  }
}
