const mongoose = require("mongoose");

// Audit Log Schema

const auditLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Type of Audit is required"],
    },
    userName: {
      // User's name performing audit
      type: String,
    },
    empId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee Id is required"], // User's Id performing Audit
    },
    Id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Id is required"], // Id of the document which is Audited
    },
    action: {
      type: String,
      required: [true, "Action is required"],
    },
  },
  { timestamps: true }
);

// Export AuditLog model

module.exports = mongoose.model("AuditLog", auditLogSchema);
