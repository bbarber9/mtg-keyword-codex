import {
	Label,
	TextArea as RACTextArea,
	type TextAreaProps as RACTextAreaProps,
	TextField,
} from "react-aria-components";

interface TextAreaProps extends RACTextAreaProps {
	label?: string;
}

export const TextArea = (props: TextAreaProps) => {
	return (
		<TextField>
			<Label>{props.label}</Label>
			<RACTextArea {...props} />
		</TextField>
	);
};
