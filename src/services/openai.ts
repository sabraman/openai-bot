import { axiod } from "../packages/index.ts";

export class OpenAIService {
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;

  constructor() {
    this.apiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    this.siteUrl = Deno.env.get("SITE_URL") || "";
    this.siteName = Deno.env.get("SITE_NAME") || "";
  }

  async createChatCompletion(
    text: string,
    systemPrompt: string
  ): Promise<string> {
    try {
      const { data } = await axiod({
        url: "https://openrouter.ai/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        data: {
          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
        },
      });

      if (
        !data ||
        !data.choices ||
        !data.choices.length ||
        !data.choices[0].message
      ) {
        console.error("Invalid response format from OpenAI:", data);
        throw new Error("Invalid response format from OpenAI");
      }

      const content = data.choices[0].message.content;
      if (typeof content !== "string") {
        console.error("Invalid content type from OpenAI:", content);
        throw new Error("Invalid content type from OpenAI");
      }

      return content;
    } catch (error) {
      console.error("Error in createChatCompletion:", error);
      throw error;
    }
  }

  async createStreamingChatCompletion(
    text: string,
    systemPrompt: string
  ): Promise<Response> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          stream: true,
        }),
      }
    );

    return response;
  }
}
