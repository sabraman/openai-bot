/**
 * Простой логгер для отслеживания работы бота
 */
export const logger = {
  /**
   * Логирование информационных сообщений
   * @param message Сообщение
   * @param data Дополнительные данные
   */
  info(message: string, data?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, data ? data : "");
  },

  /**
   * Логирование предупреждений
   * @param message Сообщение
   * @param data Дополнительные данные
   */
  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, data ? data : "");
  },

  /**
   * Логирование ошибок
   * @param message Сообщение об ошибке
   * @param data Дополнительные данные
   */
  error(message: string, data?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, data ? data : "");
  },

  /**
   * Логирование отладочной информации
   * @param message Сообщение
   * @param data Дополнительные данные
   */
  debug(message: string, data?: Record<string, unknown>): void {
    // Проверяем флаг отладки в переменных окружения
    if (Deno.env.get("DEBUG") === "true") {
      console.debug(`[DEBUG] ${message}`, data ? data : "");
    }
  },
};
