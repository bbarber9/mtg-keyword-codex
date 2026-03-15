import {
	composeRenderProps,
	Button as RACButton,
	type ButtonProps as RACButtonProps,
} from "react-aria-components";
import styles from "./Button.module.css";

interface ButtonProps extends RACButtonProps {
	/**
	 * The visual style of the button.
	 * @default 'primary'
	 */
	variant?: "primary" | "secondary" | "toolbar";
}

const getButtonClass = (variant: ButtonProps["variant"]) => {
	const mapping: Record<string, string> = {
		primary: styles.primary,
		secondary: styles.secondary,
		toolbar: styles.toolbar,
	};
	return variant ? mapping[variant] : mapping.primary;
};

export function Button(props: ButtonProps) {
	const variantClassName = getButtonClass(props.variant);
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
