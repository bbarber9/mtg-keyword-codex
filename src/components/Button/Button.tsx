import {
	Button as RACButton,
	type ButtonProps as RACButtonProps,
} from "react-aria-components";
import { buttonRecipe } from "./Button.css";

interface ButtonProps extends RACButtonProps {
	/**
	 * The visual style of the button (Vanilla CSS implementation specific).
	 * @default 'primary'
	 */
	variant?: "primary" | "secondary";
}

export function Button(props: ButtonProps) {
	const buttonClassName = [
		buttonRecipe({ variant: props.variant }),
		props.className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<RACButton {...props} className={buttonClassName}>
			{props.children}
		</RACButton>
	);
}
