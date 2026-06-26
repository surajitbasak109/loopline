import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.test");
try {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  }
} catch {
  // .env.test not present — rely on existing process.env
}
