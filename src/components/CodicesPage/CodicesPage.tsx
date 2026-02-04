import { useForm } from "@tanstack/react-form";
import {
	Dialog,
	DialogTrigger,
	Form,
	Heading,
	Modal,
	ModalOverlay,
} from "react-aria-components";
import { Button } from "../Button/Button";
import { TextArea } from "../TextArea/TextArea";
import { TextField } from "../TextField/TextField";
import {
	buttonBarStyles,
	headingStyles,
	modalOverlayStyles,
	modalStyles,
} from "./CodicesPage.css";

export const CodicesPage = () => {
	const form = useForm({
		defaultValues: {
			name: "",
			link: "",
			primer: "",
			decklist: "",
		},
		onSubmit: async (formData) => {
			console.info(formData);
		},
	});
	return (
		<DialogTrigger>
			<Button>Create</Button>
			<ModalOverlay className={modalOverlayStyles}>
				<Modal className={modalStyles}>
					<Dialog>
						{({ close }) => (
							<>
								<Heading className={headingStyles} slot="title">
									Create a new codex
								</Heading>
								<Form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit().then(() => {
											close();
										});
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
													autoComplete="off"
													rows={8}
													placeholder={
														"Decklist format:\n\n15 Island\n1 Rhystic Study"
													}
												/>
											);
										}}
									/>
									<div className={buttonBarStyles}>
										<Button slot="close" variant="secondary">
											Close
										</Button>
										<Button type="submit">Create</Button>
									</div>
								</Form>
							</>
						)}
					</Dialog>
				</Modal>
			</ModalOverlay>
		</DialogTrigger>
	);
};
