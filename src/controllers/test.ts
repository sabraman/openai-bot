import { Context } from "../packages/index.ts";
import { processFormattedText, escapeHtml } from "../utils/formatting.ts";

// Функция для разбиения длинного текста на части
const splitLongText = (text: string, maxLength: number = 4000): string[] => {
  const parts: string[] = [];
  let currentPart = "";

  // Разбиваем по пробелам, чтобы не разрезать слова
  const words = text.split(" ");

  for (const word of words) {
    if ((currentPart + " " + word).length > maxLength && currentPart) {
      parts.push(currentPart.trim());
      currentPart = word;
    } else {
      currentPart = currentPart ? `${currentPart} ${word}` : word;
    }
  }

  if (currentPart) {
    parts.push(currentPart.trim());
  }

  return parts;
};

const testCases = [
  {
    name: "Простые теги",
    text: "<b>Жирный текст</b> и <i>курсив</i>",
  },
  {
    name: "Вложенные теги",
    text: "<b>Жирный <i>и курсив</i></b>",
  },
  {
    name: "Незакрытые теги",
    text: "<b>Незакрытый тег <i>и еще один",
  },
  {
    name: "Блок кода",
    text: "<pre><code>const test = 'code';</code></pre>",
  },
  {
    name: "HTML в блоке кода",
    text: "<pre><code>function test() {\n  return <div class='test'>Hello</div>;\n}</code></pre>",
  },
  {
    name: "Смешанный HTML в блоке кода",
    text: "<pre><code>// HTML теги в коде\nconst template = `\n  <div class='container'>\n    <h1>Заголовок</h1>\n    <p>Параграф</p>\n  </div>\n`;</code></pre>",
  },
  {
    name: "Блок кода с атрибутами",
    text: "<pre><code class='language-html'><div>\n  <span>текст</span>\n</div></code></pre>",
  },
  {
    name: "Цитата",
    text: "<blockquote>Текст цитаты\nВторая строка цитаты</blockquote>",
  },
  {
    name: "Смешанное форматирование",
    text: "<b>Заголовок</b>\n\n<blockquote>Цитата с <i>курсивом</i></blockquote>\n\n<pre><code>const code = 'test';</code></pre>",
  },
  {
    name: "Длинный текст",
    text: Array(100)
      .fill("<b>Длинный текст</b> с <i>форматированием</i>")
      .join(" "),
  },
  {
    name: "Неподдерживаемые теги",
    text: "<div>Блок</div> с <br> переносом и <span>спаном</span>",
  },
  {
    name: "Множественные переносы",
    text: "Текст\n\n\n\nс множественными\n\n\n\nпереносами",
  },
  {
    name: "Сложное форматирование",
    text: `<b>Пример кода:</b>

<pre><code>// HTML в JavaScript
const element = document.createElement('div');
element.innerHTML = '<span class="highlight">Текст</span>';
element.setAttribute('data-test', 'value');

// Пример JSX
const Component = () => (
  <>
<div>
<div className="container">
<h1>Заголовок</h1>
<p>Параграф с <b>жирным</b> текстом</p>
</div>
</div>
  </>
);</code></pre>

<blockquote>Обратите внимание на экранирование тегов в коде</blockquote>

<i>Дополнительная информация</i>`,
  },
];

const testController = async (ctx: Context) => {
  await ctx.reply("<b>🔍 Начинаю тестирование форматирования</b>");

  for (const testCase of testCases) {
    try {
      await ctx.reply(`\n<b>📝 Тест:</b> ${testCase.name}`);

      // Разбиваем исходный текст на части, если он слишком длинный
      const escapedSource = escapeHtml(testCase.text);
      const sourceParts = splitLongText(escapedSource);

      // Отправляем каждую часть исходного текста
      for (let i = 0; i < sourceParts.length; i++) {
        const part = sourceParts[i];
        const prefix =
          sourceParts.length > 1
            ? `<b>Исходный текст (часть ${i + 1}/${sourceParts.length}):</b>\n`
            : "<b>Исходный текст:</b>\n";
        await ctx.reply(`${prefix}<code>${part}</code>`);
      }

      await ctx.reply("<b>Результат:</b>");
      await processFormattedText(ctx, testCase.text);
    } catch (error: any) {
      // Логируем ошибку в консоль с полным стеком
      console.error(`❌ Ошибка в тесте "${testCase.name}":`);
      console.error("Текст:", testCase.text);
      console.error("Ошибка:", error);
      console.error("Стек:", error.stack);

      // В сообщении об ошибке экранируем HTML
      const errorMessage = escapeHtml(error.message);
      await ctx.reply(
        `<b>❌ Ошибка в тесте ${testCase.name}:</b>\n<code>${errorMessage}</code>`
      );
    }
    // Небольшая пауза между тестами
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await ctx.reply("<b>✅ Тестирование завершено</b>");
};

export { testController };
