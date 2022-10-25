import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { deviceHandler, devicesHandler } from "./devices";
import helmet from "helmet";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(helmet());

app.get("/devices", devicesHandler);
app.get("/devices/:deviceId", deviceHandler);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
