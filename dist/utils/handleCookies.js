"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTokenFromResponse = exports.attachTokenToResponse = void 0;
const NODE_ENV = process.env.NODE_ENV;
const maxAge = 30 * 24 * 60 * 60 * 1000;
const attachTokenToResponse = (res, accessToken, refreshToken) => {
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
exports.attachTokenToResponse = attachTokenToResponse;
const removeTokenFromResponse = (res) => {
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
exports.removeTokenFromResponse = removeTokenFromResponse;
