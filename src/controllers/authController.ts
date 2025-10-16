import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import User from "../models/User";

function generateAccessToken(userId: string, email: string, role: string) {
    const accessToken = jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    const refreshToken = uuidv4();
    return { accessToken, refreshToken };
}

async function setTokens(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true, // لازم true على production
        sameSite: "none", // لازم none عشان cross-domain
        domain: ".obl.ee",
        path: "/",
        maxAge: 60 * 60 * 1000, // 1 ساعة
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        domain: ".obl.ee",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
    });
}


export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone } = req.body;
        const existingUser = await User.findOne({
            $or: [
                { email },
                { phone }
            ]
        });

        if (existingUser) {
            res.status(400).json({ success: false, message: "User already exists" });
            return;

        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            email,
            password: hashedPassword,
            name,
            phone,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),

        });
        res.status(201).json({ success: true, message: "User created successfully", userId: newUser._id });
        return;
    } catch (error) {
        console.log("Error in register", error);
        res.status(500).json({ success: false, message: "Internal server error in register" });
        return;
    }
}


export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            res.status(400).json({ success: false, message: "Invalid credentials" });
            return;
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

        if (!isPasswordCorrect) {
            res.status(400).json({ success: false, message: "Invalid credentials" });
            return;
        }

        const { accessToken, refreshToken } = generateAccessToken(
            existingUser._id!.toString(),
            existingUser.email,
            existingUser.role
        );

        await setTokens(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            userInfo: {
                userId: existingUser._id!.toString(),
                email: existingUser.email,
                role: existingUser.role,
                name: existingUser.name,
                phone: existingUser.phone,
                createdAt: existingUser.createdAt,
                updatedAt: existingUser.updatedAt,
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.log("Error in login", error);
        res.status(500).json({ success: false, message: "Internal server error in login" });
    }
};



export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ success: false, message: "Invalid refresh token" });
            return;
        }

        const existingUser = await User.findOne({ refreshToken });
        if (!existingUser) {
            res.status(401).json({ success: false, message: "User not found" });
            return;
        }

        const { accessToken, refreshToken: newRefreshToken } = generateAccessToken(
            existingUser._id!.toString(),
            existingUser.email,
            existingUser.role
        );

        existingUser.refreshToken = newRefreshToken;
        await existingUser.save();

        await setTokens(res, accessToken, newRefreshToken);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            userInfo: {
                userId: existingUser._id!.toString(),
                email: existingUser.email,
                role: existingUser.role,
            },
        });
    } catch (error) {
        console.log("Error in refreshToken", error);
        res.status(500).json({ success: false, message: "Internal server error in refreshToken" });
    }
};


export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "User logged out successfully" });
    return;
}