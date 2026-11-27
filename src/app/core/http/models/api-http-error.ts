import type { ProblemDetails } from '../../errors/models/problem-details';

export class ApiHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly localizedMessage: string;
  readonly problem: ProblemDetails | null;
  override readonly cause: unknown;

  constructor(params: {
    readonly status: number;
    readonly code: string;
    readonly localizedMessage: string;
    readonly problem: ProblemDetails | null;
    readonly cause: unknown;
  }) {
    super(params.localizedMessage);
    this.name = 'ApiHttpError';
    this.status = params.status;
    this.code = params.code;
    this.localizedMessage = params.localizedMessage;
    this.problem = params.problem;
    this.cause = params.cause;
  }
}
