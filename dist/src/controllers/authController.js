"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refreshAccessToken = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const User_1 = __importDefault(require("../models/User"));
function generateAccessToken(userId, email, role) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = (0, uuid_1.v4)();
    return { accessToken, refreshToken };
}
function setTokens(res, accessToken, refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, phone } = req.body;
        const existingUser = yield User_1.default.findOne({
            $or: [
                { email },
                { phone }
            ]
        });
        if (existingUser) {
            res.status(400).json({ success: false, message: "User already exists" });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = yield User_1.default.create({
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
    }
    catch (error) {
        console.log("Error in register", error);
        res.status(500).json({ success: false, message: "Internal server error in register" });
        return;
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const existingUser = yield User_1.default.findOne({ email });
        if (!existingUser) {
            res.status(400).json({ success: false, message: "Invalid credentials" });
            return;
        }
        const isPasswordCorrect = yield bcryptjs_1.default.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            res.status(400).json({ success: false, message: "Invalid credentials" });
            return;
        }
        const { accessToken, refreshToken } = generateAccessToken(existingUser._id.toString(), existingUser.email, existingUser.role);
        yield setTokens(res, accessToken, refreshToken);
        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            userInfo: {
                userId: existingUser._id.toString(),
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
    }
    catch (error) {
        console.log("Error in login", error);
        res.status(500).json({ success: false, message: "Internal server error in login" });
    }
});
exports.login = login;
const refreshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ success: false, message: "Invalid refresh token" });
            return;
        }
        const existingUser = yield User_1.default.findOne({ refreshToken });
        if (!existingUser) {
            res.status(401).json({ success: false, message: "User not found" });
            return;
        }
        const { accessToken, refreshToken: newRefreshToken } = generateAccessToken(existingUser._id.toString(), existingUser.email, existingUser.role);
        existingUser.refreshToken = newRefreshToken;
        yield existingUser.save();
        yield setTokens(res, accessToken, newRefreshToken);
        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            userInfo: {
                userId: existingUser._id.toString(),
                email: existingUser.email,
                role: existingUser.role,
            },
        });
    }
    catch (error) {
        console.log("Error in refreshToken", error);
        res.status(500).json({ success: false, message: "Internal server error in refreshToken" });
    }
});
exports.refreshAccessToken = refreshAccessToken;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "User logged out successfully" });
    return;
});
exports.logout = logout;
