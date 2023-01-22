import { Request, Response } from "express";
import { createDB } from "./supabase";

export const midiHandler = async (req: Request, res: Response) => {
  const { midiId } = req.params;

  const supabase = await createDB();

  const { error, data } = await supabase
    .from("midi")
    .select("*, midi_devices(device(*))")
    .eq("id", midiId)
    .single();

  if (error) {
    console.error("error fetching midi by id ", error);
    res.status(500);
    return res.json({ error });
  }

  return res.json(data);
};
