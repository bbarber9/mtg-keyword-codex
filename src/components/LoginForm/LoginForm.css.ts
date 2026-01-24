import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const loginFormContainer = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
});

export const loginFormBox = style({
	backgroundColor: themeVars.color.surface.l2,
	padding: "32px",
	borderRadius: "8px",
});

export const loginFormTitle = style({
	textAlign: "center",
	marginBottom: "16px",
});
