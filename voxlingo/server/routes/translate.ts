import { Router } from "express";

export const translateRouter = Router();

translateRouter.post("/image", (_req, res) => {
  // TODO: Implement Gemini Vision translation in Camera Mode task
  res.json({ message: "Image translation endpoint placeholder" });
});
