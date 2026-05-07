import path from "path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log("🚀 arrancando server...");

import app from "./app";
import { startInformacionAlarmasSweepJob } from "./jobs/informacionAlarmasSweep";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startInformacionAlarmasSweepJob();
});
