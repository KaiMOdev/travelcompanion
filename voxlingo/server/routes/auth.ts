import { Router, Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export const authRouter = Router();

authRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing or invalid token" });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ verified: true, uid: decoded.uid });
  } catch (error: any) {
    if (error.code === "auth/id-token-expired") {
      res.status(401).json({ error: "Token expired" });
    } else if (error.code === "auth/argument-error" || error.code === "auth/id-token-revoked") {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(401).json({ error: "Token verification failed" });
    }
  }
});
