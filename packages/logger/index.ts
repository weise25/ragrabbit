import pino, { Logger, transport } from "pino";
import { env } from "./env.mjs";
import "pino-pretty";

export const rootLogger: Logger =
  process.env["NODE_ENV"] === "production" && !env.VERCEL && !env.TRIGGER_API_URL
    ? // JSON in production
      pino({ level: env.LOG_LEVEL || "warn" })
    : // Pretty print in development (and on Vercel)
      pino({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: !env.VERCEL && !env.TRIGGER_API_URL,
            ignore: "pid,req,res,hostname,context",
            messageFormat: "<{context}> {msg}",
            singleLine: true,
          },
        },
        level: "debug",
      });

class ProxyLogger {
  constructor(private logger: Logger) {}
  private proxyLogger: Logger;
  setLogger(proxyLogger: Logger) {
    this.proxyLogger = proxyLogger;
  }
  child(args: any) {
    return new ProxyLogger(this.logger.child(args));
  }
  debug(...args: any[]) {
    this.proxyLogger?.debug.apply(this.proxyLogger, args);
    this.logger.debug.apply(this.logger, args);
  }
  info(...args: any[]) {
    this.proxyLogger?.info.apply(this.proxyLogger, args);
    this.logger.info.apply(this.logger, args);
  }
  warn(...args: any[]) {
    this.proxyLogger?.warn.apply(this.proxyLogger, args);
    this.logger.warn.apply(this.logger, args);
  }
  error(...args: any[]) {
    this.proxyLogger?.error.apply(this.proxyLogger, args);
    this.logger.error.apply(this.logger, args);
  }
  trace(...args: any[]) {
    this.proxyLogger?.trace.apply(this.proxyLogger, args);
    this.logger.trace.apply(this.logger, args);
  }
}

export const logger: ProxyLogger = env.TRIGGER_API_URL
  ? new ProxyLogger(rootLogger.child({ context: "app" }))
  : (rootLogger.child({ context: "app" }) as any);
