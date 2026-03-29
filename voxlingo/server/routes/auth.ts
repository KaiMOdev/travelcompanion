import { Router } from "express";

export const authRouter = Router();

authRouter.post("/verify", (_req, res) => {
  // TODO: Implement Firebase token verification in Context & Polish task
  res.json({ message: "Auth endpoint placeholder" });
});
