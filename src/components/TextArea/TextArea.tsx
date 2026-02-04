import {
	Label,
	TextArea as RACTextArea,
	type TextAreaProps as RACTextAreaProps,
	TextField,
} from "react-aria-components";
import { textAreaContainerStyles, textAreaStyles } from "./TextArea.css";

interface TextAreaProps extends RACTextAreaProps {
	label?: string;
}

export const TextArea = (props: TextAreaProps) => {
	return (
		<TextField className={textAreaContainerStyles}>
			<Label>{props.label}</Label>
			<RACTextArea {...props} className={textAreaStyles} />
		</TextField>
	);
};
