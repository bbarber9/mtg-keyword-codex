import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../utils/client-auth';


export const Route = createFileRoute('/test')({
    component: RouteComponent,
})

function RouteComponent() {
    const session = authClient.useSession();
    return <div><pre>{JSON.stringify(session, null, 2)}</pre>
        <button type="button" onClick={() => {
            authClient.signOut().then(console.info);
        }}>Logout</button>
    </div>
}
