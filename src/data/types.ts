export interface KeywordAction {
	intro: string;
	description: string;
	reminderText: string;
	sourceUrl: string;
}

export interface KeywordAbility {
	intro: string;
	description: string;
	reminderText: string;
	sourceUrl: string;
}

export interface CounterType {
	intro: string;
	description: string;
	use: string;
	placedOn: string;
	sourceUrl: string;
}

export type KeywordActionList = Record<string, KeywordAction>;
export type KeywordAbilityList = Record<string, KeywordAbility>;
export type CounterTypeList = Record<string, CounterType>;
