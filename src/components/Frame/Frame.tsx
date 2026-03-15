import styles from "./Frame.module.css";

interface FrameProps {
	children: React.ReactNode;
}
export const Frame = ({ children }: FrameProps) => {
	return (
		<>
			<nav className={styles.nav}>📔 MTG Cheatsheet Codex</nav>
			<div className={styles.content}>{children}</div>
		</>
	);
};
