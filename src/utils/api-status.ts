/**
 * Функция для проверки доступности OpenRouter API
 */
export async function checkOpenRouterStatus(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Ошибка при проверке OpenRouter API:",
        response.status,
        response.statusText
      );
      return false;
    }

    const data = await response.json();

    // Выводим доступные модели
    console.log("Доступные модели OpenRouter:");
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((model: any) => {
        console.log(`- ${model.id} (${model.name})`);
      });
    }

    return true;
  } catch (error) {
    console.error("Ошибка при проверке статуса API:", error);
    return false;
  }
}
