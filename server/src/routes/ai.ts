import { Router } from "express";
import multer from "multer";
import { extractNutrition, chat, getChatHistory } from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.use(authenticate);
router.post("/extract-nutrition", upload.single("image"), extractNutrition as any);
router.post("/chat", chat as any);
router.get("/chat/history", getChatHistory as any);

export default router;
