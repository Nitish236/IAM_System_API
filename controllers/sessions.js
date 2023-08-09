require("dotenv").config();

const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
  CustomAPIError,
} = require("../errors/allErr");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");

// Model
const User = require("../models/userModel");
const Session = require("../models/sessionModel");
const ResetToken = require("../models/passwordToken");
const { sendEmailForResetPassword } = require("../utils/mailService/email");

// Projections For Queries
// User
const projectionForUser = {
  email: 0,
  department: 0,
  departmentId: 0,
  roleId: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForUserToGetId = {
  username: 0,
  password: 0,
  roleId: 0,
  departmentId: 0,
  role: 0,
  department: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionToGetUserData = {
  _id: 0,
  password: 0,
  roleId: 0,
  departmentId: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// Session
const projectionForSession = {
  empId: 0,
  refreshToken: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// Reset
const projectionForResetToken = { email: 0, resetToken: 0 };

//                                  Function to Log In the Employee

const login = async (req, res) => {
  // Retrieve the username and password
  const { username, password } = req.body;

  // Check if both the fields are not empty
  if (!username || !password) {
    throw new BadRequestError("Username and password cannot be empty");
  }

  // Check if such a Employee exits or not
  const user = await User.findOne({ username }, projectionForUser);

  if (!user) {
    throw new NotFoundError("No such Employee exists");
  }

  // Match the password
  const passMatch = await user.comparePassword(user.password, password);

  if (!passMatch) {
    throw new BadRequestError("Username or password is incorrect");
  }

  // Generate the Access Token
  const accessToken = await user.createAccessToken();

  // Set the cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  // Remove old refresh token
  await Session.deleteOne({ empId: user._id });

  // Generate the Refresh Token
  const refreshToken = await user.createRefreshToken();

  // Save the refresh token
  const session = await Session.create({ empId: user._id, refreshToken });

  if (!session._doc._id) {
    throw new CustomAPIError("Server error Re-try");
  }

  // Set the cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  // Send the Tokens
  res.status(StatusCodes.OK).json({
    msg: "Login Successfull",
    user: {
      name: `${user.firstName + " " + user.lastName}`,
      role: user.role,
    },
  });
};

//                                  Function to Log out the Employee

const logout = async (req, res) => {
  // Remove the refresh token from the database
  await Session.deleteOne({ empId: req.user.empId });

  // Remove the cookie
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(StatusCodes.OK).json({ msg: "LogOut successfull" });
};

//                                  Function to Refresh the Access Token

const refresh = async (req, res) => {
  // Get Refresh Token
  const refreshToken = req.cookies.refreshToken;

  // Check if present or not
  if (!refreshToken) {
    throw new UnauthenticatedError(
      "Authentication Invalid, no Refresh token found"
    );
  }

  try {
    // Verify the token
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    if (payload.exp < Date.now()) {
      throw new BadRequestError("Refresh token is expired");
    }

    // Find the session
    const session = await Session.findOne(
      { empId: payload.empId, refreshToken },
      projectionForSession
    );

    if (!session) {
      throw new UnauthenticatedError(
        "Authentication Invalid, Refresh Token invalid."
      );
    }

    // Find the Employee
    const user = await User.findOne(
      { _id: payload.empId },
      projectionForUserToGetId
    );

    if (!user) {
      throw new NotFoundError("Employee does not exists");
    }

    // Generate new Access Token
    const accessToken = await user.createAccessToken();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(StatusCodes.OK).json({ msg: "New Access Token is set" });
  } catch (error) {
    throw new UnauthenticatedError("Authentication Invalid -- ");
  }
};

//                                  Function to generate token for forgot password

const forgotPassword = async (req, res) => {
  // Get the email
  const email = req.body.email;

  // Check if Employee exists or not
  const user = await User.findOne({ email });

  if (!user) {
    throw new NotFoundError("No such employee exists");
  }

  // Generate reset token
  const resetToken = uuid.v4();
  // Set token expiry
  const expiry = Date.now() + parseInt(process.env.expiryTime);

  // Save the token
  const reset = await ResetToken.create({ email, resetToken, expiry });

  if (!reset._doc._id) {
    throw new CustomAPIError("Server error try after some time");
  }

  // Send the mail
  await sendEmailForResetPassword({
    email,
    resetLink:
      process.env.resetURL +
      `/auth/reset-password?email=${email}&resetToken=${resetToken}`,
  });

  // Send confirmation
  res
    .status(StatusCodes.OK)
    .json({ msg: "Password reset link sent successfully", acknowledged: true });
};

//                                  Function to Reset Password

const resetPassword = async (req, res) => {
  // Get new Password
  const password = req.body.password;

  // Get email and reset token
  const { email, resetToken } = req.query;

  if (!email || !resetToken) {
    throw BadRequestError("Email or reset token cannot be empty");
  }

  // Check if reset token is present or not
  const reset = await ResetToken.findOne(
    { email, resetToken },
    projectionForResetToken
  );

  if (!reset) {
    throw new NotFoundError("Invalid Reset Token or employee not found");
  }

  if (reset.expiry < Date.now()) {
    await ResetToken.deleteMany({ email }); // Delete the expired tokens

    throw new BadRequestError("Token has Expired");
  }

  // Find the employee
  const user = await User.findOne({ email }, projectionForUserToGetId);

  // Change employee's password
  await user.changePassword(password);

  // Delete old session of the user containing old password, (refresh token)
  await Session.deleteOne({ empId: user._id });

  // Delete all reset token for this user
  await ResetToken.deleteMany({ email });
  // There can be at max 2 document of one user, one that we dicuss below and other one is the new one
  /* We are doing this, in case a user generates the request for change password
     but in future does not change it and the time expired. So whenever he changes
     the password in future then all reset's should be distroyed at that time */

  // Send confirmation
  res
    .status(StatusCodes.OK)
    .json({ msg: "Password changed successfully", acknowledged: true });
};

//                                  Function to Fetch the details of the Logged In Employee

const getDetailsAboutMe = async (req, res) => {
  // Get the Employee
  const user = req.user;

  if (!user.empId) {
    throw new UnauthenticatedError("Log In to access the data");
  }

  // Get the Employee Details
  const employee = await User.findOne(
    { _id: user.empId },
    projectionToGetUserData
  );

  if (!employee) {
    throw new CustomAPIError("Server error or User does not exists");
  }

  // Send the Employee data
  res.status(StatusCodes.OK).send({ msg: "User data", user: employee });
};

// Export Functionality

module.exports = {
  login,
  logout,
  refresh,
  getDetailsAboutMe,
  forgotPassword,
  resetPassword,
};
