import { Schema, model } from "mongoose";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { SECRET } from "../constants";
import { randomBytes } from "crypto";
import { pick } from "lodash";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationCode: {
      type: String,
      require: false,
    },

    resetPasswordToken: {
      type: String,
      require: false,
    },
    resetPasswordExpiresIn: {
      type: Date,
      require: false,
    },
  },
  { timestamps: true }
);

//hooks: if there any udate request we can cache it here using hooks
UserSchema.pre("save", async function (name) {
  let user = this;
  if (!user.isModified("password")) return next(); //if we haven't change we don't want to do anything
  user.password = await hash(user.password, 10); //if we changed we have to hash that pass here, roundup sorts
  next();
});

//
UserSchema.methods.comparePassword = async function (password) {
  return await compare(password, this.password); //this.password- which is associated with model
};
//
UserSchema.methods.generateJWT = async function () {
  let payload = {
    username: this.username,
    email: this.email,
    name: this.name,
    id: this._id,
  };
  return await sign(payload, SECRET, { expiresIn: "1 day" });
};

UserSchema.methods.generatePasswordReset = function () {
  this.resetPasswordExpiresIn = Date.now() + 3600000;
  this.resetPasswordToken = randomBytes(20).toString("hex");
};

UserSchema.methods.getUserInfo = function () {
  return pick(this, ["_id", "username", "email", "name"]); //pull this us, ema, name with id
};

const User = model("users", UserSchema);
export default User;
