require("dotenv").config();

const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
  CustomAPIError,
} = require("../errors/allErr");
const jwt = require("jsonwebtoken");

// Model
const User = require("../models/userModel");
const Session = require("../models/sessionModel");

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

//                                  Function to Log In the Employee

const login = async (req, res) => {
  // Retrieve the username and password
  const { username, password } = req.body;
  //console.log(username + " - " + password);
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

  // Generate the Access Token and Refresh Token
  const accessToken = await user.createAccessToken();
  const refreshToken = await user.createRefreshToken();

  // Save the refresh token
  const session = await Session.create({ empId: user._id, refreshToken });

  if (!session) {
    throw new CustomAPIError("Server error Re-try");
  }

  // Set the cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  // Send the Access Token
  res.status(StatusCodes.OK).json({
    msg: "Login Successfull",
    user: {
      name: `${user.firstName + " " + user.lastName}`,
      role: user.role,
    },
  });
};

//                                Function to Log out the Employee

const logout = async (req, res) => {
  // Get the Tokens
  const refreshToken = req.cookies.refreshToken;

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

//                                    Function to Fetch the details of the Logged In Employee

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
};
