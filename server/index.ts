import { createApp } from "@/server/app";

const port = Number(process.env.API_PORT || 3001);

createApp().listen(port, () => {
  console.log(`API (Express) http://127.0.0.1:${port}`);
});
