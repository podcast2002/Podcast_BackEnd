import mongoose, { Document, Schema } from "mongoose";

export interface User extends Document {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "user" | "admin";
    createdAt: Date;
    updatedAt: Date;
    refreshToken: string
}

const UserSchema: Schema<User> = new Schema(
    {
        name: { type: String },
        email: { type: String, unique: true, required: true },
        phone: { type: String, unique: true, required: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            required: true,
        },
        refreshToken: { type: String },

    },
    { timestamps: true }
);

const UserModel = mongoose.model<User>("User", UserSchema);

export default UserModel;
