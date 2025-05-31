// Конфигурация для OpenRouter API
export interface OpenRouterConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export function getOpenAIConfig(): OpenRouterConfig {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
  // Убираем дублирование пути в URL
  const apiUrl =
    Deno.env.get("OPENROUTER_API_URL") || "https://openrouter.ai/api/v1";

  // Проверяем популярные доступные модели
  // Gemini Pro, Claude, GPT-3.5 Turbo
  const defaultModel = "google/gemini-2.0-flash-lite-preview-02-05";
  const model = Deno.env.get("OPENROUTER_MODEL") || defaultModel;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY не установлен в переменных окружения");
  }

  console.log("Загружена конфигурация OpenRouter:");
  console.log(`- API URL: ${apiUrl}`);
  console.log(`- Модель: ${model}`);
  console.log(`- API ключ установлен: ${apiKey ? "Да" : "Нет"}`);

  return {
    apiKey,
    apiUrl,
    model,
  };
}
