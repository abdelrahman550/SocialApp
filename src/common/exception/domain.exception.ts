import { ApplicationException } from "./application.exception";

/** 400 Bad Request */
export class BadRequestException extends ApplicationException {
  constructor(message = "Bad request", cause?: unknown) {
    super(message, 400, cause);
  }
}

/** 401 Unauthorized */
export class UnauthorizedException extends ApplicationException {
  constructor(message = "Unauthorized", cause?: unknown) {
    super(message, 401, cause);
  }
}

/** 403 Forbidden */
export class ForbiddenException extends ApplicationException {
  constructor(message = "Forbidden", cause?: unknown) {
    super(message, 403, cause);
  }
}

/** 404 Not Found */
export class NotFoundException extends ApplicationException {
  constructor(message = "Not found", cause?: unknown) {
    super(message, 404, cause);
  }
}

/** 409 Conflict */
export class ConflictException extends ApplicationException {
  constructor(message = "Conflict", cause?: unknown) {
    super(message, 409, cause);
  }
}

/** 429 Too Many Requests */
export class TooManyRequestsException extends ApplicationException {
  constructor(message = "Too many requests", cause?: unknown) {
    super(message, 429, cause);
  }
}

/** 500 Internal Server Error */
export class InternalServerErrorException extends ApplicationException {
  constructor(message = "Internal server error", cause?: unknown) {
    super(message, 500, cause);
  }
}
