import { bot } from "../infrastructure/bot/instance.ts";
import { getOpenAIConfig } from "../config/openai.ts";
import { checkOpenRouterStatus } from "../utils/api-status.ts";
import { formatMessage } from "../utils/formatting.ts";

// Команда для проверки API
bot.command("debug", async (ctx) => {
  try {
    await ctx.reply(formatMessage("⌛️ Проверяю статус API..."), {
      parse_mode: "MarkdownV2",
    });

    const config = getOpenAIConfig();
    const isApiAvailable = await checkOpenRouterStatus(config.apiKey);

    if (isApiAvailable) {
      await ctx.reply(
        formatMessage(
          "✅ API доступно и работает корректно! Доступные модели выведены в консоль."
        ),
        { parse_mode: "MarkdownV2" }
      );
    } else {
      await ctx.reply(
        formatMessage(
          "❌ Проблема с доступом к API. Проверьте ключ и параметры подключения."
        ),
        { parse_mode: "MarkdownV2" }
      );
    }
  } catch (error) {
    console.error("Ошибка при выполнении команды debug:", error);
    await ctx.reply(formatMessage("⚠️ Произошла ошибка при проверке API."), {
      parse_mode: "MarkdownV2",
    });
  }
});
