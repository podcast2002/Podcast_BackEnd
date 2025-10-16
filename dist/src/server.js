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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./config/db"));
const seed_1 = require("./config/seed");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const podcastRoutes_1 = __importDefault(require("./routes/podcastRoutes"));
const episodeRoutes_1 = __importDefault(require("./routes/episodeRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 6002;
const corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://podcast-front-end.vercel.app",
        "https://podcast-gilt-tau.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "Authorization"],
};
app.use((0, cors_1.default)(corsOptions));
app.set("trust proxy", 1);
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
    },
});
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", apiLimiter, authRoutes_1.default);
app.use('/api/podcast', podcastRoutes_1.default);
app.use('/api/episode', episodeRoutes_1.default);
app.get("/", (req, res) => {
    res.json({
        message: "PodCast API is running with MongoDB Atlas",
        version: "2.8.0",
        status: "active",
    });
});
app.get("*", (req, res) => {
    res.send("The route does not exist");
});
app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({
        statusCode: error.statusCode || 500,
        message: error.message || "Internal Server Error",
        status: error.statusText || "error",
        code: error.statusCode || 500,
        data: null,
    });
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_1.default)();
        yield (0, seed_1.createAdminIfNotExists)();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Database connection failed", error);
    }
}))();
