import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { createCheatsheet } from "../../actions/createCheatsheet";
import { Button } from "../Button/Button";
import { TextArea } from "../TextArea/TextArea";
import { TextField } from "../TextField/TextField";
import styles from "./CheatsheetCreateForm.module.css";

export const CheatsheetCreateForm = () => {
	const navigate = useNavigate();
	const { handleSubmit, Field } = useForm({
		defaultValues: {
			name: "",
			link: "",
			primer: "",
			decklist: "",
		},
		onSubmit: async (formData) => {
			const createdCheatsheet = await createCheatsheet({
				data: formData.value,
			});
			await navigate({
				to: "/cheatsheets/$id",
				params: { id: createdCheatsheet.id },
			});
		},
	});
	return (
		<div className={styles.page}>
			<h1 className={styles.heading}>Create a new cheatsheet</h1>
			<form
				className={styles.form}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					handleSubmit();
				}}
			>
				<Field name="name">
					{(field) => {
						return (
							<TextField
								label="Cheatsheet Name"
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
				</Field>
				<Field name="link">
					{(field) => {
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
				</Field>
				<Field name="primer">
					{(field) => {
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
				</Field>
				<Field name="decklist">
					{(field) => {
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
				</Field>
				<div className={styles.buttonBar}>
					<Button type="submit">Create</Button>
				</div>
			</form>
		</div>
	);
};
