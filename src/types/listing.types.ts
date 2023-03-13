import { MIDIRow } from "./midi.types";

export type ListingRow = {
  token_id: number;
  listing_address: string;
  amount: number;
  price: string;
  lister: string;
  midi?: MIDIRow;
};
