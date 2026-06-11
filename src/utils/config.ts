const ENV_VARS = {
	PORT: "PORT",
	HOST: "HOST",
	CHEATSHEET_DB_PATH: "CHEATSHEET_DB_PATH",
	SCRYFALL_DB_PATH: "SCRYFALL_DB_PATH",
} as const;

const DEFAULTS = {
	port: 3000,
	host: "0.0.0.0",
	cheatsheetDbPath: "cheatsheet.sqlite",
	scryfallDbPath: "scryfall-cache.sqlite",
} as const;

const DECIMAL_RADIX = 10;

export type BackendConfig = {
	server: {
		port: number;
		host: string;
	};
	database: {
		cheatsheetPath: string;
		scryfallPath: string;
	};
};

function parseIntFromEnv(value: string | undefined, fallback: number): number {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, DECIMAL_RADIX);
	return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(
	env: NodeJS.ProcessEnv = process.env,
): BackendConfig {
	return {
		server: {
			port: parseIntFromEnv(env[ENV_VARS.PORT], DEFAULTS.port),
			host: env[ENV_VARS.HOST] ?? DEFAULTS.host,
		},
		database: {
			cheatsheetPath:
				env[ENV_VARS.CHEATSHEET_DB_PATH] ?? DEFAULTS.cheatsheetDbPath,
			scryfallPath: env[ENV_VARS.SCRYFALL_DB_PATH] ?? DEFAULTS.scryfallDbPath,
		},
	};
}

export const DEFAULT_CHEATSHEET_DB_PATH = DEFAULTS.cheatsheetDbPath;
export const DEFAULT_SCRYFALL_DB_PATH = DEFAULTS.scryfallDbPath;
export const ENV = ENV_VARS;
