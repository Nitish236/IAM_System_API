const { ObjectId } = require("mongodb");
const { StatusCodes } = require("http-status-codes");
// Errors
const { BadRequestError, CustomAPIError } = require("../errors/allErr");

// Model
const AuditLog = require("../models/auditLogModel");

// Projections for Queries
const projectionForAuditLog = {
  empId: 0,
  Id: 0,
  __v: 0,
};

/* -----------------------------------------------------------------------------------------------------------------*/

//                                 Function to Get All Audit Logs By filtering

const filter = async (req, res) => {
  // Retrieve the page number and limit of record on each page
  const { type, sortBy, sortOrder, page, limit } = req.body;

  // Now Sort it
  const sortOrderValue = sortOrder === "asc" ? 1 : -1;

  // Skip to the mentioned
  const skip = (page - 1) * limit;

  // Pipeline
  const pipeline = [];

  if (type) {
    pipeline.push({
      $match: {
        type: { $regex: type, $options: "i" },
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
        type: 1,
        userName: 1,
        action: 1,
      },
    }
  );

  // Find the Audit Logs
  const auditLogs = await AuditLog.aggregate(pipeline);

  // Send the Audit Logs found
  res.status(StatusCodes.OK).json({
    msg: "All Audit Logs",
    auditLogs,
    totalDocs: auditLogs.length,
  });
};

//                                 Function to Get Audit Log By Id

const getAuditLogById = async (req, res) => {
  // Retrieve the Audit Log Id
  const auditId = req.params.auditId;

  // Check if Audit Log is given or not
  if (!auditId) {
    throw new BadRequestError("Audit Log Id cannot be empty");
  }

  // Check if Audit Log is a valid Object Id
  if (!ObjectId.isValid(auditId)) {
    throw new BadRequestError("Audit Log Id is not valid");
  }

  // Find the Audit Log Details
  const auditLog = await AuditLog.findOne(
    { _id: auditId },
    projectionForAuditLog
  );

  // Check if Audit Log found or not
  if (!auditLog) {
    throw new NotFoundError("No such Audit Log exists");
  }

  // Send the Audit Log data with a message
  res.status(StatusCodes.OK).send({ msg: "Audit Log Details", auditLog });
};

/*                                 Extra Functions to use Else Where           */

//                                 Function to create Audit

const createAudit = async (type, userName, empId, Id, action) => {
  // Create Audit Log
  const audit = await AuditLog.create({
    type,
    userName,
    empId,
    Id,
    action,
  });

  // See if Audit Log created successfully
  if (!audit) {
    throw new CustomAPIError("Server error try after sometime");
  }

  const { _id, ...rest } = audit._doc;

  return _id;
};

// Export Functionality

module.exports = {
  filter,
  getAuditLogById,
  createAudit,
};
