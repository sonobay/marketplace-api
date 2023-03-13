import express, { Express } from "express";
import dotenv from "dotenv";
import { deviceHandler, devicesHandler } from "./devices";
import helmet from "helmet";
import { midiHandler } from "./midi";
import cors from "cors";
import { listingsHandler } from "./listings";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(helmet());

app.get("/devices", devicesHandler);
app.get("/devices/:deviceId", deviceHandler);
app.get("/midi/:midiId", midiHandler);
app.get("/listings", listingsHandler);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
