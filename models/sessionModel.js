const mongoose = require('mongoose');

// Session Model

const sessionSchema = new mongoose.Schema({
  empId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [ true, 'Employee Id cannot be empty' ]
  },
  refreshToken: {
    type: String,
    required: [ true, 'Token cannot be empty' ]
  }
}, { timestamps: true } );



module.exports = mongoose.model('Session', sessionSchema);
