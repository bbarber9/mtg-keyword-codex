import { createGlobalTheme } from "@vanilla-extract/css";

export const themeVars = createGlobalTheme(":root", {
	color: {
		base: {
			dark: "#000000",
			light: "#FFFFFF",
		},
		primary: {
			l1: "#0f6b3c",
			l2: "#198451",
			l3: "#249d66",
			l4: "#3db47d",
			l5: "#62c595",
			l6: "#89d7af",
			l7: "#b2e8cb",
		},
		surface: {
			l1: "#121212",
			l2: "#282828",
			l3: "#3f3f3f",
			l4: "#575757",
			l5: "#717171",
			l6: "#8b8b8b",
			l7: "#a7a7a7",
			l8: "#c4c4c4",
		},
		tonalSurface: {
			l1: "#152119",
			l2: "#29362d",
			l3: "#3f4d44",
			l4: "#58655c",
			l5: "#717d75",
			l6: "#8b9690",
			l7: "#a8b1ac",
			l8: "#c6cbc8",
		},
		success: {
			l1: "#5f1f8f",
			l2: "#9f4adf",
			l3: "#d2a5f2",
		},
		warning: {
			l1: "#a68e08",
			l2: "#f4d420",
			l3: "#f9e781",
		},
		danger: {
			l1: "#a60c0c",
			l2: "#ef2929",
			l3: "#f68888",
		},
		info: {
			l1: "#0049bf",
			l2: "#2679ff",
			l3: "#8cb8ff",
		},
	},
});
