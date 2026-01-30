import { Form } from "react-aria-components";
import { Button } from "../Button/Button";
import { TextField } from "../TextField/TextField";
import { formContainer, formStyles, formTitle } from "./UsernameForm.css";

export const UsernameForm = () => {
	const handleUsernameChange = (value: string) => {
		console.log("Username changed to:", value);
	};

	return (
		<div className={formContainer}>
			<Form className={formStyles}>
				<h1 className={formTitle}>Set Your Username</h1>
				<TextField
					label="Username"
					isRequired={true}
					onChange={handleUsernameChange}
				/>
				<Button type="submit">Submit</Button>
			</Form>
		</div>
	);
};
