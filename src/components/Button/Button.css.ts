import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const baseButton = style({
	borderRadius: "6px",
	padding: "10px 10px",
	color: themeVars.color.base.light,
	backgroundColor: themeVars.color.surface.l2,
	border: "2px solid " + themeVars.color.primary.l2,
	fontWeight: "bold",
	selectors: {
		"&:hover": {
			backgroundColor: themeVars.color.surface.l3,
			cursor: "pointer",
		},
	},
});
