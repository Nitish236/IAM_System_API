const mongoose = require("mongoose");

const passwordTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please provide a valid Email",
    ],
    unique: true,
  },
  resetToken: {
    type: String,
    required: [true, "Reset Token is required"],
  },
  expiry: {
    type: Date,
    required: [true, "Expiry is required"],
  },
});

module.exports = mongoose.model("ResetToken", passwordTokenSchema);
