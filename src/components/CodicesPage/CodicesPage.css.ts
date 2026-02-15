import { style } from "@vanilla-extract/css";

export const createCodexPageStyles = style({
	maxWidth: "720px",
	margin: "0 auto",
});

export const formStyles = style({
	display: "flex",
	flexDirection: "column",
	gap: "12px",
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
