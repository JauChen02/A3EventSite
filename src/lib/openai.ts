import OpenAI from "openai";
import { serverEnv } from "@/lib/server-env";

export function createOpenAIClient() {
  return new OpenAI({
    apiKey: serverEnv.openaiApiKey,
  });
}
