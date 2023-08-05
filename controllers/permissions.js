const { StatusCodes } = require("http-status-codes");

// To handle different Errors
const {
  NotFoundError,
  CustomAPIError,
  BadRequestError,
} = require("../errors/allErr");

// Models
const Permission = require("../models/permissionModel");
const { ObjectId } = require("mongodb");

// Function to Create Audit Log
const { createAudit } = require("./auditLogs");

// Projections for Queries
const projectionForPermission = { createdAt: 0, updatedAt: 0, __v: 0 };
const projectionForPermissionToGetId = {
  name: 0,
  description: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForPermissionToGetIdAndName = {
  description: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};

/* -----------------------------------------------------------------------------------------------------------------------------------------------------*/

//                                    Function to Get All Permissions using Filter

const filter = async (req, res) => {
  // Retrieve the page number and limit of record on each page
  const { name, sortBy, sortOrder, page, limit } = req.body;

  // Now Sort it
  const sortOrderValue = sortOrder === "asc" ? 1 : -1;

  // Skip to the mentioned
  const skip = (page - 1) * limit;

  // Pipeline
  const pipeline = [];

  if (name) {
    pipeline.push({
      $match: {
        name: { $regex: name, $options: "i" },
      },
    });
  }

  pipeline.push(
    {
      $sort: {
        [sortBy]: sortOrderValue, // Sort the on the basis of createdAt and name
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
      },
    }
  );

  // Find the Permissions
  const permissions = await Permission.aggregate(pipeline);

  // Send the Permissions found
  res.status(StatusCodes.OK).json({
    msg: "All Permissions",
    permissions,
    totalDocs: permissions.length,
  });
};

//                                    Function to Send All Permissions with name and Id only

const sendAllPermissions = async (req, res) => {
  // Get all Permissions
  const permissions = await Permission.find(
    {},
    projectionForPermissionToGetIdAndName
  ).sort({
    createdAt: -1,
  });

  // Send all Permissions data
  res.status(StatusCodes.OK).json({ msg: "All Permissions", permissions });
};

//                                    Function to Create Permission

const createPermission = async (req, res) => {
  // Retrieve data
  const { name, description } = req.body;

  // Check if data is given or not
  if (!name || !description) {
    throw new BadRequestError("Name or description cannot be empty");
  }

  // Create Permission data object
  const permissionData = {
    name,
    description,
  };

  // Create new Permission
  const permission = await Permission.create(permissionData);

  // Check if Permission created successfully or not
  if (!permission) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Get only needed data
  const { __v, createdAt, updatedAt, ...newPermission } = permission._doc;

  // Create Audit Log
  await createAudit(
    "Create Permission",
    req.user.name,
    req.user.empId,
    newPermission._id,
    `Permission named ${newPermission.name} is created.`
  );

  // Send newly created Permission with a message
  res.status(StatusCodes.OK).json({
    msg: "Permission created successfully",
    acknowledged: true,
    permission: newPermission,
  });
};

//                                    Function to Get Permission By Id

const getPermissionById = async (req, res) => {
  // Retrieve Permission Id
  const permId = req.params.permId;

  // Check if Permission Id is given or not
  if (!permId) {
    throw new BadRequestError("Permission Id cannot be empty");
  }

  // Check if its a valid ObjectId or not
  if (!ObjectId.isValid(permId)) {
    throw new BadRequestError("Permission Id is not valid");
  }

  // Get Permission by Id
  const permission = await Permission.findOne({ _id: permId }, { __v: 0 });

  // Check if such Permission exits or not
  if (!permission) {
    throw new NotFoundError("No such Permission exists");
  }

  // Send the Permission data with a message
  res.status(StatusCodes.OK).json({ msg: "Permission data", permission });
};

//                                    Function to Update Permission

const updatePermission = async (req, res) => {
  // Retrieve Permission Id
  const permId = req.params.permId;

  // Check if Permission Id is given or not
  if (!permId) {
    throw new BadRequestError("Permission Id cannot be empty");
  }

  // Check if its a valid ObjectId or not
  if (!ObjectId.isValid(permId)) {
    throw new BadRequestError("Permission Id is not valid");
  }

  // Find if such Permission exists or not
  const permission = await Permission.findOne(
    { _id: permId },
    projectionForPermissionToGetId
  );

  if (!permission) {
    throw new NotFoundError("No such Permission exists");
  }

  // Retrieve data
  const { name, description } = req.body;

  // Data that needs to updated
  const dataToBeUpdated = {};

  // If fields are not empty then add them to be updated
  if (name) {
    dataToBeUpdated["name"] = name;
  }

  if (description) {
    dataToBeUpdated["description"] = description;
  }

  // Update the Permission
  const updatePermission = await Permission.updateOne(
    { _id: permId },
    { $set: dataToBeUpdated }
  );

  // Check if Permission updated successfully or not
  if (!updatePermission) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Get the updated data
  const updatedPermission = await Permission.findOne(
    { _id: permId },
    projectionForPermission
  );

  // Create Audit Log
  await createAudit(
    "Update Permission",
    req.user.name,
    req.user.empId,
    updatedPermission._id,
    `Permission named ${updatedPermission.name} is updated.`
  );

  // Send newly updated Permission with a message
  res.status(StatusCodes.OK).json({
    msg: "Permission updated successfully",
    acknowledged: true,
    permission: updatedPermission,
  });
};

//                                    Function to Delete Permission

const deletePermission = async (req, res) => {
  // Retrieve Permission Id
  const permId = req.params.permId;

  // Check if Permission Id is given or not
  if (!permId) {
    throw new BadRequestError("Permission Id cannot be empty");
  }

  // Check if its a valid ObjectId or not
  if (!ObjectId.isValid(permId)) {
    throw new BadRequestError("Permission Id is not valid");
  }

  // Find the Permission
  const permission = await Permission.findOne(
    { _id: permId },
    projectionForPermissionToGetIdAndName
  );

  // Check if Permission exists
  if (!permission) {
    throw new NotFoundError("No such Permission exists");
  }

  // Delete the Permission data
  const deletedPermission = await Permission.deleteOne({ _id: permId });

  // Check if Permission data deleted or not
  if (!deletedPermission.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Create Audit Log
  await createAudit(
    "Delete Permission",
    req.user.name,
    req.user.empId,
    permission._id,
    `Permission named ${permission.name} is deleted.`
  );

  // Send the message
  res
    .status(StatusCodes.OK)
    .json({ msg: "Permission data deleted successfully", acknowledged: true });
};

// Export the functionality

module.exports = {
  filter,
  sendAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};
