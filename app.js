require("express-async-errors");
require("dotenv").config();

const express = require("express");
const app = express();

const connectToDatabase = require("./database/connection");
const { default: mongoose } = require("mongoose");

// Importing Routers

// Importing error handler
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

// Middleware to parse json, url, and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

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
