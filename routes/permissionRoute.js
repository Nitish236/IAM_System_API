const Router = require("express").Router;

const router = Router();

// Permisson functions

const {
  createPermission,
  getPermissionById,
  updatePermission,
  deletePermission,
  sendAllPermissions,
  filter,
} = require("../controllers/permissions");

// Authorization
const { authorizePermissions } = require("../middleware/authentication");

// Routes

router
  .route("/")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    sendAllPermissions
  ) // To send all Permissions
  .post(authorizePermissions(["Super Admin", "Admin"]), createPermission); // To create Permission

router
  .route("/search")
  .post(authorizePermissions(["Super Admin", "Admin"]), filter); // Apply filtering

router
  .route("/:permId")
  .get(authorizePermissions(["Super Admin", "Admin"]), getPermissionById) // To get Permission By Id
  .put(authorizePermissions(["Super Admin", "Admin"]), updatePermission) // To Update Permission Data
  .delete(authorizePermissions(["Super Admin", "Admin"]), deletePermission); // To Delete Permission Data

// Export the router

module.exports = router;
