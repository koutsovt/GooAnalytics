import { describe, expect, it } from "vitest";
import { parseDeliveryChannels } from "@/lib/queue/types";

describe("parseDeliveryChannels", () => {
  it("passes through a valid list of channels", () => {
    expect(parseDeliveryChannels(["email", "slack"])).toEqual(["email", "slack"]);
  });

  it("drops unrecognized entries but keeps the valid ones", () => {
    expect(parseDeliveryChannels(["email", "carrier-pigeon"])).toEqual(["email"]);
  });

  it('falls back to ["email"] for an empty array', () => {
    expect(parseDeliveryChannels([])).toEqual(["email"]);
  });

  it('falls back to ["email"] when every entry is unrecognized', () => {
    expect(parseDeliveryChannels(["carrier-pigeon", "fax"])).toEqual(["email"]);
  });

  it('falls back to ["email"] for non-array input', () => {
    expect(parseDeliveryChannels(null)).toEqual(["email"]);
    expect(parseDeliveryChannels(undefined)).toEqual(["email"]);
    expect(parseDeliveryChannels("email")).toEqual(["email"]);
    expect(parseDeliveryChannels({})).toEqual(["email"]);
  });
});
