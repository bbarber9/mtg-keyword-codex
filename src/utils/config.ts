const ENV_VARS = {
  PORT: "PORT",
  HOST: "HOST",
  CODEX_DB_PATH: "CODEX_DB_PATH",
  SCRYFALL_DB_PATH: "SCRYFALL_DB_PATH",
  AUTH_SECRET: "AUTH_SECRET"
} as const;

const DEFAULTS = {
  port: 3000,
  host: "0.0.0.0",
  codexDbPath: "codex.sqlite",
  scryfallDbPath: "scryfall-cache.sqlite",
} as const;

const DECIMAL_RADIX = 10;

export type BackendConfig = {
  server: {
    port: number;
    host: string;
  };
  database: {
    codexPath: string;
    scryfallPath: string;
  };
  auth: {
    secret: string;
  }
};

function parseIntFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const secret = env[ENV_VARS.AUTH_SECRET];
  if (!secret) {
    throw new Error(`Missing required environment variable: ${ENV_VARS.AUTH_SECRET}`);
  }
  return {
    server: {
      port: parseIntFromEnv(env[ENV_VARS.PORT], DEFAULTS.port),
      host: env[ENV_VARS.HOST] ?? DEFAULTS.host,
    },
    database: {
      codexPath: env[ENV_VARS.CODEX_DB_PATH] ?? DEFAULTS.codexDbPath,
      scryfallPath: env[ENV_VARS.SCRYFALL_DB_PATH] ?? DEFAULTS.scryfallDbPath,
    },
    auth: {
      secret
    }
  };
}

export const DEFAULT_CODEX_DB_PATH = DEFAULTS.codexDbPath;
export const DEFAULT_SCRYFALL_DB_PATH = DEFAULTS.scryfallDbPath;
export const ENV = ENV_VARS;
