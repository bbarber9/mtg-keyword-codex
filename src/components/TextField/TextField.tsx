import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import styles from "./TextField.module.css";

type BaseInputProps = Omit<
	ComponentProps<typeof Input>,
	"className" | "onChange" | "onValueChange" | "required"
>;

export interface TextFieldProps extends BaseInputProps {
	label?: string;
	description?: string;
	errorMessage?: string;
	isRequired?: boolean;
	required?: boolean;
	onChange?: (value: string) => void;
}

export function TextField({
	label,
	description,
	errorMessage,
	isRequired,
	required,
	onChange,
	...inputProps
}: TextFieldProps) {
	const fieldIsRequired = required ?? isRequired;

	return (
		<Field.Root className={styles.container} name={inputProps.name}>
			{label && <Field.Label>{label}</Field.Label>}
			<Input
				{...inputProps}
				className={styles.input}
				required={fieldIsRequired}
				onValueChange={onChange}
			/>
			{description && (
				<Field.Description className={styles.description}>
					{description}
				</Field.Description>
			)}
			{errorMessage && (
				<Field.Error className={styles.error} match={true}>
					{errorMessage}
				</Field.Error>
			)}
		</Field.Root>
	);
}
