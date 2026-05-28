import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import styles from "./TextArea.module.css";

interface TextAreaProps extends ComponentProps<"textarea"> {
	label?: string;
	isRequired?: boolean;
}

export const TextArea = ({ label, isRequired, required, ...textAreaProps }: TextAreaProps) => {
	const fieldIsRequired = required ?? isRequired;

	return (
		<Field.Root className={styles.container} name={textAreaProps.name}>
			{label && <Field.Label htmlFor={textAreaProps.id}>{label}</Field.Label>}
			<textarea
				{...textAreaProps}
				className={styles.textArea}
				required={fieldIsRequired}
			/>
		</Field.Root>
	);
};
