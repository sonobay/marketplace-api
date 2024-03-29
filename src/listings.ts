import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createDB } from "./supabase";
import { ListingRow } from "./types/listing.types";
import { MIDIRow } from "./types/midi.types";
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
  let { error, data } = (await supabase
    .from("listings")
    .select("*, midi(*)")
    .eq("seller_address", sellerAddress)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[];
  } as unknown as {
    error: PostgrestError | null;
    data: ListingRow[] | null;
  };

  if (!data) {
    return { error, data };
  }

  const tokenIds = data.map((_row) => _row.token_id);

  let midiDevicesRes = (await supabase
    .from("midi_devices")
    .select("*")
    .eq("midi", tokenIds)) as {
    error: PostgrestError | null;
    data: MidiDevice[] | null;
  };

  const listings = data.filter((_listing) => {
    return midiDevicesRes.data?.some(
      (_midiDevice: MidiDevice) => _midiDevice.device === deviceId
    );
  });

  return { error, data: listings };
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
    .select("*, midi(*)")
    .eq("seller_address", sellerAddress)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[] | null;
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
    return { error: midiDevicesRes.error };
  }

  if (!midiDevicesRes.data) {
    return { error: "No midi devices found" };
  }

  let tokenIds = midiDevicesRes.data.map((_row) => _row.midi);

  const listingsRes = (await supabase
    .from("listings")
    .select("*")
    .in("token_id", tokenIds)) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[];
  };

  const midiRes = await supabase.from("midi").select("*").in("id", tokenIds);

  const listings = listingsRes.data
    ? listingsRes.data.map((_listing) => {
        const midi = midiRes.data?.find(
          (_midi) => _midi.id === _listing.token_id
        ) as MIDIRow;
        _listing.midi = midi;
        return _listing;
      })
    : [];

  return {
    error: listingsRes.error ?? midiRes.error,
    data: listings,
  };
};

const fetchAll = async (supabase: SupabaseClient<any, "public", any>) => {
  const { error, data } = (await supabase
    .from("listings")
    .select("*, midi(*)")) as unknown as {
    error: PostgrestError | null;
    data: ListingRow[] | null;
  };

  return { error, data };
};

/** TODO: paginate results */
export const listingsHandler = async (req: Request, res: Response) => {
  let { userId, deviceId } = req.query;

  const supabase = await createDB();

  let listings: ListingRow[] = [];

  /** Search all listings */
  if (!userId && !deviceId) {
    const { data, error } = (await fetchAll(supabase)) ?? [];

    if (error) {
      return res.json({
        error,
      });
    }

    listings = data ?? [];
  }

  userId = userId?.toString();
  deviceId = deviceId?.toString();

  /** Search by user and device */
  if (userId && deviceId) {
    // fetch by user for single device
    const { error, data } = await _fetchByUserAndDevice({
      sellerAddress: userId,
      deviceId,
      supabase,
    });
    if (error) {
      console.error(error);
      return res.json({
        error: `error fetchAll listings - fetchByUserAndDevice ${{
          sellerAddress: userId,
          deviceId,
        }}`,
      });
    }

    listings = data ?? [];
  }

  /** Search by user */
  if (userId && !deviceId) {
    // fetch by user for any device
    const { error, data } = await _fetchByUser({
      sellerAddress: userId,
      supabase,
    });

    if (error) {
      console.error(
        `error fetchAll listings - fetchByUser - ${{ sellerAddress: userId }}`
      );
      console.error(error);
      return res
        .json({
          error: `error fetchAll listings - fetchByUser - ${{
            sellerAddress: userId,
          }}`,
        })
        .status(500);
    }

    listings = data ?? [];
  }

  /**
   * Search by Device
   */
  if (!userId && deviceId) {
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
  }

  return res.json({ listings });
};
