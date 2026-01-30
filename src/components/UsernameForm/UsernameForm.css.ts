import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const formContainer = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
});

export const formStyles = style({
	backgroundColor: themeVars.color.surface.l2,
	padding: "32px",
	borderRadius: "8px",
});

export const formTitle = style({
	textAlign: "center",
	marginBottom: "16px",
});
