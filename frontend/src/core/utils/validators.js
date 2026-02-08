import { REGEX } from "../constants/regex.js";

export const isEmail = (v) => REGEX.EMAIL.test(v);
export const isPassword = (v) => REGEX.PASSWORD.test(v);
export const isAmount = (v) => REGEX.AMOUNT.test(v);
