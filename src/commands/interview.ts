import { bot } from "../core/bot.ts";
import {
  startInterview,
  skipQuestion,
  endInterview,
} from "../controllers/interview.ts";

// Команда для начала интервью
bot.command("interview", startInterview);

// Команды управления интервью
bot.command("skip", skipQuestion);
bot.command("end", endInterview);
