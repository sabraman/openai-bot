import { type Context } from "../../types/session.ts";
import { type SessionData } from "../../types/session.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.4.2/free/src/mod.ts";
import { session } from "https://deno.land/x/grammy@v1.35.0/mod.ts";
import { parseMode } from "https://deno.land/x/grammy_parse_mode@1.11.1/mod.ts";

// Инициализируем начальное состояние сессии
export function initial(): SessionData {
  return {
    level: undefined,
    selectedSections: [],
    currentSection: undefined,
    currentQuestion: undefined,
    askedQuestions: [],
    feedback: {},
  };
}

// Функция для получения ключа сессии
export function getSessionKey(ctx: Context): string | undefined {
  return ctx.chat?.type === "private" && ctx.from
    ? `${ctx.from.id}:${ctx.chat.id}`
    : ctx.chat?.id.toString();
}

// Конфигурация сессии
export function configureSession(token: string) {
  return session({
    initial,
    storage: freeStorage<SessionData>(token),
    getSessionKey,
  });
}

// Конфигурация режима разбора
export function configureParseMode() {
  return parseMode("HTML");
}

// Конфигурация обработки ошибок
export function handleBotError(err: any) {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof Error) {
    console.error("Error name:", e.name);
    console.error("Error message:", e.message);
    console.error("Error stack:", e.stack);
  } else {
    console.error("Unknown error:", e);
  }
}
