import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: {
        type: String,
        enum: ["admin", "user","subadmin"],
        default: "user",
    },
    department: {
      type: String,
      enum: ["sales", "production", "Accounts", "R&D"],
      required: false,
    },
    employeeId: { type: String, required: false },
    profilePicture: { type: String, default: null },
    designation: { type: String, required: false },

    },{ timestamps: true })

const User = mongoose.model("User", userSchema)
export default User



