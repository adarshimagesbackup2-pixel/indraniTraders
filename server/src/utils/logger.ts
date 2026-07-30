/* eslint-disable no-console */

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    console[level === "debug" ? "log" : level](line, meta);
  } else {
    console[level === "debug" ? "log" : level](line);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};
