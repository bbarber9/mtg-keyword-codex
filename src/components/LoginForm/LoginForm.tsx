import { authClient } from "../../utils/client-auth";
import { Button } from "../Button/Button";
import styles from "./LoginForm.module.css";

export const LoginForm = () => {
	return (
		<div className={styles.container}>
			<div className={styles.box}>
				<h1 className={styles.title}>Login</h1>
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
