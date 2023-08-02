const mongoose = require("mongoose");

// Department Schema

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Department description is required"],
    },
    managerName: {
      type: String,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    employees: [
      {
        employeeName: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Department Model

module.exports = mongoose.model("Department", departmentSchema);
