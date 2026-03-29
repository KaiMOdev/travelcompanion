import { Router, Request, Response } from "express";
import { translateImageWithGemini } from "../services/geminiVision";
import { rateLimiter } from "../middleware/rateLimit";

export const translateRouter = Router();

translateRouter.post(
  "/image",
  rateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { image, targetLang } = req.body;

      if (!image || typeof image !== "string") {
        res.status(400).json({ error: "Missing or invalid 'image' field (base64 string)" });
        return;
      }

      if (!targetLang || typeof targetLang !== "string") {
        res.status(400).json({ error: "Missing or invalid 'targetLang' field" });
        return;
      }

      const result = await translateImageWithGemini(image, targetLang);
      res.json(result);
    } catch (error: any) {
      console.error("Image translation error:", error);
      res.status(500).json({
        error: error.message || "Failed to translate image",
      });
    }
  }
);
