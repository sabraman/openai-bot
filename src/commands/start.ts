import { bot } from "../core/bot.ts";
import { startController } from "../controllers/start.ts";

// Команда /start показывает общую информацию
bot.command("start", startController);
