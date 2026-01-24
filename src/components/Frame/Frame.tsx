import { frameContentStyle, navStyle } from "./Frame.css";

interface FrameProps {
	children: React.ReactNode;
}
export const Frame = ({ children }: FrameProps) => {
	return (
		<>
			<nav className={navStyle}>📔 MTG Cheatsheet Codex</nav>
			<div className={frameContentStyle}>{children}</div>
		</>
	);
};
