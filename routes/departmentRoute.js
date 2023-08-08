const Router = require("express").Router;

const router = Router();

const {
  filter,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getAllDEmployees,
  sendAllDepartments,
} = require("../controllers/departments");

const {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/users");

const { authorizePermissions } = require("../middleware/authentication");

// Routers

// Departments

router
  .route("/")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Data Entry Operator"]),
    sendAllDepartments
  ) // Send all Departments
  .post(authorizePermissions(["Super Admin", "Admin"]), createDepartment); // Create Department

router
  .route("/search")
  .post(authorizePermissions(["Super Admin", "Admin"]), filter);

router
  .route("/:depId")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Department Manager"]),
    getDepartmentById
  ) // Get all Department By Id
  .put(authorizePermissions(["Super Admin", "Admin"]), updateDepartment) // Update Department Details
  .delete(authorizePermissions(["Super Admin", "Admin"]), deleteDepartment); // Delete Department

/* ---------------------------------------    Particular Departments      ----------------------------------------- */

// Department Routes for a Particular Department

router
  .route("/:depId/emp")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Department Manager"]),
    getAllDEmployees
  ) // Get All Employees in the Specified department
  .post(authorizePermissions(["Super Admin", "Admin"]), createUser); // Create Employee in the Specified Department

router
  .route("/:depId/emp/:empId")
  .get(
    authorizePermissions(["Super Admin", "Admin", "Department Manager"]),
    getUserById
  ) // Get the Employee Details By Id
  .put(authorizePermissions(["Super Admin", "Admin"]), updateUser) // Update the Employee Details
  .delete(authorizePermissions(["Super Admin", "Admin"]), deleteUser); // Delete the Employee Details

// Export Router

module.exports = router;
