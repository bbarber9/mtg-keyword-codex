import { authClient } from "../../utils/client-auth";
import { Button } from "../Button/Button";
import {
	loginFormBox,
	loginFormContainer,
	loginFormTitle,
} from "./LoginForm.css";

export const LoginForm = () => {
	return (
		<div className={loginFormContainer}>
			<div className={loginFormBox}>
				<h1 className={loginFormTitle}>Login</h1>
				<Button
					variant="primary"
					onPress={() => {
						authClient.signIn
							.social({
								provider: "google",
								callbackURL: "/test",
							})
							.then(console.info);
					}}
				>
					Login with Google
				</Button>
			</div>
		</div>
	);
};
