import { Router } from "express";
import { User } from "../models";
import {
  AuthenticateValidations,
  RegisterValidations,
  ResetPassword,
} from "../validators";
import Validator from "../middlewares/validator-middleware";
import { randomBytes } from "crypto";
import { DOMAIN } from "../constants";
import sendMail from "../functions/email-sender";
import { join } from "path";
import { userAuth } from "../middlewares/auth-guard";
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

/**
 * @description TO get the authenticated user's profile
 * @api /users/api/authenticate
 * @access Private
 * @type GET
 */

router.get("/api/authenticate", userAuth, async (req, res) => {
  console.log("REQ", req);
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * @description TO initiate the password reset process
 * @api /users/api/reset-password/
 * @access Public
 * @type PUT
 */

router.put("api/reset-password", ResetPassword, Validator, async (req, res) => {
  try {
    let { email } = req.body;
    let user = await User.findOne({ email });
    console.log("Heeeyyyyyyy", user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with the email is not found",
      });
    }
    user.generatePasswordReset();
    await user.save();
    //send the mail to the user with verification link
    let html = `
    <div>
          <h1>Hello, ${user.username}</h1>
          <p>please click following link to reset your password</p>
          <p>If this password reset request is not created by you then you can ignore the mail.</p>
          <a href='${DOMAIN}users/reset-password-now/${user.resetPasswordToken}'>Verify Now</a>
    </div>
`;
    await sendMail(
      user.email,
      "Reset Password",
      "Please reset your password",
      html
    );
    return res.status(404).json({
      success: true,
      message: "Password reset link is sent to your mail",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An error occured",
    });
  }
});

/**
 * @description TO render reset password page
 * @api /users/reset-password/:resetPasswordToken
 * @access Restricted via email
 * @type GET
 */

router.get("/reset-password-now/:resetPasswordToken", async (req, res) => {
  try {
    let { resetPasswordToken } = req.params;
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }
    return res.sendFile(join(__dirname, "../templates/password-reset.html"));
  } catch (err) {
    return res.sendFile(join(__dirname, "../templates/errors.html"));
  }
});

/**
 * @description TO reset the password
 * @api /users/api/reset-password-now
 * @access Restricted via email
 * @type POST
 */

router.post("/api/reset-password-now", async (req, res) => {
  try {
    let { resetPasswordToken, password } = req.body;
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresIn = undefined;
    await user.save();
    //send notification email about password reset successful
    let html = `
    <div>
          <h1>Hello, ${user.username}</h1>
          <p>your password has been changed..</p>
          <p>If this password reset request is not done by you then you can contact our team.</p>
    </div>
`;
    await sendMail(
      user.email,
      "Reset Password successfully",
      "Your password is changed",
      html
    );
    return res.status(200).json({
      success: true,
      message:
        "Your password request is complete and it has been successfully changed. Login to your Account",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "something went wrong..",
    });
  }
});

export default router;
