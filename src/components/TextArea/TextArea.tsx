import {
	Label,
	TextArea as RACTextArea,
	type TextAreaProps as RACTextAreaProps,
	TextField,
} from "react-aria-components";
import styles from "./TextArea.module.css";

interface TextAreaProps extends RACTextAreaProps {
	label?: string;
}

export const TextArea = (props: TextAreaProps) => {
	return (
		<TextField className={styles.container}>
			<Label>{props.label}</Label>
			<RACTextArea {...props} className={styles.textArea} />
		</TextField>
	);
};
