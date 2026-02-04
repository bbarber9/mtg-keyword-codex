import { style } from "@vanilla-extract/css";
import { themeVars } from "../Theme.css";

export const modalOverlayStyles = style({
	position: "absolute",
	top: 0,
	left: 0,
	width: "100vw",
	height: "100vh",
	background: "rgba(0 0 0 / .5)",
	zIndex: 100,
});

export const modalStyles = style({
	position: "sticky",
	maxHeight: "90%",
	top: "50%",
	marginLeft: "50%",
	translate: "-50% -50%",
	background: themeVars.color.surface.l3,
	borderRadius: "8px",
	padding: "20px",
	width: "max-content",
	minWidth: "500px",
});

export const headingStyles = style({
	marginBottom: "8px",
});

export const buttonBarStyles = style({
	display: "flex",
	flexDirection: "row",
	justifyContent: "end",
	gap: "8px",
});
