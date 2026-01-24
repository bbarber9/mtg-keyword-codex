import { createGlobalTheme } from "@vanilla-extract/css";

export const themeVars = createGlobalTheme(":root", {
	color: {
		base: {
			dark: "#000000",
			light: "#FFFFFF",
		},
		primary: {
			l1: "#f07007",
			l2: "#f5812f",
			l3: "#fa914a",
			l4: "#fea164",
			l5: "#ffb17d",
			l6: "#ffc097",
			l7: "#ffd0b0",
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
			l1: "#261b14",
			l2: "#3b3029",
			l3: "#514640",
			l4: "#675e58",
			l5: "#7f7772",
			l6: "#97908c",
			l7: "#b0aba8",
			l8: "#cac6c4",
		},
		success: {
			l1: "#087853",
			l2: "#0ed895",
			l3: "#58f4c0",
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
