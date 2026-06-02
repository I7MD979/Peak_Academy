import "dotenv/config";
import app, { API_VERSION } from "./app.js";

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log("========================================");
  console.log(`Peak Academy API  ${API_VERSION}`);
  console.log(`http://localhost:${PORT}/api/health`);
  console.log(`http://localhost:${PORT}/api/diag`);
  console.log("========================================");
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
