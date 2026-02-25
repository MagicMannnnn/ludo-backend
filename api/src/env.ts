import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || "ludo"}:${process.env.POSTGRES_PASSWORD || "ludo"}@${process.env.POSTGRES_HOST || "db"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "ludo"}`,
} as const;
