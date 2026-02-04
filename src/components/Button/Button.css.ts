import { recipe } from "@vanilla-extract/recipes";
import { themeVars } from "../Theme.css";

export const buttonRecipe = recipe({
	base: {
		borderRadius: "6px",
		padding: "10px 10px",
		border: "2px solid " + themeVars.color.primary.l2,
		fontWeight: "bold",
		selectors: {
			"&:hover": {
				cursor: "pointer",
			},
		},
	},
	variants: {
		variant: {
			primary: {
				backgroundColor: themeVars.color.primary.l2,
				color: themeVars.color.base.dark,
				selectors: {
					"&:hover": {
						backgroundColor: themeVars.color.primary.l3,
					},
				},
			},
			secondary: {
				backgroundColor: themeVars.color.surface.l2,
				color: themeVars.color.base.light,
				selectors: {
					"&:hover": {
						backgroundColor: themeVars.color.surface.l3,
					},
				},
			},
		},
	},
	defaultVariants: {
		variant: "primary",
	},
});
