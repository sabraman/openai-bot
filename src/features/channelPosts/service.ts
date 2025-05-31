import { ContentType } from "./types.ts";
import { getResponseTemplate } from "./config.ts";
import { LLMService } from "./llm-service.ts";
import { logger } from "../../utils/logger.ts";

// Создаем экземпляр LLM сервиса
const llmService = new LLMService();

/**
 * Генерирует ответ на основе текста сообщения с использованием LLM
 * @param text Текст сообщения
 * @param isReply Флаг, указывающий, является ли это ответом на комментарий пользователя
 * @param contentType Тип контента (text, photo, video, etc.)
 * @param channelId ID канала (опционально, для использования шаблонов из конфигурации)
 * @returns Сгенерированный ответ
 */
export async function generateResponse(
  text: string,
  isReply = false,
  contentType: ContentType = "text",
  channelId?: string
): Promise<string> {
  try {
    // Проверяем, есть ли шаблон ответа в конфигурации
    if (channelId) {
      const template = getResponseTemplate(channelId, contentType);
      if (template) {
        logger.info("Используется шаблон ответа из конфигурации");
        return template;
      }
    }

    // Если это ответ на комментарий пользователя
    if (isReply) {
      logger.info(
        "Генерация ответа на комментарий пользователя с использованием LLM"
      );
      return await llmService.generateReplyResponse(text);
    }

    // Если это комментарий к посту в канале
    logger.info(
      `Генерация ответа на пост в канале (тип: ${contentType}) с использованием LLM`
    );
    return await llmService.generateChannelPostResponse(text, contentType);
  } catch (error) {
    logger.error("Ошибка при генерации ответа с использованием LLM", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Возвращаем запасной ответ в случае ошибки
    return getFallbackResponse(isReply, contentType, text);
  }
}

/**
 * Возвращает запасной ответ в случае ошибки LLM
 * @param isReply Флаг, указывающий, является ли это ответом на комментарий пользователя
 * @param contentType Тип контента
 * @param text Текст сообщения
 * @returns Запасной ответ
 */
function getFallbackResponse(
  isReply: boolean,
  contentType: ContentType,
  text: string
): string {
  // Если это ответ на комментарий пользователя
  if (isReply) {
    return `Спасибо за ваш комментарий! Вы написали: "${text.substring(0, 50)}${
      text.length > 50 ? "..." : ""
    }"`;
  }

  // Если это комментарий к посту в канале
  switch (contentType) {
    case "text":
      return `Интересная публикация! Вот мой комментарий к вашему посту.`;
    case "photo":
      return `Отличное фото! ${
        text ? `Подпись "${text}" хорошо его описывает.` : ""
      }`;
    case "video":
      return `Интересное видео! ${
        text ? `Описание "${text}" очень подходящее.` : ""
      }`;
    default:
      return `Интересная публикация! Спасибо за ваш контент.`;
  }
}

/**
 * Проверяет, нужно ли реагировать на данный пост
 * Можно добавить фильтры для определенных типов контента или ключевых слов
 *
 * @param text Текст поста
 * @param contentType Тип контента
 * @returns Нужно ли реагировать на пост
 */
export function shouldReactToPost(
  text: string,
  contentType: ContentType = "text"
): boolean {
  // Не реагировать на очень короткие текстовые посты
  if (contentType === "text" && (!text || text.trim().length < 5)) {
    return false;
  }

  // Для фото и видео можно реагировать даже если нет подписи
  if (contentType === "photo" || contentType === "video") {
    return true;
  }

  return true;
}
