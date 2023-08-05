const { ObjectId } = require("mongodb");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  NotFoundError,
  CustomAPIError,
} = require("../errors/allErr");

// Model
const Department = require("../models/departmentModel");

// Audit Logs
const { createAudit } = require("./auditLogs");

// Projections For Queries

// Department
const projectionForDepartmentToGetIdAndName = {
  description: 0,
  managerName: 0,
  managerId: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForDepartmentToGetEmployees = {
  name: 0,
  description: 0,
  managerName: 0,
  managerId: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};

/* --------------------------------------------------------------------------------------------------------------- */

//                                     Filtering

const filter = async (req, res) => {
  // Retrieve the page number and limit of record on each page
  const { name, managerName, employees, sortBy, sortOrder, page, limit } =
    req.body;

  // Now Sort it
  const sortOrderValue = sortOrder === "asc" ? 1 : -1;

  // Skip to the mentioned
  const skip = (page - 1) * limit;

  // Pipeline
  const pipeline = [];

  // Search on the basis of Department Name
  if (name) {
    pipeline.push({
      $match: {
        name: { $regex: name, $options: "i" },
      },
    });
  }
  // Search on the basis of manager name
  if (managerName) {
    pipeline.push({
      $match: {
        managerName: managerName,
      },
    });
  }
  // Search on employees being present in department
  if (employees.length > 0) {
    pipeline.push(
      {
        $addfields: {
          employeeNames: "$employees.employeeName",
        },
      },
      {
        $match: {
          employeeNames: { $in: employees },
        },
      }
    );
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
        name: 1,
        description: 1,
        managerName: 1,
      },
    }
  );

  // Find the Departments
  const departments = await Department.aggregate(pipeline);

  // Send the Departments found
  res.status(StatusCodes.OK).json({
    msg: "All Departments",
    departments,
    totalDocs: departments.length,
  });
};

//                                    Function to Get All Departments name and Id only

const sendAllDepartments = async (req, res) => {
  // Get all Departments
  const departments = await Department.find(
    {},
    projectionForDepartmentToGetIdAndName
  ).sort({
    createdAt: -1,
  });

  // Send all Departments data
  res
    .status(StatusCodes.OK)
    .send({ msg: "All Departments with name and Id", departments });
};

//                                    Function to Create Department

const createDepartment = async (req, res) => {
  // Retrieve data
  const { name, description } = req.body;

  if (!name || !description) {
    throw new BadRequestError("Name and description cannot be Empty");
  }

  // Object
  const dep = {
    name,
    description,
  };

  // Create Department
  const department = await Department.create(dep);

  // Check if Department created successfully or not
  if (!department) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Send only non sensitive data
  const {
    managerName,
    managerId,
    employees,
    createdAt,
    updatedAt,
    __v,
    ...newDep
  } = department._doc;

  // Create Audit Log
  await createAudit(
    "Create Department",
    req.user.name,
    req.user.empId,
    newDep._id,
    `Department named ${newDep.name} is created`
  );

  // Send the Department details along with the message
  res.status(StatusCodes.OK).send({
    msg: "Department created Successfully",
    acknowledged: true,
    department: newDep,
  });
};

//                                    Function to Get Department Details By Id

const getDepartmentById = async (req, res) => {
  // Retrieve the Department Id
  const depId = req.params.depId;

  // Check if Department Id is given or not
  if (!depId) {
    throw new BadRequestError("Department Id cannot be empty");
  }

  // Check if Department Id is a valid Object Id
  if (!ObjectId.isValid(depId)) {
    throw new BadRequestError("Department Id is not valid");
  }

  // Find the Department Details
  const department = await Department.aggregate([
    {
      $match: {
        _id: new ObjectId(depId),
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        managerName: 1,
        employeeNames: "$employees.employeeName",
      },
    },
  ]);

  // Check if Department exists or not
  if (!department) {
    throw new NotFoundError("No such Department exists");
  }

  // Send the Department data with a message
  res.status(StatusCodes.OK).send({ msg: "Department Details", department });
};

//                                    Function to Update Department

const updateDepartment = async (req, res) => {
  // Retrieve the Department Id
  const depId = req.params.depId;

  // Check if Department Id is given or not
  if (!depId) {
    throw new BadRequestError("Department Id cannot be empty");
  }

  // Check if Department Id is a valid Object Id
  if (!ObjectId.isValid(depId)) {
    throw new BadRequestError("Department Id is not valid");
  }

  // Find the Department Details
  const dep = await Department.findOne(
    { _id: depId },
    projectionForDepartmentToGetIdAndName
  );

  // Check if Department exists or not
  if (!dep) {
    throw new NotFoundError("No such Department exists");
  }

  // Retrieve data
  const { name, description } = req.body;

  // Object
  const toUpdate = {};

  if (name) {
    toUpdate["name"] = name;
  }

  if (description) {
    toUpdate["description"] = description;
  }

  // Update Department Details
  const department = await Department.updateOne({ _id: depId }, toUpdate);

  // Check if Department updated successfully or not
  if (!department) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Find the Department Details
  const updatedDepartment = await Department.aggregate([
    {
      $match: {
        _id: new ObjectId(depId),
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        managerName: 1,
        employeeNames: "$employees.employeeName",
      },
    },
  ]);

  // Create Audit Log
  await createAudit(
    "Update Department",
    req.user.name,
    req.user.empId,
    updatedDepartment[0]._id,
    `Department named ${updatedDepartment[0].name} details are updated.`
  );

  // Send the Department details along with the message
  res.status(StatusCodes.OK).send({
    msg: "Department updated Successfully",
    acknowledged: true,
    department: updatedDepartment[0],
  });
};

//                                    Function to Delete Department Details

const deleteDepartment = async (req, res) => {
  // Retrieve the Department Id
  const depId = req.params.depId;

  // Check if Department Id is given or not
  if (!depId) {
    throw new BadRequestError("Department Id cannot be empty");
  }

  // Check if Department Id is a valid Object Id
  if (!ObjectId.isValid(depId)) {
    throw new BadRequestError("Department Id is not valid");
  }

  // Find the Department
  const department = await Department.findOne(
    { _id: depId },
    projectionForDepartmentToGetIdAndName
  );

  // Check if Department exists
  if (!department) {
    throw new NotFoundError("No such Department exists");
  }

  // Delete the Department data
  const deletedDepartment = await Department.deleteOne({ _id: depId });

  // Check if Department data deleted or not
  if (!deletedDepartment.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Create Audit Log
  await createAudit(
    "Delete Department",
    req.user.name,
    req.user._id,
    department._id,
    `Department named ${department.name} is deleted`
  );

  // Send the message
  res
    .status(StatusCodes.OK)
    .send({ msg: "Department data deleted successfully", acknowledged: true });
};

//  Note :- IMP                    Functionality too use else where

//                                 Function to Get All Employees By Department

const getAllDEmployees = async (req, res) => {
  // Retrieve the Department Id
  const depId = req.params.depId;

  // Check if Department Id is given or not
  if (!depId) {
    throw new BadRequestError("Department Id cannot be empty");
  }

  // Check if Department Id is a valid Object Id
  if (!ObjectId.isValid(depId)) {
    throw new BadRequestError("Department Id is not valid");
  }

  // Find the Department Details
  const empData = await Department.findOne(
    { _id: depId },
    projectionForDepartmentToGetEmployees
  );

  // Check if Department exists or not
  if (!empData) {
    throw new NotFoundError("No such Department exists");
  }

  // Send the Employees Names and Ids
  res
    .status(StatusCodes.OK)
    .send({ msg: "All Employees in this Department", employeesData: empData });
};

// Exporting Functionality

module.exports = {
  filter,
  sendAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDEmployees,
};
