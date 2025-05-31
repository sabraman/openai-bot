import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { bot } from "./infrastructure/bot/instance.ts";
import { startController } from "./features/start/controller.ts";
import { handleMessage } from "./features/quickResponse/controller.ts";
import { registerChannelHandlers } from "./features/channelPosts/controller.ts";
import { logger } from "./utils/logger.ts";

// Регистрируем основное меню
import { mainMenu } from "./features/menu/main-menu.ts";

// Импортируем команду отладки
import "./commands/debug.ts";

// Обработчик команды /start
bot.command("start", (ctx) => startController(ctx));

// Обработчик сообщений
bot.on("message:text", handleMessage);

// Регистрируем обработчики для постов в канале
registerChannelHandlers();

// Запускаем бота
bot.start({
  onStart: () => {
    logger.info(`Бот @${bot.botInfo.username} успешно запущен`);
    logger.info("Бот готов обрабатывать сообщения в каналах и ответы на них");
  },
});
