import { Router } from "express";
import { User } from "../models";
import { AuthenticateValidations, RegisterValidations } from "../validators";
import Validator from "../middlewares/validator-middleware";
import { randomBytes } from "crypto";
import { DOMAIN } from "../constants";
import sendMail from "../functions/email-sender";
import { join } from "path";
const router = Router();

/**
 * @description TO create a new account
 * @api /users/api/register
 * @access Public
 * @type POST
 */

//whatever validations failing that would be added in side our req object and from that we can get our error.
router.post(
  "/api/register",
  RegisterValidations,
  Validator,
  async (req, res) => {
    try {
      let { username, email } = req.body;
      //check if the username is already taken or not
      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({
          success: false,
          message: "USername is already taken",
        });
      }
      //check if the user exists with that mail
      user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          success: false,
          message: "Your email is already Registered..",
        });
      }
      user = new User({
        ...req.body,
        verificationCode: randomBytes(20).toString("hex"),
      });
      await user.save();
      //send the mail to the user with verification link
      let html = `
      <div>
            <h1>Hello, ${user.username}</h1>
            <p>please click following link to verify your Account</p>
            <a href='${DOMAIN}users/verify-now/${user.verificationCode}'>Verify Now</a>
      </div>
 `;
      await sendMail(
        user.email,
        "Verify Account",
        "Please Verify Account",
        html
      );
      return res.status(201).json({
        success: true,
        message: "Hurray! Your Account is created, please verify your email.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "error occured",
      });
    }
  }
);

/**
 * @description TO create a new User's account via email
 * @api /users/verify-now/:verificationCode
 * @access Public <only via email>
 * @type GET
 */

router.get("/verify-now/:verificationCode", async (req, res) => {
  try {
    let { verificationCode } = req.params;
    let user = await User.findOne({ verificationCode });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorised access. Invalid verification code",
      });
    }
    user.verified = true;
    user.verificationCode = undefined;
    await user.save();
    return res.sendFile(
      join(__dirname, "../templates/verification-success.html")
    );
  } catch (err) {
    return res.sendFile(join(__dirname, "../templates/errors.html"));
  }
});

/**
 * @description TO authenticate a user and get auth token
 * @api /users/api/authenticate
 * @access Public
 * @type POST
 */

router.post(
  "/api/authenticate",
  AuthenticateValidations,
  Validator,
  async (req, res) => {
    try {
      let { username, password } = req.body;
      let user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Username not found",
        });
      }
      if (!(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: "Incorrect passowrd",
        });
      }
      let token = await user.generateJWT();
      return res.status(200).json({
        success: true,
        user: user.getUserInfo(),
        token: `Bearer ${token}`,
        message: "Hurray! You are now logged in ",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "An error occured",
      });
    }
  }
);

export default router;
