import { recipe } from "@vanilla-extract/recipes";
import { themeVars } from "../Theme.css";

export const alertContainer = recipe({
	base: {
		borderRadius: "4px",
		border: `1px solid`,
		fontWeight: "bold",
		margin: "4px 0",
	},
	variants: {
		level: {
			info: {
				backgroundColor: themeVars.color.info.l3,
				color: themeVars.color.info.l1,
				borderColor: themeVars.color.info.l1,
			},
			warning: {
				backgroundColor: themeVars.color.warning.l3,
				color: themeVars.color.warning.l1,
				borderColor: themeVars.color.warning.l1,
			},
			error: {
				backgroundColor: themeVars.color.danger.l3,
				color: themeVars.color.danger.l1,
				borderColor: themeVars.color.danger.l1,
			},
			success: {
				backgroundColor: themeVars.color.success.l3,
				color: themeVars.color.success.l1,
				borderColor: themeVars.color.success.l1,
			},
		},
		size: {
			small: {
				padding: "4px 6px",
				fontSize: "12px",
			},
			medium: {
				padding: "8px 12px",
				fontSize: "14px",
			},
			large: {
				padding: "12px 18px",
				fontSize: "18px",
			},
		},
	},
});
