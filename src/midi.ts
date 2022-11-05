import { Request, Response } from "express";
import { createDB } from "./supabase";

export const midiHandler = async (req: Request, res: Response) => {
  const { midiId } = req.params;

  const supabase = await createDB();

  const { error, data } = await supabase
    .from("midi")
    .select()
    .eq("id", midiId)
    .single();

  if (error) {
    console.error("error fetching midi by id ", error);
    return res.json({ error }).status(500);
  }

  return res.json(data);
};
