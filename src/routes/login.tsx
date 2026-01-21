import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../utils/client-auth";

export const Route = createFileRoute("/login")({
    component: Login
});

export function Login() {
    return <div>
        <button type="button" onClick={() => {
            authClient.signIn.social({
                provider: "google",
                callbackURL: "/test"
            }).then(console.info);
        }}>Login with Google</button>
    </div>
}