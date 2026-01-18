const ENV_VARS = {
  PORT: "PORT",
  HOST: "HOST",
  CODEX_DB_PATH: "CODEX_DB_PATH",
  SCRYFALL_DB_PATH: "SCRYFALL_DB_PATH",
  CLEANUP_SHARED_SECRET: "CLEANUP_SHARED_SECRET",
  CLEANUP_CRON: "CLEANUP_CRON",
} as const;

const DEFAULTS = {
  port: 3000,
  host: "0.0.0.0",
  apiPrefix: "/api",
  codexDbPath: "codex.sqlite",
  scryfallDbPath: "scryfall-cache.sqlite",
  cleanupCron: "0 3 * * *",
} as const;

const DECIMAL_RADIX = 10;

export type BackendConfig = {
  server: {
    port: number;
    host: string;
    apiPrefix: string;
  };
  database: {
    codexPath: string;
    scryfallPath: string;
  };
  maintenance: {
    cleanupSharedSecret?: string;
    cleanupCron: string;
  };
};

function parseIntFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  return {
    server: {
      port: parseIntFromEnv(env[ENV_VARS.PORT], DEFAULTS.port),
      host: env[ENV_VARS.HOST] ?? DEFAULTS.host,
      apiPrefix: DEFAULTS.apiPrefix,
    },
    database: {
      codexPath: env[ENV_VARS.CODEX_DB_PATH] ?? DEFAULTS.codexDbPath,
      scryfallPath: env[ENV_VARS.SCRYFALL_DB_PATH] ?? DEFAULTS.scryfallDbPath,
    },
    maintenance: {
      cleanupSharedSecret: env[ENV_VARS.CLEANUP_SHARED_SECRET],
      cleanupCron: env[ENV_VARS.CLEANUP_CRON] ?? DEFAULTS.cleanupCron,
    },
  };
}

export const DEFAULT_CODEX_DB_PATH = DEFAULTS.codexDbPath;
export const DEFAULT_SCRYFALL_DB_PATH = DEFAULTS.scryfallDbPath;
export const DEFAULT_API_PREFIX = DEFAULTS.apiPrefix;
export const ENV = ENV_VARS;
