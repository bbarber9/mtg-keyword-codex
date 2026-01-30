import {
	TextField as AriaTextField,
	type TextFieldProps as AriaTextFieldProps,
	FieldError,
	Input,
	Label,
	Text,
	type ValidationResult,
} from "react-aria-components";
import { containerStyles, inputStyles } from "./TextField.css";

export interface TextFieldProps extends AriaTextFieldProps {
	label?: string;
	description?: string;
	errorMessage?: string | ((validation: ValidationResult) => string);
	placeholder?: string;
}

export function TextField({
	label,
	description,
	errorMessage,
	placeholder,
	...props
}: TextFieldProps) {
	return (
		<AriaTextField {...props} className={containerStyles}>
			<Label>{label}</Label>
			<Input className={inputStyles} placeholder={placeholder} />
			{description && <Text slot="description">{description}</Text>}
			<FieldError>{errorMessage}</FieldError>
		</AriaTextField>
	);
}
