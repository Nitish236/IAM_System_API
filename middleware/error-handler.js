const { StatusCodes } = require("http-status-codes");

// Error Handler
const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || "Something went wrong try again later",
  };

  // Mongoose Validation error
  if (err.name === "ValidationError") {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }

  // Mongoose Cast Error
  if (err.name === "CastError") {
    customError.msg = "Cast Error, Data type issue";
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }

  // Mongoose Duplicate Error
  if (err.code && err.code === 11000) {
    customError.statusCode = StatusCodes.BAD_REQUEST;

    const keys = Object.keys(err.keyPattern);

    // Handle Duplicate username and convert it into duplicate email error
    if (keys.includes("username")) {
      customError.msg = `Email - ${err.keyValue.username} already exists`;
    } else {
      customError.msg = `${keys[0]} - ${
        err.keyValue[`${keys[0]}`]
      } already exists`;
    }
  }

  return res.status(customError.statusCode).json({ msg: customError.msg });
};

// Export Functionality

module.exports = errorHandlerMiddleware;
