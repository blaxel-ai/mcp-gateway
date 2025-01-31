const SERVER_URL =
  process.env.SERVER_URL || "https://mcp-hub-server.beamlit.workers.dev";
const SERVER_MCP_NAME = process.env.SERVER_MCP_NAME || "brave-search";
const SERVER_HEADERS = JSON.parse(
  process.env.SERVER_HEADERS || '{"Api-Key": "1234567890"}'
);

const url = `${SERVER_URL}/${SERVER_MCP_NAME}/tools/list`;
const response = await fetch(url, {
  method: "GET",
  headers: { "Content-Type": "application/json", ...SERVER_HEADERS },
});
const data = await response.json();
console.log(data);
