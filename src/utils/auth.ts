import Google from "@auth/core/providers/google";
import { StartAuthJSConfig } from "start-authjs";
import { loadConfig } from "./config";

const config = loadConfig()
export const authConfig: StartAuthJSConfig = {
  secret: config.auth.secret,
  providers: [Google({})]
}