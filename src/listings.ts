import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createDB } from "./supabase";
import { ListingRow } from "./types/listing.types";
import { MidiDevice } from "./types/midiDevice";

const _fetchByUserAndDevice = async ({
  sellerAddress,
  deviceId,
  supabase,
}: {
  sellerAddress: string;
  deviceId: string;
  supabase: SupabaseClient<any, "public", any>;
}) => {
  const { error, data } = (await supabase
    .from("listings")
    .select("*, midi_devices(midi(id, created_by, metadata), device")
    .eq("seller_address", sellerAddress)
    .eq("midi_devices.device", deviceId)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[];
  };

  return { error, data };
};
const _fetchByUser = async ({
  sellerAddress,
  supabase,
}: {
  sellerAddress: string;
  supabase: SupabaseClient<any, "public", any>;
}) => {
  const { error, data } = (await supabase
    .from("listings")
    .select("*, midi_devices(midi(id, created_by, metadata)")
    .eq("seller_address", sellerAddress)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[];
  };

  return { error, data };
};
const _fetchByDevice = async ({
  deviceId,
  supabase,
}: {
  deviceId: string;
  supabase: SupabaseClient<any, "public", any>;
}) => {
  const midiDevicesRes = (await supabase
    .from("midi_devices")
    .select("*")
    .eq("device", deviceId)) as {
    error: PostgrestError | null;
    data: MidiDevice[] | null;
  };

  if (midiDevicesRes.error) {
    console.log("error is: ", midiDevicesRes.error);
    return { error: midiDevicesRes.error };
  }

  if (!midiDevicesRes.data) {
    console.log("error is: ", midiDevicesRes.error);
    return { error: "No midi devices found" };
  }

  let tokenIds: number[] = [];

  // for (midiDevicesRes.data as midiDevice) {}
  for (const midiDevice of midiDevicesRes.data) {
    console.log("midi device token id is: ");
    tokenIds.push(midiDevice.midi);
  }

  const listingsRes = (await supabase
    .from("listings")
    .select("*")
    .eq("token_id", tokenIds)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[];
  };

  const midiRes = await supabase.from("midi").select("*").eq("id", tokenIds);

  const listings = listingsRes.data.map((_listing) => {
    const midi = midiRes.data?.find((_midi) => _midi.id === _listing.token_id);
    _listing.midi = midi;
    return _listing;
  });

  return {
    error: listingsRes.error ?? midiRes.error,
    data: listings,
  };
};

export const listingsHandler = async (req: Request, res: Response) => {
  let { userId, deviceId } = req.query;

  if (!userId && !deviceId) {
    console.error("neither userId nor deviceId provided");
    return res
      .json({ error: "neither userId nor deviceId provided" })
      .status(404);
  }

  userId = userId?.toString();
  deviceId = deviceId?.toString();

  const supabase = await createDB();

  if (!userId && !deviceId) {
    console.error("neither userId nor deviceId provided");
    return;
  }

  let listings: ListingRow[];

  if (userId && deviceId) {
    // fetch by user for single device
    const { error, data } = await _fetchByUserAndDevice({
      sellerAddress: userId,
      deviceId,
      supabase,
    });
    if (error) {
      console.error(
        `error fetchAll listings - fetchByUserAndDevice ${{
          sellerAddress: userId,
          deviceId,
        }}`
      );
      return;
    }

    listings = data;
  } else if (userId && !deviceId) {
    // fetch by user for any device
    const { error, data } = await _fetchByUser({
      sellerAddress: userId,
      supabase,
    });

    if (error) {
      console.error(
        `error fetchAll listings - fetchByUser - ${{ sellerAddress: userId }}`
      );
      return;
    }

    listings = data;
  } else if (!userId && deviceId) {
    // fetch by device
    const { error, data } = await _fetchByDevice({ deviceId, supabase });

    if (error) {
      console.error(
        `error fetchAll listings - fetchByDevice - ${{ deviceId }}`
      );
      return res
        .json({
          error: `error fetchAll listings - fetchByDevice - ${{ deviceId }}`,
        })
        .status(500);
    }

    listings = data ?? [];
  } else {
    listings = [];
  }

  return res.json({ listings });
};
