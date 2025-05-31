import { Context } from "../../types/session.ts";
import { bot } from "../../infrastructure/bot/instance.ts";
import { generateResponse } from "./service.ts";
import { ContentType } from "./types.ts";
import { logger } from "../../utils/logger.ts";
import {
  isChannelEnabled,
  CHANNEL_RESPONSE_DELAY,
  REPLY_RESPONSE_DELAY,
  getDiscussionGroupId,
} from "./config.ts";

// Глобальный кэш для хранения информации о постах канала и их сообщениях в группе обсуждений
const channelPostCache = new Map<
  string,
  {
    channelId: string;
    groupId: string;
    channelMessageId: number;
    groupMessageId?: number;
  }
>();

/**
 * Обработчик новых сообщений в канале
 * @param ctx Контекст сообщения
 */
export async function handleChannelPost(ctx: Context) {
  try {
    if (!ctx.channelPost) return;

    const channelId = ctx.channelPost.chat.id.toString();
    const messageId = ctx.channelPost.message_id;

    // Проверяем, включена ли обработка для этого канала
    if (!isChannelEnabled(channelId)) {
      logger.debug(`Канал ${channelId} не включен в список разрешенных`);
      return;
    }

    logger.info("Получен пост из канала", {
      channelId,
      messageId: messageId,
    });

    // Получаем ID группы обсуждения для этого канала
    const discussionGroupId = getDiscussionGroupId(channelId);

    if (!discussionGroupId) {
      logger.warn(`Не найден ID группы обсуждения для канала ${channelId}`);
      return;
    }

    // Определяем тип контента
    let contentType: ContentType = "unknown";
    let mediaContent = "";

    if (ctx.channelPost.text) {
      contentType = "text";
      mediaContent = ctx.channelPost.text;
    } else if (ctx.channelPost.photo) {
      contentType = "photo";
      // Для фото можно получить подпись, если она есть
      mediaContent = ctx.channelPost.caption || "";
    } else if (ctx.channelPost.video) {
      contentType = "video";
      mediaContent = ctx.channelPost.caption || "";
    } else {
      logger.info("Неподдерживаемый тип контента, игнорируем");
      return;
    }

    // Сохраняем информацию о посте в кэш
    // Ключ для кэша - уникальная комбинация ID канала и ID сообщения
    const cacheKey = `${channelId}:${messageId}`;
    channelPostCache.set(cacheKey, {
      channelId,
      groupId: discussionGroupId,
      channelMessageId: messageId,
    });

    logger.info(`Пост канала сохранен в кэш с ключом ${cacheKey}`);

    // Не генерируем ответ сразу - дождемся, пока сообщение будет автоматически
    // переслано в группу обсуждения и обработаем его через отдельный обработчик
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Ошибка при обработке поста из канала", {
      error: errorMessage,
    });
  }
}

/**
 * Обработчик автоматически пересланных сообщений из канала в группу обсуждения
 * @param ctx Контекст сообщения
 */
export async function handleAutoForwardedMessage(ctx: Context) {
  try {
    // Расширенное логирование входящего сообщения
    logger.info("Начало обработки автоматически пересланного сообщения", {
      update: JSON.stringify(ctx.update, null, 2),
      hasMessage: !!ctx.message,
      isAutoForward: ctx.message?.is_automatic_forward,
      hasChat: !!ctx.chat,
      chatId: ctx.chat?.id,
      senderChatId: ctx.senderChat?.id,
      messageMethods: Object.keys(ctx.message || {}),
    });

    // Для автоматически пересланных сообщений всегда есть senderChat
    if (!ctx.message || !ctx.message.is_automatic_forward || !ctx.senderChat)
      return;

    // ID канала, из которого пересланно сообщение
    const forwardedFromChannelId = ctx.senderChat.id.toString();

    // ID сообщения в канале (оригинальное сообщение)
    // @ts-ignore - свойство есть у автоматически пересланных сообщений
    const originalMessageId = ctx.message.forward_from_message_id;

    // ID сообщения в группе обсуждения (пересланное сообщение)
    const groupMessageId = ctx.message.message_id;

    // ID группы обсуждения
    const groupChatId = ctx.chat?.id.toString();

    // Подробное логирование всех ключевых ID
    logger.info("Детали пересланного сообщения:", {
      forwardedFromChannelId,
      originalMessageId,
      groupMessageId,
      groupChatId,
      messageProperties: ctx.message
        ? Object.keys(ctx.message).join(", ")
        : "нет сообщения",
      messageText: ctx.message?.text || "нет текста",
      senderChat: ctx.senderChat
        ? JSON.stringify(ctx.senderChat, null, 2)
        : "нет senderChat",
    });

    if (!originalMessageId || !groupChatId) {
      logger.debug("Отсутствует ID оригинального сообщения или ID группы");
      return;
    }

    // Проверяем, это сообщение из отслеживаемого канала?
    if (!isChannelEnabled(forwardedFromChannelId)) {
      logger.debug(
        `Канал ${forwardedFromChannelId} не включен в список разрешенных`
      );
      return;
    }

    logger.info(
      "Обнаружено автоматически пересланное сообщение из канала в группе обсуждения",
      {
        channelId: forwardedFromChannelId,
        originalMessageId,
        groupChatId,
        groupMessageId,
      }
    );

    // Ищем пост в кэше
    const cacheKey = `${forwardedFromChannelId}:${originalMessageId}`;
    const cachedPost = channelPostCache.get(cacheKey);

    // Если нашли, обновляем информацию о message_id в группе обсуждения
    if (cachedPost) {
      cachedPost.groupMessageId = groupMessageId;
      channelPostCache.set(cacheKey, cachedPost);

      logger.info(
        `Обновлен кэш для поста канала с ID группы ${groupMessageId}`,
        {
          cacheKey,
          cachedPost,
        }
      );

      // Искусственная задержка для более естественного поведения
      await new Promise((resolve) =>
        setTimeout(resolve, CHANNEL_RESPONSE_DELAY)
      );

      // Находим пост в канале, определяем его тип и контент
      let contentType: ContentType = "unknown";
      let mediaContent = "";

      if (ctx.message.text) {
        contentType = "text";
        mediaContent = ctx.message.text;
      } else if (ctx.message.photo) {
        contentType = "photo";
        mediaContent = ctx.message.caption || "";
      } else if (ctx.message.video) {
        contentType = "video";
        mediaContent = ctx.message.caption || "";
      }

      // Генерируем ответ на пост, передавая ID канала для использования шаблонов
      const response = await generateResponse(
        mediaContent,
        false,
        contentType,
        forwardedFromChannelId
      );

      // Проверяем, что ответ не пустой
      if (!response || response.trim() === "") {
        logger.error(
          "Получен пустой ответ от LLM, пропускаем отправку комментария"
        );
        return;
      }

      // Удаляем форматирование и очищаем текст от URL и Markdown
      const cleanedText = response
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/•/g, "-")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/\[(.*?)\]/g, "$1")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/^[- ]+/g, "")
        .replace(/Основное определение:/gi, "")
        .replace(/Ключевые характеристики:/gi, "")
        .replace(/Дополнительная информация:/gi, "")
        .replace(/Полезные ресурсы:/gi, "")
        .trim();

      // Начинаем попытки отправки комментария различными способами

      // ПОДХОД 1: Прямое комментирование в канале с reply_to_message_id
      try {
        logger.info(
          `ПОДХОД 1: Попытка отправки комментария непосредственно в канал ${forwardedFromChannelId} к сообщению ${originalMessageId}`
        );

        await ctx.api.sendMessage(forwardedFromChannelId, cleanedText, {
          reply_to_message_id: originalMessageId,
        });

        logger.info(
          `ПОДХОД 1: Успешно! Комментарий отправлен непосредственно в канале ${forwardedFromChannelId}`
        );
        return;
      } catch (error1: unknown) {
        const errorMsg1 =
          error1 instanceof Error ? error1.message : String(error1);
        logger.error(
          `ПОДХОД 1: Ошибка при отправке комментария в канал: ${errorMsg1}`,
          {
            method: "sendMessage с reply_to_message_id",
            channelId: forwardedFromChannelId,
            originalMessageId,
          }
        );
      }

      // ПОДХОД 2: Отправка в группу обсуждения с message_thread_id равным оригинальному ID сообщения
      try {
        logger.info(
          `ПОДХОД 2: Попытка отправки комментария в группу ${groupChatId} с thread_id=${originalMessageId}`
        );

        // Преобразуем ID сообщения в число
        const numericOriginalId = Number(originalMessageId);

        await ctx.api.sendMessage(groupChatId, cleanedText, {
          message_thread_id: numericOriginalId,
        });

        logger.info(
          `ПОДХОД 2: Успешно! Комментарий отправлен с message_thread_id=${numericOriginalId}`
        );
        return;
      } catch (error2: unknown) {
        const errorMsg2 =
          error2 instanceof Error ? error2.message : String(error2);
        logger.error(
          `ПОДХОД 2: Ошибка при отправке с message_thread_id=${originalMessageId}: ${errorMsg2}`,
          {
            method: "sendMessage с message_thread_id(original)",
            groupChatId,
            thread_id: originalMessageId,
          }
        );
      }

      // ПОДХОД 3: Отправка в группу обсуждения с message_thread_id равным ID сообщения в группе
      try {
        logger.info(
          `ПОДХОД 3: Попытка отправки комментария в группу ${groupChatId} с thread_id=${groupMessageId}`
        );

        await ctx.api.sendMessage(groupChatId, cleanedText, {
          message_thread_id: groupMessageId,
        });

        logger.info(
          `ПОДХОД 3: Успешно! Комментарий отправлен с message_thread_id=${groupMessageId}`
        );
        return;
      } catch (error3: unknown) {
        const errorMsg3 =
          error3 instanceof Error ? error3.message : String(error3);
        logger.error(
          `ПОДХОД 3: Ошибка при отправке с message_thread_id=${groupMessageId}: ${errorMsg3}`,
          {
            method: "sendMessage с message_thread_id(group)",
            groupChatId,
            thread_id: groupMessageId,
          }
        );
      }

      // ПОДХОД 4: Отправка в группу обсуждения с reply_to_message_id
      try {
        logger.info(
          `ПОДХОД 4: Попытка отправки ответа на сообщение в группе с reply_to_message_id=${groupMessageId}`
        );

        await ctx.api.sendMessage(groupChatId, cleanedText, {
          reply_to_message_id: groupMessageId,
        });

        logger.info(
          `ПОДХОД 4: Успешно! Комментарий отправлен как ответ на сообщение в группе`
        );
        return;
      } catch (error4: unknown) {
        const errorMsg4 =
          error4 instanceof Error ? error4.message : String(error4);
        logger.error(
          `ПОДХОД 4: Ошибка при отправке с reply_to_message_id=${groupMessageId}: ${errorMsg4}`,
          {
            method: "sendMessage с reply_to_message_id",
            groupChatId,
            replyToMessageId: groupMessageId,
          }
        );
      }

      // ПОДХОД 5: Прямое использование ctx.reply с reply_parameters
      try {
        logger.info(
          `ПОДХОД 5: Попытка использования ctx.reply с reply_parameters`
        );

        await ctx.reply(cleanedText, {
          reply_to_message_id: groupMessageId,
        });

        logger.info(`ПОДХОД 5: Успешно! Комментарий отправлен через ctx.reply`);
        return;
      } catch (error5: unknown) {
        const errorMsg5 =
          error5 instanceof Error ? error5.message : String(error5);
        logger.error(
          `ПОДХОД 5: Ошибка при использовании ctx.reply: ${errorMsg5}`,
          {
            method: "ctx.reply с reply_to_message_id",
            groupChatId,
            replyToMessageId: groupMessageId,
          }
        );
      }

      // ПОДХОД 6: Последняя попытка - просто отправить сообщение в группу
      try {
        logger.info(
          `ПОДХОД 6: Попытка просто отправить сообщение в группу ${groupChatId}`
        );

        await ctx.api.sendMessage(groupChatId, cleanedText);

        logger.info(
          `ПОДХОД 6: Успешно! Отправлено обычное сообщение в группу обсуждения (без параметров)`
        );
      } catch (finalError: unknown) {
        const finalErrorMsg =
          finalError instanceof Error ? finalError.message : String(finalError);
        logger.error(
          `ПОДХОД 6: Не удалось отправить даже простое сообщение: ${finalErrorMsg}`
        );
      }

      // Удаляем запись из кэша в любом случае
      channelPostCache.delete(cacheKey);
    } else {
      // Сообщение не найдено в кэше - возможно, это старое сообщение или из другого канала
      logger.debug("Пересланное сообщение не найдено в кэше", {
        cacheKey,
        forwardedFromChannelId,
        originalMessageId,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Ошибка при обработке автоматически пересланного сообщения", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : "нет стека",
    });
  }
}

/**
 * Обработчик ответов на сообщения бота
 * @param ctx Контекст сообщения
 */
export async function handleReplyToBot(ctx: Context) {
  try {
    if (!ctx.message?.reply_to_message) return;

    // Проверяем, что ответ адресован нашему боту
    const repliedToBot = ctx.message.reply_to_message.from?.id === ctx.me.id;

    if (!repliedToBot) return;

    logger.info("Получен ответ на сообщение бота", {
      userId: ctx.from?.id,
      username: ctx.from?.username,
      messageId: ctx.message.message_id,
    });

    // Искусственная задержка для более естественного поведения
    await new Promise((resolve) => setTimeout(resolve, REPLY_RESPONSE_DELAY));

    // Генерируем ответ пользователю
    const userMessage = ctx.message.text || ctx.message.caption || "";
    const response = await generateResponse(userMessage, true); // true для режима ответа (а не комментария)

    // Проверяем, что ответ не пустой
    if (!response || response.trim() === "") {
      logger.error(
        "Получен пустой ответ от LLM, пропускаем отправку ответа пользователю"
      );
      return;
    }

    // Удаляем форматирование и очищаем текст от URL и Markdown
    const cleanedText = response
      .replace(/\*\*/g, "") // удаляем двойные звездочки
      .replace(/\*/g, "") // удаляем одиночные звездочки
      .replace(/•/g, "-") // заменяем спецсимвол маркированного списка на дефис
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // удаляем URL-ссылки, оставляя только текст
      .replace(/`([^`]+)`/g, "$1") // удаляем обрамление кода
      .replace(/__(.*?)__/g, "$1") // удаляем подчеркивание
      .replace(/\[(.*?)\]/g, "$1"); // удаляем квадратные скобки

    // Отправляем ответ пользователю без форматирования
    await ctx.reply(cleanedText);

    logger.info("Ответ пользователю успешно отправлен");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Ошибка при обработке ответа на сообщение бота", {
      error: errorMessage,
    });
  }
}

// Регистрация обработчиков
export function registerChannelHandlers() {
  // Обработчик новых постов в канале с использованием фильтра с пропуском значений
  // Синтаксис ":text" ловит любые текстовые сообщения и текстовые посты каналов
  bot.on(":text", async (ctx) => {
    // Проверяем, что это пост из канала
    if (ctx.channelPost) {
      logger.info(
        "Обнаружен новый текстовый пост в канале с помощью фильтра :text",
        {
          channelId: ctx.channelPost.chat.id.toString(),
          messageId: ctx.channelPost.message_id,
        }
      );

      // Вызываем существующий обработчик
      await handleChannelPost(ctx);

      // Дополнительно - отвечаем на пост в канале как КОММЕНТАРИЙ (с использованием reply_parameters)
      try {
        const channelId = ctx.channelPost.chat.id.toString();
        const messageId = ctx.channelPost.message_id;

        // Проверяем, включена ли обработка для этого канала
        if (isChannelEnabled(channelId)) {
          logger.info(
            `Попытка комментирования поста ${messageId} в канале ${channelId}`
          );

          logger.info(
            "Комментарий успешно отправлен через sendMessage с reply_to_message_id"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Ошибка при отправке комментария к посту в канале", {
          error: errorMessage,
        });
      }
    }
  });

  // Обработчик новых медиа-постов в канале (фото, видео и т.д.)
  bot.on(":media", async (ctx) => {
    if (ctx.channelPost) {
      logger.info(
        "Обнаружен новый медиа-пост в канале с помощью фильтра :media",
        {
          channelId: ctx.channelPost.chat.id.toString(),
          messageId: ctx.channelPost.message_id,
        }
      );

      // Вызываем существующий обработчик
      await handleChannelPost(ctx);

      // Дополнительно - комментируем медиа-пост в канале
      try {
        const channelId = ctx.channelPost.chat.id.toString();
        const messageId = ctx.channelPost.message_id;

        // Проверяем, включена ли обработка для этого канала
        if (isChannelEnabled(channelId)) {
          await ctx.api.sendMessage(
            channelId,
            "Это комментарий к вашему медиа-посту в канале",
            {
              reply_to_message_id: messageId,
            }
          );
          logger.info(
            "Комментарий к медиа успешно отправлен с reply_to_message_id"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Ошибка при отправке комментария к медиа-посту в канале", {
          error: errorMessage,
        });
      }
    }
  });

  // Сохраняем оригинальный обработчик для совместимости
  bot.on("channel_post", handleChannelPost);

  // Обработчик автоматически пересланных сообщений из канала в группу обсуждения
  bot.on("message:is_automatic_forward", handleAutoForwardedMessage);

  // Обработчик ответов на сообщения бота
  bot.on("message", (ctx) => {
    if (ctx.message?.reply_to_message?.from?.id === ctx.me?.id) {
      handleReplyToBot(ctx);
    }
  });
}
