require("dotenv").config();

const jwt = require("jsonwebtoken");
const UnauthenticatedError = require("../errors/unauthenticated");

// Model
const User = require("../models/userModel");
const Session = require("../models/sessionModel");
const Department = require("../models/departmentModel");

// Projections for Queries
// Department
const projectionForDepartment = {
  name: 0,
  description: 0,
  managerName: 0,
  managerId: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
};
// Session
const projectionForSession = {
  empId: 0,
  refreshToken: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// User
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

//                                             Function to Authenticate

const authenticateUser = async (req, res, next) => {
  // Get Tokens
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  // Atleast one should be there
  if (!accessToken && !refreshToken) {
    throw new UnauthenticatedError("Authentication Invalid, no tokens found");
  }

  try {
    // Verify the access token
    if (accessToken) {
      const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

      // Attach the Employee
      req.user = {
        empId: payload.empId,
        name: payload.name,
        role: payload.role,
        roleId: payload.roleId,
        departmentId: payload.departmentId,
      };

      return next();
    }

    // Verify the refresh token
    if (refreshToken) {
      // Get Payload
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      // Get session
      const session = await Session.findOne(
        { token: refreshToken },
        projectionForSession
      );

      if (!session) {
        throw new UnauthenticatedError("Refresh token Invalid");
      }

      // Find the Employee
      const user = await User.findOne(
        { _id: payload.empId },
        projectionForUserToGetId
      );

      if (!user) {
        throw new NotFoundError("Employee does not exists");
      }

      // Attach the Employee
      req.user = {
        empId: payload._id,
        name: payload.name,
        role: payload.role,
        roleId: payload.roleId,
        departmentId: payload.departmentId,
      };

      // Generate new access token
      const newAccessToken = await user.createAccessToken();

      // Set the new access token in the cookie
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });

      return next();
    }
  } catch (error) {
    throw new UnauthenticatedError("Authentication Invalid");
  }
};

//                                     Function to Authorize

const authorizePermissions = (roles) => {
  return async (req, res, next) => {
    // Check if the User's role matched with any of the roles in the roles array

    if (!roles.includes(req.user.role)) {
      console.log(0);
      throw new UnauthenticatedError("Access Denied");
    }

    if (req.user.role === "Department Manager" && req.params.depId) {
      const { departmentId, empId } = req.user;

      const dep = await Department.findOne(
        { _id: departmentId, managerId: empId },
        projectionForDepartment
      );

      if (!dep) {
        // Check up that manager looks up to his department only
        throw new UnauthenticatedError("Access denied");
      }
    }

    next();
  };
};

// Export Functionality

module.exports = {
  authenticateUser,
  authorizePermissions,
};
