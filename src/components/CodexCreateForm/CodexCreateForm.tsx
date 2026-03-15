import { useForm } from "@tanstack/react-form";
import { Form, Heading } from "react-aria-components";
import { processDeckList } from "../../actions/processDeckList";
import { Button } from "../Button/Button";
import { TextArea } from "../TextArea/TextArea";
import { TextField } from "../TextField/TextField";
import styles from "./CodexCreateForm.module.css";

export const CodexCreateForm = () => {
	const form = useForm({
		defaultValues: {
			name: "",
			link: "",
			primer: "",
			decklist: "",
		},
		onSubmit: async (formData) => {
			console.info(formData);
			await processDeckList({ data: formData.value });
		},
	});
	return (
		<div className={styles.page}>
			<Heading className={styles.heading}>Create a new codex</Heading>
			<Form
				className={styles.form}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.Field
					name="name"
					children={(field) => {
						return (
							<TextField
								label="Codex Name"
								id={field.name}
								name={field.name}
								isRequired={true}
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								autoComplete="off"
								placeholder="Super Awesome Combo Deck"
							/>
						);
					}}
				/>
				<form.Field
					name="link"
					children={(field) => {
						return (
							<TextField
								label="Link to Decklist"
								id={field.name}
								name={field.name}
								isRequired={false}
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								autoComplete="off"
								placeholder="Link to your deck here!"
							/>
						);
					}}
				/>
				<form.Field
					name="primer"
					children={(field) => {
						return (
							<TextArea
								label="Primer"
								id={field.name}
								name={field.name}
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value);
								}}
								onBlur={field.handleBlur}
								autoComplete="off"
								rows={5}
								placeholder="Tell someone how to play your deck, tips and tricks welcome!"
							/>
						);
					}}
				/>
				<form.Field
					name="decklist"
					children={(field) => {
						return (
							<TextArea
								label="Deck List"
								id={field.name}
								name={field.name}
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value);
								}}
								onBlur={field.handleBlur}
								autoComplete="off"
								rows={8}
								placeholder={"Decklist format:\n\n15 Island\n1 Rhystic Study"}
							/>
						);
					}}
				/>
				<div className={styles.buttonBar}>
					<Button type="submit">Create</Button>
				</div>
			</Form>
		</div>
	);
};
