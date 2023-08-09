const Router = require("express").Router;

const router = Router();

const {
  login,
  logout,
  refresh,
  getDetailsAboutMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/sessions");

// Authentication
const { authenticateUser } = require("../middleware/authentication");

// Router

router.route("/login").post(login); // Log In Function

router.route("/logout").post(authenticateUser, logout); // Log Out Function

router.route("/refresh").post(authenticateUser, refresh); // Use to get new token

router.route("/me").get(authenticateUser, getDetailsAboutMe); // Sends the data of the Logged in User

router.route("/forgot-password").post(forgotPassword); // Sends reset token for password change

router.route("/reset-password").put(resetPassword); // To set new Pasword

// Export Router

module.exports = router;
