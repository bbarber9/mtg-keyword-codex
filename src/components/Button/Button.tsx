import {
	Button as BaseButton,
	type Button as BaseButtonTypes,
} from "@base-ui/react/button";
import styles from "./Button.module.css";

interface ButtonProps extends Omit<BaseButtonTypes.Props, "className"> {
	/**
	 * The visual style of the button.
	 * @default 'primary'
	 */
	variant?: "primary" | "secondary" | "toolbar";
	className?: string;
}

const getButtonClass = (variant: ButtonProps["variant"]) => {
	const mapping: Record<NonNullable<ButtonProps["variant"]>, string> = {
		primary: styles.primary,
		secondary: styles.secondary,
		toolbar: styles.toolbar,
	};
	return variant ? mapping[variant] : mapping.primary;
};

export function Button({
	variant,
	className,
	children,
	...buttonProps
}: ButtonProps) {
	const variantClassName = getButtonClass(variant);
	const composedClassName = [styles.button, variantClassName, className]
		.filter(Boolean)
		.join(" ");

	return (
		<BaseButton {...buttonProps} className={composedClassName}>
			{children}
		</BaseButton>
	);
}
