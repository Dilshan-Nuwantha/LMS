import { httpServerHandler } from "cloudflare:node";
import app from "./index.js";

// Start Express application
app.listen(3000);

// Connect Express with Cloudflare Workers
export default httpServerHandler({
    port: 3000
});