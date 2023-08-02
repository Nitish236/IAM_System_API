require("dotenv").config();

const mongoose = require("mongoose");
const generatePass = require("generate-password");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/mailService/email");

// User Schema ( Holds for all the Employee )

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid Email",
      ],
      unique: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
  },
  { timestamps: true }
);

/*                                      Pre Save Dunctions                         */

//                             Function to Generate Password and send email to the employee with the password

userSchema.pre("save", async function () {
  // Generates a password for the Employee and saves it
  const pass = generatePass.generate({
    length: 8,
    numbers: true,
  });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(pass, salt);

  this.password = hashedPassword;

  const user = {
    email: this.email,
    context: {
      name: this.firstName + " " + this.lastName,
      email: this.email,
      password: pass,
      role: this.role,
      department: this.department,
    },
  };

  // Send the email to the Employee with Login Credentials
  sendEmail(user);
});

/*                                        Methods   (callable functions)                          */

//                            Function to create Access Token

userSchema.methods.createAccessToken = async function () {
  return jwt.sign(
    {
      empId: this._id,
      name: this.firstName + " " + this.lastName,
      role: this.role,
      roleId: this.roleId,
      departmentId: this.departmentId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

//                            Function to create Refresh Token

userSchema.methods.createRefreshToken = async function () {
  return jwt.sign(
    { empId: this._id, name: this.firstName + " " + this.lastName },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

//                            Functions to compare Password during Login

userSchema.methods.comparePassword = async function (password, formPassword) {
  const passMatch = await bcrypt.compare(formPassword, password); // 1st input to be always the password

  return passMatch;
};

module.exports = mongoose.model("User", userSchema);
