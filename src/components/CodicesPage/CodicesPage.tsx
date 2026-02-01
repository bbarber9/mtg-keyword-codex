import { Dialog, DialogTrigger, Heading, Modal } from "react-aria-components";
import { Button } from "../Button/Button";

export const CodicesPage = () => {
	return (
		<DialogTrigger>
			<Button>Create</Button>
			<Modal>
				<Dialog>
					<Heading slot="title">Create a new codex</Heading>
					<div>
						<Button slot="close">Close</Button>
						<Button slot="close">Create</Button>
					</div>
				</Dialog>
			</Modal>
		</DialogTrigger>
	);
};
