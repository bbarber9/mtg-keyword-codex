import { globalStyle, style } from "@vanilla-extract/css";
import { themeVars } from "./Theme.css";

// reset styles
// inspired by https://www.joshwcomeau.com/css/custom-css-reset/
globalStyle("*, *::before, *::after", {
	boxSizing: "border-box",
});

globalStyle("*:not(dialog)", {
	margin: 0,
});

globalStyle("p, h1, h2, h3, h4, h5, h6", {
	overflowWrap: "break-word",
});

globalStyle("p", {
	textWrap: "pretty",
});

globalStyle("h1, h2, h3, h4, h5, h6", {
	textWrap: "balance",
});

globalStyle("#root", {
	isolation: "isolate",
});

globalStyle("html, body", {
	backgroundColor: themeVars.color.surface.l1,
	color: themeVars.color.base.light,
	height: "100%",
	fontFamily: "arial, sans-serif",
});

globalStyle("body", {
	display: "flex",
	flexDirection: "column",
});

globalStyle("button", {
	background: "transparent",
	border: "none",
});
