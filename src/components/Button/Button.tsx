import {
	Button as RACButton,
	type ButtonProps as RACButtonProps,
} from "react-aria-components";
import { baseButton } from "./Button.css";

interface ButtonProps extends RACButtonProps {
	/**
	 * The visual style of the button (Vanilla CSS implementation specific).
	 * @default 'primary'
	 */
	variant?: "primary" | "secondary" | "quiet";
}

export function Button(props: ButtonProps) {
	return (
		<RACButton
			{...props}
			className={baseButton}
			data-variant={props.variant || "primary"}
		>
			{props.children}
		</RACButton>
	);
}
