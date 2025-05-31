import {
  Context as BaseContext,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.35.0/mod.ts";
import { ParseModeFlavor } from "https://deno.land/x/grammy_parse_mode@1.11.1/mod.ts";

export interface SessionData {
  level?: string;
  selectedSections?: string[];
  currentSection?: string;
  currentQuestion?: string;
  askedQuestions?: string[];
  feedback?: Record<
    string,
    {
      score: number;
      strengths: string[];
      improvements: string[];
    }
  >;
}

export type Context = ParseModeFlavor<BaseContext & SessionFlavor<SessionData>>;
