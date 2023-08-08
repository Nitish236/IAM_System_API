const { ObjectId } = require("mongodb");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  NotFoundError,
  CustomAPIError,
} = require("../errors/allErr");

// Models
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const Department = require("../models/departmentModel");

// To create Audit
const { createAudit } = require("./auditLogs");

// Global variable for projections
// Department
const projectionForDepartment = {
  name: 0,
  description: 0,
  managerName: 0,
  managerId: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// Role
const projectionForRole = {
  name: 0,
  description: 0,
  permissions: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// User
const projectionForUser = {
  username: 0,
  password: 0,
  roleId: 0,
  departmentId: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForUserToGetNameAndIds = {
  username: 0,
  email: 0,
  password: 0,
  role: 0,
  department: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForUserToGetRoleAndDep = {
  username: 0,
  email: 0,
  password: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};

//                                    Function to Get Employees

const filter = async (req, res) => {
  // Retrieve the page number and limit of record on each page
  const { name, role, department, sortBy, sortOrder, page, limit } = req.body;

  // Now Sort it
  const sortOrderValue = sortOrder === "asc" ? 1 : -1;

  // Skip to the mentioned
  const skip = (page - 1) * limit;

  // Pipeline
  const pipeline = [];

  // Search on the basis of the name of the employee
  if (name) {
    pipeline.push(
      {
        $addFields: { name: { $concat: ["$firstName", " ", "$lastName"] } },
      },
      {
        $match: {
          name: { $regex: name, $options: "i" },
        },
      }
    );
  }
  // Search on the basis of the role
  if (role) {
    pipeline.push({
      $match: {
        role: { $regex: role, $options: "i" },
      },
    });
  }
  // Search on the basis of the department
  if (department) {
    pipeline.push({
      $match: {
        department: { $regex: department, $options: "i" },
      },
    });
  }

  pipeline.push(
    {
      $sort: {
        [sortBy]: sortOrderValue,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        department: 1,
      },
    }
  );

  // Find the Employees
  const users = await User.aggregate(pipeline);

  // Send the Employees found
  res.status(StatusCodes.OK).json({
    msg: "All Employees",
    employees: users,
    totalDocs: users.length,
  });
};

//                                    Function to Create Employee

const createUser = async (req, res) => {
  // Retrieve Employee data
  const { firstName, lastName, email, role, department } = req.body;

  // Check if required fields are present or not
  if (!firstName || !lastName || !email || !role || !department) {
    throw new BadRequestError(
      "First, last name, email , role and department cannot be empty"
    );
  }

  // Get Role Id
  const roleID = await getRoleId(role);

  // Get department id
  const departmentID = await getDepartmentId(department);

  // Make Employee object
  const user = {
    firstName,
    lastName,
    username: email,
    email,
    role,
    department,
    roleId: roleID["_id"],
    departmentId: departmentID["_id"],
  };

  // Create new Employee
  const createdUser = await User.create(user);

  // Send only non sensitive data
  const {
    password,
    username,
    roleId,
    departmentId,
    createdAt,
    updatedAt,
    __v,
    ...newUser
  } = createdUser._doc;

  // Check is User was created successfully
  if (!newUser) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Adding Employee to the Department
  await addToDepartment(
    departmentID,
    `${newUser.firstName} ${newUser.lastName}`,
    newUser._id
  );

  // Adding Employee to the Role
  await addToRole(
    roleID,
    `${newUser.firstName} ${newUser.lastName}`,
    newUser._id
  );

  // If user created is Manager then we need to update the manager of the Department
  if (newUser.role === "Manager") {
    await makeManager(
      `${newUser.firstName} ${newUser.lastName}`,
      newUser._id,
      departmentID
    );
  }

  // Create Audit Log
  await createAudit(
    "Employee Created",
    req.user.name,
    req.user.empId,
    newUser._id,
    `New Employee named ${
      firstName + " " + lastName
    } is Created having role of ${role} in the ${department} Department.`
  );

  // Send the Employee data with the message
  res.status(StatusCodes.OK).send({
    msg: "Employee created Successfully",
    acknowledged: true,
    employee: newUser,
  });
};

//                                    Function to Get Employee Data By Id

const getUserById = async (req, res) => {
  // Retrieve the Employee Id
  const empId = req.params.empId;

  // Check if Employee Id is given or not
  if (!empId) {
    throw new BadRequestError("Employee Id cannot be empty");
  }

  // Check if Employee Id is a valid Object Id
  if (!ObjectId.isValid(empId)) {
    throw new BadRequestError("Employee Id is not valid");
  }

  // Find the Employee Details
  const user = await User.findOne({ _id: empId }, projectionForUser);

  // Check if Employee found or not
  if (!user) {
    throw new NotFoundError("No such Employee exists");
  }

  // Send the Employee data with a message
  res.status(StatusCodes.OK).send({ msg: "Employee Details", employee: user });
};

//                                    Function to Update Employee Data

const updateUser = async (req, res) => {
  // Retrieve Employee Id
  const empId = req.params.empId;

  // Retrieve the Employee data that needs to be updated
  const data = req.body;

  // Check if Employee Id is given or not
  if (!empId) {
    throw new BadRequestError("Employee Id cannot be empty");
  }

  // Check if Employee Id is a valid Object Id
  if (!ObjectId.isValid(empId)) {
    throw new BadRequestError("Employee Id is not valid");
  }

  // These Fields can only be updated,   also insures that no extra fields included
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "role",
    "department",
  ];

  // Data to be updated, add the fields and data in it
  const dataToBeUpdated = {};

  // Traverse to find the fields that are allowed to update, add the field and its value if its not empty
  for (const key in data) {
    if (allowedFields.includes(key) && data[key]) {
      dataToBeUpdated[key] = data[key];
    }
  }

  // Get old data of the Employee
  const oldData = await User.findOne(
    { _id: empId },
    projectionForUserToGetRoleAndDep
  );

  if (!oldData) {
    throw new NotFoundError("No such Employee exists");
  }

  // Check if email changed then change username also
  if (
    "email" in dataToBeUpdated &&
    oldData.email !== dataToBeUpdated["email"]
  ) {
    dataToBeUpdated["username"] = dataToBeUpdated["email"];
  }

  // Check is Role is updated or not
  if ("role" in dataToBeUpdated && oldData.role !== dataToBeUpdated["role"]) {
    const roleId = await getRoleId(dataToBeUpdated.role);

    dataToBeUpdated["roleId"] = roleId._id; // Add the Role Id field
  }

  // Check if Department is updated or not
  if (
    "department" in dataToBeUpdated &&
    oldData.department !== dataToBeUpdated["department"]
  ) {
    const departmentId = await getDepartmentId(dataToBeUpdated.department);

    dataToBeUpdated["departmentId"] = departmentId._id; // Add the Department Id field
  }

  // Update the Employee Data
  const updatedUserData = await User.updateOne(
    { _id: empId },
    { $set: dataToBeUpdated },
    { new: true }
  );

  // Check if Employee data updated successfully or not
  if (!updatedUserData.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Get updated Employee Data
  const updatedUser = await User.findOne({ _id: empId }, projectionForUser);

  // Add the user Id to the Department and remove from Old one
  if ("department" in dataToBeUpdated) {
    await removeFromDepartment(oldData.departmentId, oldData._id); // Remove Function

    await addToDepartment(
      dataToBeUpdated.departmentId,
      `${oldData.firstName} ${oldData.lastName}`,
      oldData._id
    ); // Add Function
  }

  // Add the user Id to the Role and remove from Old one
  if ("role" in dataToBeUpdated) {
    await removeFromRole(oldData.roleId, oldData._id); // Remove Function

    await addToRole(
      dataToBeUpdated.roleId,
      `${oldData.firstName} ${oldData.lastName}`,
      oldData._id
    ); // Add Function
  }

  // If user updated role is Manager then we need to update the manager of the Department
  if (
    "role" in dataToBeUpdated &&
    dataToBeUpdated.role === "Department Manager"
  ) {
    await makeManager(
      `${oldData.firstName} ${oldData.lastName}`,
      oldData._id,
      oldData.departmentId
    );
  }

  // Create Audit Log
  await createAudit(
    "Employee Updated",
    req.user.name,
    req.user.empId,
    updatedUser._id,
    `Employee named ${
      updatedUser.firstName + " " + updatedUser.lastName
    } details are updated.`
  );

  // Send the updated data along with the message
  res.status(StatusCodes.OK).send({
    msg: "Employee data updated Successfully",
    acknowledged: true,
    employee: updatedUser,
  });
};

//                                    Function to Delete Employee Data

const deleteUser = async (req, res) => {
  // Retrieve the Employee Id
  const empId = req.params.empId;

  // Check if Employee Id is given or not
  if (!empId) {
    throw new BadRequestError("Employee Id cannot be empty");
  }

  // Check if Employee Id is a valid Object Id
  if (!ObjectId.isValid(empId)) {
    throw new BadRequestError("Employee Id is not valid");
  }

  // Find the Employee
  const user = await User.findOne(
    { _id: empId },
    projectionForUserToGetNameAndIds
  );

  // Check if Employee exists
  if (!user) {
    throw new NotFoundError("No such Employee exists");
  }

  // Delete the Employee data
  const deletedUser = await User.deleteOne({ _id: empId });

  // Check if Employee data deleted or not
  if (!deletedUser.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Remove from Department
  removeFromDepartment(user.departmentId, empId);

  // Remove from Role
  removeFromRole(user.roleId, empId);

  // Create Audit Log
  await createAudit(
    "Employee Deleted",
    req.user.name,
    req.user.empId,
    user._id,
    `Employee with employee Id ${user._id} was deleted.`
  );

  // Send the message
  res
    .status(StatusCodes.OK)
    .send({ msg: "Employee data deleted successfully", acknowledged: true });
};

/*       Note :- IMP                  Functionalities for above work                        */

//                         Function to Get Role Id

const getRoleId = async (roleName) => {
  // Find Role Id
  const roleID = await Role.findOne({ name: roleName }, projectionForRole);

  // Check if the Role exist
  if (!roleID) {
    throw new BadRequestError("No such Role exists");
  }

  return roleID;
};

//                         Function to Get Department Id

const getDepartmentId = async (departmentName) => {
  // Find department id
  const departmentID = await Department.findOne(
    { name: departmentName },
    projectionForDepartment
  );

  // Check if the Department exists
  if (!departmentID) {
    throw new BadRequestError("No such Department exists");
  }

  return departmentID;
};

//                        Function to Add the Employee to New Department

const addToDepartment = async (departmentID, name, userId) => {
  // Add the Employee Id to the Department
  const addedInDep = await Department.findByIdAndUpdate(departmentID, {
    $push: { employees: { employeeName: name, _id: userId } },
    projectionForDepartment,
  });

  // Check if added successfully
  if (!addedInDep) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

//                        Function to Add the Employee to New role

const addToRole = async (roleID, name, userId) => {
  // Add the Employee Id to the Role
  const addedInRole = await Role.findByIdAndUpdate(roleID, {
    $push: { employees: { employeeName: name, _id: userId } },
    projectionForRole,
  });

  // Check if added successfully
  if (!addedInRole) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

//                        Function to remove from Old Department

const removeFromDepartment = async (departmentID, userId) => {
  // Remove the Employee Id to the Department
  const removedFromDep = await Department.findByIdAndUpdate(departmentID, {
    $pull: { employees: { _id: userId } },
    projectionForDepartment,
  });

  // Check if added successfully
  if (!removedFromDep) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

//                        Function to remove from Old role

const removeFromRole = async (roleID, userId) => {
  // Add the Employee Id to the Role
  const removedFromRole = await Role.findByIdAndUpdate(roleID, {
    $pull: { employees: { _id: userId } },
    projectionForRole,
  });

  // Check if added successfully
  if (!removedFromRole) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

/*                                   Functionalities For Manager                                       */

const makeManager = async (empName, empId, depId) => {
  const department = await Department.findByIdAndUpdate(depId, {
    $set: { managerName: empName, managerId: empId },
    projectionForDepartment,
  });

  if (!department) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

// Export Functionality

module.exports = {
  filter,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
