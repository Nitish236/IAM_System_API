const mongoose = require("mongoose");

// Role Schema

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Role description is required"],
    },
    permissions: [
      {
        permissionName: { type: String },
      },
    ],
    employees: [
      {
        employeeName: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Export Role model

module.exports = mongoose.model("Role", roleSchema);
