const mongoose = require("mongoose");

// Permission Model

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Permission name is required"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Permission description is required"],
    },
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model("Permission", permissionSchema);
