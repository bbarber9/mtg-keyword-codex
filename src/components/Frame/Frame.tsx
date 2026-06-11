import { Link } from "@tanstack/react-router";
import { Button } from "../Button/Button";
import styles from "./Frame.module.css";

interface FrameProps {
	children: React.ReactNode;
}
export const Frame = ({ children }: FrameProps) => {
	return (
		<>
			<nav className={styles.nav}>
				<Link className={styles.logo} to="/test">
					MTG Keyword Cheatsheets
				</Link>
				<Button variant="toolbar">Logout</Button>
			</nav>
			<div className={styles.content}>{children}</div>
		</>
	);
};
