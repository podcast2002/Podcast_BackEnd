import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role?: string };

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    (req as any).user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
