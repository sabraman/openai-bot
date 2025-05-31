import { bot } from "../core/bot.ts";
import { handleMessage } from "../controllers/interview.ts";

// Обрабатываем все текстовые сообщения
bot.on("message:text", handleMessage);
