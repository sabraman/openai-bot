import { ContentType } from "./types.ts";

/**
 * Настройки для работы с каналами
 */
export interface ChannelConfig {
  /**
   * ID канала
   */
  channelId: string;

  /**
   * Название канала для логов
   */
  channelName: string;

  /**
   * Активно ли комментирование постов в данном канале
   */
  enabled: boolean;

  /**
   * ID группы обсуждения, связанной с каналом
   */
  discussionGroupId?: string;

  /**
   * Шаблоны ответов для различных типов постов
   */
  responseTemplates?: {
    /**
     * Шаблон ответа на текстовые посты
     */
    text?: string;

    /**
     * Шаблон ответа на посты с фото
     */
    photo?: string;

    /**
     * Шаблон ответа на посты с видео
     */
    video?: string;

    /**
     * Шаблон ответа на неизвестные типы постов
     */
    unknown?: string;
  };
}

// Получаем ID канала из переменной CHANNEL_ID в .env
const channelId = Deno.env.get("CHANNEL_ID");

// Получаем ID группы обсуждения из переменной DISCUSSION_GROUP_ID в .env
// Если не задано в переменных окружения, используем значение по умолчанию
const discussionGroupId =
  Deno.env.get("DISCUSSION_GROUP_ID") || "-1002293508752";

/**
 * Список каналов, с которыми работает бот
 * Значение берется из переменной CHANNEL_ID в .env
 */
export const channels: ChannelConfig[] = channelId
  ? [
      {
        channelId,
        channelName: `Канал ${channelId}`,
        enabled: true,
        discussionGroupId,
      },
    ]
  : [];

// Если ID канала не задан, выводим предупреждение
if (channels.length === 0) {
  console.log(
    "ID канала не задан в переменных окружения. Добавьте CHANNEL_ID в файл .env"
  );
}

/**
 * Задержка перед ответом на пост в канале (в миллисекундах)
 * Берётся из переменных окружения или используется значение по умолчанию
 */
export const CHANNEL_RESPONSE_DELAY =
  Number(Deno.env.get("CHANNEL_RESPONSE_DELAY")) || 3000;

/**
 * Задержка перед ответом на комментарий пользователя (в миллисекундах)
 * Берётся из переменных окружения или используется значение по умолчанию
 */
export const REPLY_RESPONSE_DELAY =
  Number(Deno.env.get("REPLY_RESPONSE_DELAY")) || 1500;

/**
 * Проверяет, включена ли функция реагирования на посты в каналах глобально
 * По умолчанию включена, если не указано явно
 */
export const IS_CHANNEL_POSTS_ENABLED =
  Deno.env.get("ENABLE_CHANNEL_POSTS") !== "false";

/**
 * Проверяет, нужно ли боту реагировать на пост в данном канале
 * @param channelId ID канала
 * @returns true, если в данном канале нужно реагировать на посты
 */
export function isChannelEnabled(channelId: string): boolean {
  // Проверяем глобальное включение функции
  if (!IS_CHANNEL_POSTS_ENABLED) {
    return false;
  }

  const channel = channels.find((c) => c.channelId === channelId);
  return channel?.enabled || false;
}

/**
 * Получает ID группы обсуждения для заданного канала
 * @param channelId ID канала
 * @returns ID группы обсуждения или undefined, если не найдено
 */
export function getDiscussionGroupId(channelId: string): string | undefined {
  const channel = channels.find((c) => c.channelId === channelId);
  return channel?.discussionGroupId;
}

/**
 * Получает шаблон ответа для данного типа контента и канала
 * @param channelId ID канала
 * @param contentType Тип контента
 * @returns Шаблон ответа или undefined, если не найден
 */
export function getResponseTemplate(
  channelId: string,
  contentType: ContentType
): string | undefined {
  const channel = channels.find((c) => c.channelId === channelId);

  if (!channel?.responseTemplates) {
    return undefined;
  }

  // Используем явную проверку типа для избежания ошибок типизации
  switch (contentType) {
    case "text":
      return channel.responseTemplates.text;
    case "photo":
      return channel.responseTemplates.photo;
    case "video":
      return channel.responseTemplates.video;
    case "unknown":
      return channel.responseTemplates.unknown;
    default:
      return undefined;
  }
}
