"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyAdmin = (req, res, next) => {
    var _a, _b;
    let token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token && ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.accessToken)) {
        token = req.cookies.accessToken;
    }
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};
exports.verifyAdmin = verifyAdmin;
