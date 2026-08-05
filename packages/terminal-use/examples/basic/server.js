import { createServer } from "node:http";
import { terminalUseHandler } from "./handler.js";
const server = createServer(async (request, response) => {
  const result = await terminalUseHandler(new Request(`http://localhost${request.url}`));
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
});
server.listen(Number(process.env.PORT) || 0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}`));
