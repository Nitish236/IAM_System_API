const Router = require("express").Router;

const router = Router();

const {
  filter,
  sendAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roles");

// Authorization
const { authorizePermissions } = require("../middleware/authentication");

// Role Router

router
  .route("/")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    sendAllRoles
  ) // Send All Roles
  .post(authorizePermissions(["Super Admin", "Admin"]), createRole); // Create a Role

router
  .route("/search")
  .post(authorizePermissions(["Super Admin", "Admin"]), filter); // Filtering

router
  .route("/:roleId")
  .get(authorizePermissions(["Super Admin", "Admin"]), getRoleById) // Get Role By Id
  .put(authorizePermissions(["Super Admin", "Admin"]), updateRole) // Update the Role data
  .delete(authorizePermissions(["Super Admin", "Admin"]), deleteRole); // Delete the Role data

// Export router

module.exports = router;
