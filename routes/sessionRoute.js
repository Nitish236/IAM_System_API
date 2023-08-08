const Router = require("express").Router;

const router = Router();

const {
  login,
  logout,
  refresh,
  getDetailsAboutMe,
} = require("../controllers/sessions");

// Authentication
const { authenticateUser } = require("../middleware/authentication");

// Router

router.route("/login").post(login); // Log In Function

router.route("/logout").post(authenticateUser, logout); // Log Out Function

router.route("/refresh").post(authenticateUser, refresh); // Use to get new token

router.route("/me").get(authenticateUser, getDetailsAboutMe); // Sends the data of the Logged in User

// Export Router

module.exports = router;
