import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const navStyle = style({
	backgroundColor: themeVars.color.surface.l2,
	color: themeVars.color.base.light,
	height: "50px",
	display: "flex",
	alignItems: "center",
	paddingLeft: "20px",
	fontSize: "24px",
});

export const frameContentStyle = style({
	padding: "20px",
	flexGrow: 1,
	backgroundColor: themeVars.color.surface.l1,
});
