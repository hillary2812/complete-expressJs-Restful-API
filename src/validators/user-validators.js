import { check } from "express-validator";

const name = check("name", "Name is required").not().isEmpty();
const username = check("username", "UserName is required").not().isEmpty();
const email = check("email", "please provide a valid email address").isEmail();
const password = check("password", "Password is required minimun of length 6")
  .not()
  .isLength({
    min: 6,
  });

export const RegisterValidations = [password, email, username, name];
export const AuthenteValidations = [username, password];
