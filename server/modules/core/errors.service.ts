import { Response } from 'express';
import Container, { Service } from 'typedi';
import { logger } from '@aitheon/core-server';

export enum ERROR_DEFAULTS {
  SERVER_ERROR_MESSAGE = 'Internal Server Error',
  SERVER_ERROR_CODE = 500
}

export enum API_ERROR_NAMES {
  AERR_NOT_FOUND = 'AERR_NOT_FOUND',
  AERR_CONFLICT = 'AERR_CONFLICT',
  AERR_STATE_UNDEF = 'AERR_STATE_UNDEF',
  AERR_NOT_AUTH = 'AERR_NOT_AUTH',
  AERR_BAD_INPUT = 'AERR_BAD_INPUT',
}

export const API_ERROR_STATUS_CODES: { [key: string]: number } = {
  [API_ERROR_NAMES.AERR_BAD_INPUT]: 400,
  [API_ERROR_NAMES.AERR_NOT_AUTH]: 401,
  [API_ERROR_NAMES.AERR_NOT_FOUND]: 404,
  [API_ERROR_NAMES.AERR_CONFLICT]: 409,
  [API_ERROR_NAMES.AERR_STATE_UNDEF]: 500
};

@Service()
export default class ErrorService {

  errorResponse = function (res: Response, err: Error | CustomError): void {
    if (err instanceof CustomError && API_ERROR_STATUS_CODES[err.code]) {
      res.status(API_ERROR_STATUS_CODES[err.code])
        .send({ success: false, message: err.message });
    } else {
      switch (err.name) {
        case 'AccessDeniedError':
        case 'AuthorizationRequiredError':
          logger.info('[AUTH] AccessDeniedError: ', err.message);
          res.sendStatus(401);
        default:
          logger.error(err);
          res.status(ERROR_DEFAULTS.SERVER_ERROR_CODE)
            .send({ success: false, message: ERROR_DEFAULTS.SERVER_ERROR_MESSAGE });
      }
    }
  };
}

export class CustomError extends Error {
  code: string;

  constructor(message: string, errName: API_ERROR_NAMES) {
    super(message);
    this.code = errName;
    this.name = this.constructor.name;
    this.message = message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorNotFound extends CustomError {
  constructor(message: string) {
    super(message, API_ERROR_NAMES.AERR_NOT_FOUND);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorUndefinedState extends CustomError {
  constructor(message: string) {
    super(message, API_ERROR_NAMES.AERR_STATE_UNDEF);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorConflict extends CustomError {
  constructor(message: string) {
    super(message, API_ERROR_NAMES.AERR_CONFLICT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorNotAuthorized extends CustomError {
  constructor(message: string) {
    super(message, API_ERROR_NAMES.AERR_NOT_AUTH);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorBadInput extends CustomError {
  constructor(message: string) {
    super(message, API_ERROR_NAMES.AERR_BAD_INPUT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
