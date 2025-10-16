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
exports.createAdminIfNotExists = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const createAdminIfNotExists = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASS;
    const name = "Admin";
    const phone = "0123456789";
    const role = "admin";
    if (mongoose_1.default.connection.readyState === 0) {
        yield mongoose_1.default.connect(process.env.DATABASE_URL);
    }
    const existingAdmin = yield User_1.default.find({ role: "admin" });
    if (existingAdmin.length > 0) {
        console.log("Admin user already exists");
        return;
    }
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    yield User_1.default.create({
        email,
        password: hashedPassword,
        name,
        phone,
        role,
    });
    console.log("Admin user created successfully");
});
exports.createAdminIfNotExists = createAdminIfNotExists;
