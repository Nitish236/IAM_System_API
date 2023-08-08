require("express-async-errors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const express = require("express");
const app = express();

const connectToDatabase = require("./database/connection");
const { default: mongoose } = require("mongoose");

// Importing Routers
const userRoute = require("./routes/userRoute");
const roleRoute = require("./routes/roleRoute");
const permissionRoute = require("./routes/permissionRoute");
const departmentRoute = require("./routes/departmentRoute");
const sessionRoute = require("./routes/sessionRoute");
const auditLogRoute = require("./routes/auditLogRoute");

// Importing error handler
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

// Authentication & Authorization
const {
  authenticateUser,
  authorizePermissions,
} = require("./middleware/authentication");

// Middleware to parse json, url, and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth route
app.use("/api/v1/auth", sessionRoute);

// Routes
app.use("/api/v1/users", authenticateUser, userRoute);
app.use("/api/v1/roles", authenticateUser, roleRoute);
app.use("/api/v1/permissions", authenticateUser, permissionRoute);
app.use("/api/v1/departments", authenticateUser, departmentRoute);
app.use(
  "/api/v1/audit-logs",
  authenticateUser,
  authorizePermissions(["Super Admin", "Admin"]),
  auditLogRoute
);

// Middleware for errors
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// To start Server
async function startServer() {
  try {
    await connectToDatabase();
    console.log("Connected to Database -- ");

    app.listen(process.env.PORT, () => {
      console.log(`Server listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error -- ", error);

    mongoose.connection.close(() => {
      console.log("Database Connection is closed");
      console.log("Server is shutting down");
      process.exit();
    });
  }
}

// Call for server start
startServer();
