import { type Context } from "../../types/session.ts";
import { formatMessage } from "../../utils/formatting.ts";
import { QuickResponseService } from "./service.ts";
import { logger } from "../../utils/logger.ts";

const quickResponseService = new QuickResponseService();

export const handleMessage = async (ctx: Context) => {
  const messageText = ctx.message?.text;
  if (!messageText || !ctx.chat) return;

  // Показываем только "печатает" без отправки промежуточных сообщений
  await ctx.replyWithChatAction("typing");

  try {
    // Получаем ответ от сервиса
    const responseText = await quickResponseService.generateQuickResponse(
      messageText
    );

    if (!responseText) {
      logger.error(
        "Не удалось получить ответ от сервиса (quickResponseService.generateQuickResponse вернул null)"
      );
      await ctx.reply(
        "К сожалению, не удалось получить ответ. Пожалуйста, попробуйте еще раз."
      );
      return;
    }

    // Используем полученный текст напрямую
    const accumulatedText = responseText;

    logger.info("Получен полный ответ от сервиса", {
      length: accumulatedText.length,
    });

    // Очищаем и отправляем ответ, только если он не пустой
    if (accumulatedText && accumulatedText.trim().length > 0) {
      // Агрессивная очистка от форматирования и структурирования
      const cleanedText = accumulatedText
        .replace(/^#+\s+/gm, "") // удаляем заголовки Markdown (строки, начинающиеся с #)
        .replace(/\*\*/g, "") // удаляем двойные звездочки
        .replace(/\*/g, "") // удаляем одиночные звездочки
        .replace(/•/g, "-") // заменяем спецсимвол маркированного списка на дефис
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // удаляем URL-ссылки, оставляя только текст
        .replace(/`([^`]+)`/g, "$1") // удаляем обрамление кода
        .replace(/__(.*?)__/g, "$1") // удаляем подчеркивание
        .replace(/\[(.*?)\]/g, "$1") // удаляем квадратные скобки
        .replace(/Основное определение:/gi, "") // удаляем стандартные заголовки (на всякий случай)
        .replace(/Ключевые характеристики:/gi, "")
        .replace(/Дополнительная информация:/gi, "")
        .replace(/Полезные ресурсы:/gi, "")
        .replace(/\n{3,}/g, "\n\n") // заменяем 3+ переносов строк на двойной перенос
        .trim(); // удаляем пробелы в начале и конце

      if (cleanedText.trim().length === 0) {
        logger.warn("После очистки текст стал пустым");
        await ctx.reply(
          "К сожалению, не удалось сформировать понятный ответ на ваш вопрос."
        );
        return;
      }

      // Максимальная длина сообщения в Telegram примерно 4096 символов
      const MAX_MESSAGE_LENGTH = 4000;

      try {
        // Ограничиваем длину сообщения, если оно слишком длинное
        if (cleanedText.length > MAX_MESSAGE_LENGTH) {
          logger.info("Текст ответа превышает максимальную длину, обрезаем");
          const shortenedText = cleanedText.substring(
            0,
            MAX_MESSAGE_LENGTH - 5
          ); // Просто обрезаем без доп. сообщения

          // Отправляем ОДНО сообщение с сокращенным текстом
          await ctx.reply(shortenedText);
          logger.info("Отправлен сокращенный ответ из-за ограничений длины");
        } else {
          // Отправляем ОДНО сообщение с полным текстом
          await ctx.reply(cleanedText);
          logger.info("Ответ успешно отправлен");
        }
      } catch (sendError) {
        logger.error("Ошибка при отправке ответа", {
          error:
            sendError instanceof Error ? sendError.message : String(sendError),
        });

        try {
          // В случае ошибки пробуем отправить очень короткое сообщение без форматирования
          await ctx.reply(
            "Извините, я не могу корректно сформулировать ответ на ваш вопрос."
          );
        } catch (finalError) {
          logger.error("Критическая ошибка при отправке запасного сообщения", {
            error:
              finalError instanceof Error
                ? finalError.message
                : String(finalError),
          });
        }
      }
    } else {
      logger.warn("Получен пустой ответ от сервиса");
      await ctx.reply(
        "К сожалению, не удалось сформировать ответ на ваш вопрос."
      );
    }
  } catch (error) {
    logger.error("Общая ошибка при обработке сообщения", {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      await ctx.reply(
        "Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз."
      );
    } catch (replyError) {
      logger.error("Не удалось отправить сообщение об ошибке", {
        error:
          replyError instanceof Error ? replyError.message : String(replyError),
      });
    }
  }
};
