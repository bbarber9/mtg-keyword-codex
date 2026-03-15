import {
	Button as RACButton,
	composeRenderProps,
	type ButtonProps as RACButtonProps,
} from "react-aria-components";
import styles from "./Button.module.css";

interface ButtonProps extends RACButtonProps {
	/**
	 * The visual style of the button.
	 * @default 'primary'
	 */
	variant?: "primary" | "secondary";
}

export function Button(props: ButtonProps) {
	const variantClassName =
		props.variant === "secondary" ? styles.secondary : styles.primary;
	const buttonClassName = composeRenderProps(
		props.className,
		(previousClassName) =>
			[styles.button, variantClassName, previousClassName]
				.filter(Boolean)
				.join(" "),
	);

	return (
		<RACButton {...props} className={buttonClassName}>
			{props.children}
		</RACButton>
	);
}
