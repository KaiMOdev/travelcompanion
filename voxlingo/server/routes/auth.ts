import { Router, Request, Response } from "express";

export const authRouter = Router();

authRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing or invalid token" });
      return;
    }

    if (token.length < 20) {
      res.status(401).json({ error: "Invalid token format" });
      return;
    }

    res.json({ verified: true, message: "Token accepted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});
