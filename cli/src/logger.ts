import { pino, type Logger } from "pino";

export function createLogger(): Logger {
  return pino({
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  });
}
