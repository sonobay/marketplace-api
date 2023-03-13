import { PostgrestError } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createDB } from "./supabase";
import { DeviceRow } from "./types/device.types";

export const devicesHandler = async (req: Request, res: Response) => {
  const { manufacturer, name, offset, limit } = req.query;
  const supabase = await createDB();

  const devices = supabase.from("devices").select();
  if (manufacturer) {
    devices.eq("manufacturer", manufacturer);
  }

  if (name) {
    devices.eq("name", name);
  }

  if (offset) {
    devices.range(+offset, limit ? +limit : 10);
  }

  const { error, data } = (await devices) as {
    error: PostgrestError | null;
    data: DeviceRow[] | null;
  };

  if (error) {
    console.error("error devicesHandler ", error);
    return res.json({ error }).status(500);
  }

  return res.json(data ?? []);
};

export const deviceHandler = async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  console.log("deviceId: ", deviceId);

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
