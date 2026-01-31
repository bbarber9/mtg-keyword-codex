import { alertContainer } from "./Alert.css";

export interface AlertProps {
	level?: "info" | "warning" | "error" | "success";
	size?: "small" | "medium" | "large";
	children: React.ReactNode;
}

export const Alert = (props: AlertProps) => {
	return (
		<div
			className={alertContainer({
				level: props.level ?? "info",
				size: props.size ?? "medium",
			})}
		>
			{props.children}
		</div>
	);
};
