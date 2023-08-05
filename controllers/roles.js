const { ObjectId } = require("mongodb");
const { StatusCodes } = require("http-status-codes");
// To handle different Errors
const {
  BadRequestError,
  NotFoundError,
  CustomAPIError,
} = require("../errors/allErr");

// Model
const Role = require("../models/roleModel");
const Permission = require("../models/permissionModel");

// Audit Logs
const { createAudit } = require("./auditLogs");

// Projections for Queries
// Role
const projectionForRoleToGetIdAndName = {
  description: 0,
  permissions: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
const projectionForRoleToGetPermissions = {
  name: 0,
  description: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};

/* -----------------------------------------------------------------------------------------------------------------------*/

//                                    Function to get all Roles using filtering

const filter = async (req, res) => {
  // Retrieve the page number and limit of record on each page
  const { name, permissions, sortBy, sortOrder, page, limit } = req.body;

  // Now Sort it
  const sortOrderValue = sortOrder === "asc" ? 1 : -1;

  // Skip to the mentioned
  const skip = (page - 1) * limit;

  // Pipeline
  const pipeline = [];

  // Search on the basis of the name of the role
  if (name) {
    pipeline.push({
      $match: {
        name: { $regex: name, $options: "i" },
      },
    });
  }
  // Search for Roles on that have specific Permissions
  if (permissions.length > 0) {
    pipeline.push(
      {
        $addFields: {
          permissionName: "$permissions.permissionName",
        },
      },
      {
        $match: {
          permissionName: { $in: permissions },
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
        permissionNames: 1,
      },
    }
  );

  // Find the Roles
  const roles = await Role.aggregate(pipeline);

  // Send the Roles found
  res.status(StatusCodes.OK).json({
    msg: "All Roles",
    roles,
    totalDocs: roles.length,
  });
};

//                                    Function to send All Roles name and id only

const sendAllRoles = async (req, res) => {
  // Get all Roles
  const roles = await Role.find({}, projectionForRoleToGetIdAndName).sort({
    createdAt: -1,
  });

  // Send all Roles data
  res.status(StatusCodes.OK).send({ msg: "All Roles with name and Id", roles });
};

//                                    Function to Create Role

const createRole = async (req, res) => {
  // Retrieve Role data
  const { name, description, permissionIds } = req.body;

  // Check if required fields are present or not
  if (!name || !description || !permissionIds || permissionIds.length == 0) {
    throw new BadRequestError(
      "Name, description, permissionIds cannot be empty"
    );
  }

  // Checking if the Permission Ids exists or not
  const { valid, Permissions } = await checkPermissionIds(permissionIds);

  if (!valid) {
    throw new BadRequestError("Some or all Permissions do not exist");
  }

  // Make Role object
  const roleObject = {
    name,
    description,
    permissions: Permissions,
  };

  // Create new Role
  const createdRole = await Role.create(roleObject);

  // Check is Role was created successfully
  if (!createdRole._doc._id) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Find the created Role
  const role = await Role.aggregate([
    {
      $match: {
        _id: createdRole._doc._id,
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        permissionNames: "$permissions.permissionName",
      },
    },
  ]);

  // Create Audit Log
  await createAudit(
    "Create Role",
    req.user.name,
    req.user.empId,
    newRole._id,
    `Role named ${newRole.name} is created.`
  );

  // Send the Role data with the message
  res.status(StatusCodes.OK).send({
    msg: "Role created Successfully",
    acknowledged: true,
    role: role[0],
  });
};

//                                    Function to Get Role By Id

const getRoleById = async (req, res) => {
  // Retrieve the Role Id
  const roleId = req.params.roleId;

  // Check if Role Id is given or not
  if (!roleId) {
    throw new BadRequestError("Role Id cannot be empty");
  }

  // Check if Role Id is a valid Object Id
  if (!ObjectId.isValid(roleId)) {
    throw new BadRequestError("Role Id is not valid");
  }

  // Find the Role Details
  const role = await Role.aggregate([
    {
      $match: {
        _id: new ObjectId(roleId),
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        permissionNames: "$permissions.permissionName",
        employeeNames: "$employees.employeeName",
      },
    },
  ]);

  // Check if Role found or not
  if (!role[0]) {
    throw new NotFoundError("No such Role exists");
  }

  // Send the Role data with a message
  res.status(StatusCodes.OK).send({ msg: "Role Details", role: role[0] });
};

//                                    Function to Update Role

const updateRole = async (req, res) => {
  // Retrieve the Role Id
  const roleId = req.params.roleId;

  // Check if Role Id is given or not
  if (!roleId) {
    throw new BadRequestError("Role Id cannot be empty");
  }

  // Check if Role Id is a valid Object Id
  if (!ObjectId.isValid(roleId)) {
    throw new BadRequestError("Role Id is not valid");
  }

  // Check if Role exists or not
  const role = await Role.findOne(
    { _id: roleId },
    projectionForRoleToGetPermissions
  );

  if (!role) {
    throw new NotFoundError("No such Role exists");
  }

  // Retrieve Role data to be updated
  const { name, description, addPermissions, removePermissions } = req.body;

  // Make object
  const setData = {};

  // Check if name is updated or not
  if (name) {
    setData["name"] = name;
  }

  // Check if description is updated or not
  if (description) {
    setData["description"] = description;
  }

  // Check the addPermission array is not empty and all the ids in it are valid
  if (addPermissions.length != 0) {
    await addPers(roleId, addPermissions, role.permissions);
  }

  // Check the removePermission array is not empty and all the ids in it are valid
  if (removePermissions.length != 0) {
    await removePers(roleId, removePermissions);
  }

  // Update setData object to Role
  if (Object.keys(setData).length !== 0) {
    const upRole = await Role.updateOne(
      { _id: roleId },
      { $set: setData },
      { new: true }
    );

    // Check if Role was updated successfully
    if (!upRole.acknowledged) {
      throw new CustomAPIError("Server error try after sometime");
    }
  }

  // Find the Updated role
  const updatedRole = await Role.aggregate([
    {
      $match: {
        _id: new ObjectId(roleId),
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        permissionNames: "$permissions.permissionName",
        employeeNames: "$employees.employeeName",
      },
    },
  ]);

  // Create Audit Log
  await createAudit(
    "Role Updated",
    req.user.name,
    req.user.empId,
    updatedRole._id,
    `Role named ${updatedRole.name} is updated.`
  );

  // Send the Role data with the message
  res.status(StatusCodes.OK).send({
    msg: "Role updated Successfully",
    acknowledged: true,
    role: updatedRole[0],
  });
};

//                                    Function to Delete Role

const deleteRole = async (req, res) => {
  // Retrieve the Role Id
  const roleId = req.params.roleId;

  // Check if Role Id is given or not
  if (!roleId) {
    throw new BadRequestError("Role Id cannot be empty");
  }

  // Check if Role Id is a valid Object Id
  if (!ObjectId.isValid(roleId)) {
    throw new BadRequestError("Role Id is not valid");
  }

  // Find the Role
  const role = await Role.findOne(
    { _id: roleId },
    projectionForRoleToGetIdAndName
  );

  // Check if Role exists
  if (!role) {
    throw new NotFoundError("No such Role exists");
  }

  // Delete the Role data
  const deletedRole = await Role.deleteOne({ _id: roleId });

  // Check if Role data deleted or not
  if (!deletedRole.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }

  // Create Audit Log
  await createAudit(
    "Role Deleted",
    req.user.name,
    req.user.empId,
    role._id,
    `Role named ${deletedRole.name} is deleted.`
  );

  // Send the message
  res
    .status(StatusCodes.OK)
    .send({ msg: "Role data deleted successfully", acknowledged: true });
};

/* ---------    Note :- IMP            Functionalities for above work                        */

//                        Function to Check the permissions Ids

const checkPermissionIds = async (permissionIds) => {
  // Check if all Ids are valid or not
  const isValidIds = permissionIds.every((id) => ObjectId.isValid(id));

  if (!isValidIds) {
    throw new BadRequestError("Object Ids of permissions are not valid");
  }

  // Convert the ids to Object Ids
  const ids = permissionIds.map((id) => new ObjectId(id));

  // Find all the Ids
  const Permissions = await Permission.aggregate([
    {
      $match: {
        _id: { $in: ids },
      },
    },
    {
      $project: {
        permissionName: "$name",
      },
    },
  ]);

  // Check if there are any missing Ids
  const missingIds = permissionIds.filter(
    (permId) => !Permissions.some((perm) => perm._id.toString() === permId)
  );

  // If all Permissions Ids found
  if (missingIds.length === 0) {
    return { valid: true, Permissions };
  }

  return { valid: false };
};

//                        Function to Add the Permission to Role

const addPers = async (roleId, permissionIds, permissions) => {
  const { valid, Permissions } = await checkPermissionIds(permissionIds);

  if (!valid) {
    throw new BadRequestError("Some or all Permission added does not exist");
  }

  // Determine the new permissions that are not already present
  const actualPermissions = Permissions.filter(
    (perm) => !permissions.includes(perm)
  );

  // Add new permissions if any
  if (actualPermissions.length > 0) {
    const pushData = {
      $addToSet: {
        permissions: { $each: actualPermissions },
      },
    };

    const updatedRole = await Role.updateOne({ _id: roleId }, pushData, {
      new: true,
    });

    // Check if Role was updated successfully
    if (!updatedRole.acknowledged) {
      throw new CustomAPIError("Server error try after sometime");
    }
  }
};

//                        Function to Remove Permission from Role

const removePers = async (roleId, permissionIds) => {
  const { valid, Permissions } = await checkPermissionIds(permissionIds);

  if (!valid) {
    throw new BadRequestError("Some or all Permission removed does not exist");
  }

  const ids = Permissions.map((perm) => perm._id);

  // Remove Permissions
  const pullData = {
    $pull: {
      permissions: { _id: { $in: ids } },
    },
  };

  const upRole = await Role.updateOne({ _id: roleId }, pullData, { new: true });

  // Check if Role was updated successfully
  if (!upRole.acknowledged) {
    throw new CustomAPIError("Server error try after sometime");
  }
};

// Export the functionality

module.exports = {
  filter,
  sendAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
