import { useForm } from "@tanstack/react-form";
import { Form } from "react-aria-components";
import { authClient } from "../../utils/client-auth";
import { Alert } from "../Alert/Alert";
import { Button } from "../Button/Button";
import { TextField } from "../TextField/TextField";
import styles from "./UsernameForm.module.css";

export const UsernameForm = () => {
	const form = useForm({
		defaultValues: {
			username: "",
		},
		onSubmit: async (formData) => {
			const { error } = await authClient.updateUser({
				username: formData.value.username,
			});
			if (error) {
				return;
			}
		},
	});
	return (
		<div className={styles.container}>
			<Form
				className={styles.form}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<h1 className={styles.title}>Set Your Username</h1>
				<form.Field
					name="username"
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: async (value) => {
							const { data, error } = await authClient.isUsernameAvailable({
								username: value.value,
							});
							if (error) {
								return "Error checking username availability";
							}
							if (!data?.available) {
								return "Username is unavailable";
							}
						},
					}}
					children={(field) => {
						return (
							<>
								<TextField
									label="Username"
									id={field.name}
									name={field.name}
									isRequired={true}
									onChange={field.handleChange}
									onBlur={field.handleBlur}
									autoComplete="off"
								/>

								{!field.state.meta.isValidating &&
									field.state.value !== "" &&
									!field.state.meta.isValid && (
										<Alert level="error" size="small">
											{field.state.meta.errors[0]}
										</Alert>
									)}
								{!field.state.meta.isValidating &&
									field.state.value !== "" &&
									field.state.meta.isValid && (
										<Alert level="success" size="small">
											Username is available!
										</Alert>
									)}
							</>
						);
					}}
				/>

				<Button type="submit">Submit</Button>
			</Form>
		</div>
	);
};
