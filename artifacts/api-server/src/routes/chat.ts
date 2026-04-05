import { Router, type IRouter } from "express";
import { z } from "zod";
import { handleMessage } from "../services/salesFlow.js";

const router: IRouter = Router();

const MessageSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  message: z.string().min(1, "message is required"),
});

router.post("/chat/message", async (req, res) => {
  const parsed = MessageSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { user_id, message } = parsed.data;

  const result = await handleMessage(user_id, message);

  res.json({ reply: result.reply, state: result.state });
});

export default router;
