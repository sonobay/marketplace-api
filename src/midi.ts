import { PostgrestError } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createDB } from "./supabase";
import { MidiDevice } from "./types/midiDevice";

export const midisHandler = async (req: Request, res: Response) => {
  const { page, deviceId, search } = req.query;
  const limit = 12;
  const supabase = await createDB();

  const query = supabase.from("midi").select("*, midi_devices(*)");

  /**
   * search for MIDI by device id
   */
  if (deviceId) {
    console.log("setting device id: ", deviceId);
    query.eq("midi_devices.device", deviceId);

    const { error, data } = (await supabase
      .from("midi_devices")
      .select("*")
      .eq("device", deviceId)) as unknown as {
      error: PostgrestError | null;
      data: MidiDevice[];
    };

    if (error) {
      return res.json(error);
    }

    const midiIds = data.map((_midiDevice) => _midiDevice.midi);

    query.in("id", midiIds);
  }

  /**
   * Search for MIDI by search term
   */
  if (search) {
    /**
     * Searching for name or tag
     */
    query.or(
      `tags.cs.{${search
        .toString()
        .toUpperCase()}}, metadata->>name.ilike.*${search.toString()}*`
    );
  }

  const startRange = (page ? +page : 0) * limit;
  const endRange = startRange + limit - 1;

  query.range(startRange, endRange);

  const { error, data } = await query;

  if (error) {
    console.error("error fetching midi", error);
    res.status(500);
    return res.json({ error });
  }

  console.log(data);

  return res.json(data);
};

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
