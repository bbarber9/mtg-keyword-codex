import styles from "./Alert.module.css";

export interface AlertProps {
	level?: "info" | "warning" | "error" | "success";
	size?: "small" | "medium" | "large";
	children: React.ReactNode;
}

const levelClassName = {
	info: styles.info,
	warning: styles.warning,
	error: styles.error,
	success: styles.success,
} as const;

const sizeClassName = {
	small: styles.small,
	medium: styles.medium,
	large: styles.large,
} as const;

export const Alert = (props: AlertProps) => {
	const level = props.level ?? "info";
	const size = props.size ?? "medium";

	return (
		<div
			className={[styles.alert, levelClassName[level], sizeClassName[size]]
				.filter(Boolean)
				.join(" ")}
		>
			{props.children}
		</div>
	);
};
