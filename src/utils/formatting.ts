import { Context } from "../packages/index.ts";

// Функция для экранирования специальных символов Markdown V2
export const escapeMarkdown = (text: string): string => {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, "\\$1");
};

// Функция для безопасного форматирования сообщения
export function formatMessage(text: string): string {
  if (!text || text.trim() === "") return "Нет доступной информации.";

  try {
    // Очищаем от невалидных сообщений, которые могут вызвать ошибку
    if (text.trim() === "**" || text.trim() === "***" || text.trim() === "*") {
      return "Нет доступной информации.";
    }

    // Разбиваем текст на строки
    const lines = text.split("\n");
    const formattedLines = lines.map((line) => {
      // Пропускаем пустые строки
      if (!line.trim()) return "";

      // Обрабатываем заголовки
      if (line.startsWith("**")) {
        const content = line.replace(/\*\*/g, "").trim();
        if (!content) return "";
        return `*${escapeMarkdown(content)}*`;
      }

      // Обрабатываем маркированные списки
      if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
        const content = line.replace(/^[-*]\s*/, "").trim();
        if (!content) return "";
        return `• ${escapeMarkdown(content)}`;
      }

      // Обрабатываем ссылки
      if (line.includes("[") && line.includes("](")) {
        const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const [_, text, url] = linkMatch;
          if (!text) return "";
          return `• ${escapeMarkdown(text)}`;
        }
      }

      // Обрабатываем обычный текст
      return escapeMarkdown(line.trim());
    });

    // Собираем текст обратно, добавляя переносы строк между непустыми строками
    const result = formattedLines.filter((line) => line !== "").join("\n\n");

    // Финальная проверка на пустое сообщение
    if (!result || result.trim() === "") {
      return "Нет доступной информации.";
    }

    return result;
  } catch (error) {
    console.error("Ошибка форматирования:", error);
    // В случае ошибки форматирования возвращаем безопасный текст
    const safeText = escapeMarkdown(text);
    return safeText || "Нет доступной информации.";
  }
}

// Функция для разбиения текста на части с учетом форматирования
function splitTextIntoParts(text: string, maxLength: number): string[] {
  const parts: string[] = [];
  let currentPart = "";
  const sections = text.split(/\n\n+/);

  for (const section of sections) {
    if (currentPart.length + section.length + 2 <= maxLength) {
      currentPart += (currentPart ? "\n\n" : "") + section;
    } else {
      if (currentPart) {
        parts.push(currentPart);
      }
      currentPart = section;
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

// Функция для очистки больших объектов из сессии
function cleanSessionForStorage(session: any): any {
  const maxSize = 16000; // Немного меньше лимита в 16384 байт

  // Создаем копию сессии
  const cleanSession = { ...session };

  // Очищаем большие объекты
  if (
    cleanSession.currentQuestion &&
    cleanSession.currentQuestion.length > 1000
  ) {
    cleanSession.currentQuestion =
      cleanSession.currentQuestion.substring(0, 1000) + "...";
  }

  // Очищаем историю вопросов если она слишком большая
  if (cleanSession.askedQuestions && cleanSession.askedQuestions.length > 10) {
    cleanSession.askedQuestions = cleanSession.askedQuestions.slice(-10);
  }

  // Очищаем фидбек если он слишком большой
  if (cleanSession.feedback) {
    const feedbackKeys = Object.keys(cleanSession.feedback);
    if (feedbackKeys.length > 5) {
      const newFeedback: any = {};
      feedbackKeys.slice(-5).forEach((key) => {
        newFeedback[key] = cleanSession.feedback[key];
      });
      cleanSession.feedback = newFeedback;
    }
  }

  return cleanSession;
}

// Функция для обработки форматированного текста и отправки сообщений
export const processFormattedText = async (
  ctx: Context & { session?: any },
  text: string,
  options: { splitByParagraphs?: boolean } = {}
): Promise<void> => {
  if (!text?.trim()) {
    console.warn("Получен пустой текст для форматирования");
    await ctx.reply("Нет доступной информации.");
    return;
  }

  try {
    const formattedText = formatMessage(text);
    const maxLen = 3500;

    // Разбиваем текст на части с учетом форматирования
    const parts = splitTextIntoParts(formattedText, maxLen);

    for (const part of parts) {
      if (part.trim()) {
        await ctx.reply(part, { parse_mode: "MarkdownV2" });
      }
    }
  } catch (error) {
    console.error("Ошибка при обработке текста:", error);
    try {
      // Пробуем отправить текст без форматирования
      await ctx.reply(text);
    } catch (fallbackError) {
      console.error("Ошибка при отправке запасного варианта:", fallbackError);
      await ctx.reply("⚠️ Произошла ошибка при форматировании сообщения");
    }
  }
};
