import {
  Bot,
  GrammyError,
  HttpError,
} from "https://deno.land/x/grammy@v1.35.0/mod.ts";
import { hydrateReply } from "https://deno.land/x/grammy_parse_mode@1.11.1/mod.ts";
import { autoQuote } from "https://deno.land/x/grammy_autoquote@v2.0.8/mod.ts";
import { type Context } from "../../types/session.ts";
import { mainMenu } from "../../features/menu/main-menu.ts";
import {
  configureSession,
  configureParseMode,
  handleBotError,
} from "./config.ts";
import { logger } from "../../utils/logger.ts";

// Определяем токен, полученный от @BotFather в Telegram
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN не задан в переменных окружения");
}

// Создаем экземпляр бота
export const bot = new Bot<Context>(BOT_TOKEN);

// Устанавливаем плагины
bot.use(configureSession(bot.token));
bot.use(hydrateReply);
bot.use(mainMenu);

// Добавляем плагин autoquote для автоматического ответа на сообщения
bot.use(autoQuote());

// Устанавливаем режим разбора по умолчанию
bot.api.config.use(configureParseMode());

// Глобальный обработчик ошибок
bot.catch(handleBotError);
