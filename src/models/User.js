const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String,  required:true },
    email: { type: String, unique: true, required:true },
    password: {type: String,  required:true},
    image: String,
    role: { type: String, default: "user" }
}, {timestamps:true}); // Ensure it maps to the correct collection

module.exports =  mongoose.model("User", userSchema);


