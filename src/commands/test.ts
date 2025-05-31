import { bot } from "../core/bot.ts";
import { testController } from "../controllers/test.ts";

// Команда для тестирования форматирования
bot.command("test", testController);
