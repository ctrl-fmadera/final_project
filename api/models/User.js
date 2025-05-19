const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, sparse: true }, // sparse allows some users to not have email
  mobileNumber: { type: String },
  birthday: { type: String }, // consider Date type if you want real date validation
}, { timestamps: true });

const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;
