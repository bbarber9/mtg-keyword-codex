import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const textAreaContainerStyles = style({
	display: "flex",
	flexDirection: "column",
	gap: "4px",
	marginBottom: "8px",
});

export const textAreaStyles = style({
	backgroundColor: themeVars.color.surface.l2,
	padding: "8px 12px",
	borderRadius: "4px",
	border: `1px solid ${themeVars.color.surface.l4}`,
	minWidth: "300px",
	color: themeVars.color.base.light,
	display: "block",
});
