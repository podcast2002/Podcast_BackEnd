import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import UserModel from "../models/User";
import dotenv from "dotenv";

dotenv.config();

export const createAdminIfNotExists = async () => {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASS!;
  const name = "Admin";
  const phone = "0123456789";
  const role = "admin";

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const existingAdmin = await UserModel.find({ role: "admin" });
  if (existingAdmin.length > 0) {
    console.log("Admin user already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await UserModel.create({
    email,
    password: hashedPassword,
    name,
    phone,
    role,
  });

  console.log("Admin user created successfully");
};
