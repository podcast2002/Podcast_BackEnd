import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";
import { createAdminIfNotExists } from './config/seed';
import rateLimit from 'express-rate-limit';


import authRoutes from "./routes/authRoutes";
import podcastRoutes from './routes/podcastRoutes';
import EpisodeRoutes from './routes/episodeRoutes';
const app = express();
const PORT = process.env.PORT || 6002;
app.set("trust proxy", 1);

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

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false, 
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", apiLimiter, authRoutes);
app.use('/api/podcast',podcastRoutes);
app.use('/api/episode',EpisodeRoutes)

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

app.use(
  (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(error.statusCode || 500).json({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error",
      status: error.statusText || "error",
      code: error.statusCode || 500,
      data: null,
    });
  }
);

(async () => {
  try {
    await connectDB();
    await createAdminIfNotExists();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed", error);
  }
})();
