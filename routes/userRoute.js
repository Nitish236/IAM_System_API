const Router = require("express").Router;

const router = Router();

const {
  filter,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/users");

// Authorization
const { authorizePermissions } = require("../middleware/authentication");

// User Router (Employee)

router
  .route("/")
  .post(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    createUser
  ); // To create Employee

router
  .route("/search")
  .post(authorizePermissions(["Super Admin", "Admin"]), filter); // Filter user

router
  .route("/:empId")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    getUserById
  ) // To get Employee By Id
  .put(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    updateUser
  ) // To Update Employee Details
  .delete(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    deleteUser
  ); // To Delete Employee Data

// Export Router

module.exports = router;
