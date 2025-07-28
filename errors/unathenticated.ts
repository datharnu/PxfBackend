import CustomError from "./customError";
import { StatusCodes } from "http-status-codes";

export default class UnAunthenticatedError extends Error {
  statusCode: StatusCodes;
  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.UNAUTHORIZED;
  }
}
