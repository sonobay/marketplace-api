import { PostgrestError } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createDB } from "./supabase";
import { DeviceRow } from "./types/device.types";

export const devicesHandler = async (_: Request, res: Response) => {
  const supabase = await createDB();

  const { error, data } = (await supabase.from("devices").select()) as {
    error: PostgrestError | null;
    data: DeviceRow[];
  };

  if (error) {
    console.error("error fetchDeviceByName ", error);
    return res.json({ error }).status(500);
  }

  return res.json(data);
};

export const deviceHandler = async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  const supabase = await createDB();

  const { error, data } = await supabase
    .from("devices")
    .select("*, midi_devices(midi(createdBy, id, metadata))")
    .eq("id", deviceId)
    .single();

  if (error) {
    console.error("error fetching device by id ", error);
    return res.json({ error }).status(500);
  }

  return res.json(data);
};
