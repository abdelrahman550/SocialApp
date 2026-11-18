export class ApplicationException extends Error {
  constructor(
    override message: string,
    public status: number,
    override cause?: unknown,
  ) {
    super(message, { cause });
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        status: this.status,
        cause: this.cause,
        name: this.name,
      },
      stack: this.stack,
    };
  }
}
