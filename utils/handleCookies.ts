import { Response } from "express";

const NODE_ENV = process.env.NODE_ENV;

const maxAge = 30 * 24 * 60 * 60 * 1000;

const attachTokenToResponse = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: NODE_ENV === "development" ? false : true,
    expires: new Date(Date.now() + maxAge),
    sameSite: "strict",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === "development" ? false : true,
    expires: new Date(Date.now() + maxAge),
    sameSite: "strict",
  });
};

const removeTokenFromResponse = (res: Response): void => {
  res.cookie("accessToken", "", {
    httpOnly: true,
    expires: new Date(Date.now()),
    secure: NODE_ENV === "development" ? false : true,
  });

  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(Date.now()),
    secure: NODE_ENV === "development" ? false : true,
  });
};

export { attachTokenToResponse, removeTokenFromResponse };
