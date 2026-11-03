import { describe, expect, it } from "vitest";
import { groupForCountry, groupedPaymentMethods, paymentMethods } from "@/config/payments";
import { checkoutSchema, errorMap, type CheckoutInput } from "@/lib/checkout-schema";

const DATES = ["2026-11-05", "2026-11-10"];

const valid = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  fullName: "Jamie Rivera",
  email: "jamie@example.com",
  phone: "+1 512 555 0134",
  country: "US",
  region: "TX",
  city: "Austin",
  address: "500 Congress Ave, Apt 4",
  postalCode: "78701",
  paymentMethods: ["zelle"],
  expectedTotalCents: 1000,
  ...over,
});

function errors(input: CheckoutInput, live = false) {
  const r = checkoutSchema({ containsLiveAnimals: live, deliveryDates: DATES }).safeParse(input);
  return r.success ? {} : errorMap(r.error);
}

describe("checkout validation", () => {
  it("accepts a complete US order", () => {
    expect(errors(valid())).toEqual({});
  });

  it("requires every starred field, with a message per field", () => {
    const e = errors({ fullName: "", email: "nope", phone: "5125550134", country: "", city: "", address: "", expectedTotalCents: 0 });
    expect(Object.keys(e)).toEqual(expect.arrayContaining(["fullName", "email", "phone", "country", "city", "address", "paymentMethods"]));
    expect(e.phone).toContain("country code");
  });

  it("requires a state for the United States, Canada and Australia, but not elsewhere", () => {
    expect(errors(valid({ region: "" })).region).toBe("Select your state");
    expect(errors(valid({ region: "Texas" })).region).toBe("Select your state");
    expect(errors(valid({ country: "CA", region: "", postalCode: "K1A 0B1" })).region).toBeDefined();
    expect(errors(valid({ country: "AU", region: "", postalCode: "2000" })).region).toBeDefined();
    expect(errors(valid({ country: "AU", region: "NSW", postalCode: "2000" }))).toEqual({});
    expect(errors(valid({ country: "DE", region: "", postalCode: "10115" }))).toEqual({});
    expect(errors(valid({ country: "GB", region: "", postalCode: "SW1A 1AA" }))).toEqual({});
  });

  it("checks postal codes by country, and lets countries without them skip it", () => {
    expect(errors(valid({ postalCode: "7870" })).postalCode).toContain("ZIP");
    expect(errors(valid({ country: "DE", region: "", postalCode: "" })).postalCode).toBeDefined();
    expect(errors(valid({ country: "AE", region: "", postalCode: "" }))).toEqual({});
  });

  it("only accepts countries from the list", () => {
    expect(errors(valid({ country: "ZZ", region: "" })).country).toBe("Select a country");
  });

  it("requires at least one payment method, from the enabled list", () => {
    expect(errors(valid({ paymentMethods: [] })).paymentMethods).toBe("Tick at least one way to pay");
    expect(errors(valid({ paymentMethods: ["stripe"] })).paymentMethods).toBeDefined();
    expect(errors(valid({ paymentMethods: ["zelle", "paypal", "wise"] }))).toEqual({});
  });

  it('requires text when "Other" is ticked', () => {
    expect(errors(valid({ paymentMethods: ["other"] })).paymentOther).toBeDefined();
    expect(errors(valid({ paymentMethods: ["other"], paymentOther: "Western Union" }))).toEqual({});
  });

  it("live animals need a date, both confirmations and an allowed destination", () => {
    const e = errors(valid(), true);
    expect(Object.keys(e).sort()).toEqual(["ageConfirmed", "livePolicyAccepted", "preferredDate"]);
    const ok = { preferredDate: DATES[0], ageConfirmed: true, livePolicyAccepted: true };
    expect(errors(valid(ok), true)).toEqual({});
    expect(errors(valid({ ...ok, preferredDate: "2026-11-07" }), true).preferredDate).toBeDefined();
    expect(errors(valid({ ...ok, region: "HI", postalCode: "96813" }), true).region).toContain("Hawaii");
    expect(errors(valid({ ...ok, country: "DE", region: "", postalCode: "10115" }), true).country).toContain("Germany");
    // Supplies (no live animals) ship to Germany and Hawaii without a problem
    expect(errors(valid({ country: "DE", region: "", postalCode: "10115" }))).toEqual({});
    expect(errors(valid({ region: "HI", postalCode: "96813" }))).toEqual({});
  });
});

describe("payment method groups", () => {
  it("maps countries to their region", () => {
    expect(groupForCountry("US")).toBe("us");
    expect(groupForCountry("NL")).toBe("europe");
    expect(groupForCountry("GB")).toBe("europe");
    expect(groupForCountry("NG")).toBe("worldwide");
    expect(groupForCountry("")).toBe("worldwide");
  });

  it("puts the customer's region first and keeps every group visible", () => {
    const ids = (c: string) => groupedPaymentMethods(c).map((g) => g.id);
    expect(ids("US")).toEqual(["us", "europe", "worldwide"]);
    expect(ids("BE")).toEqual(["europe", "us", "worldwide"]);
    expect(ids("NG")).toEqual(["worldwide", "us", "europe"]);
    expect(ids("")).toEqual(["worldwide", "us", "europe"]);
  });

  it("shows enabled methods in config order", () => {
    const us = groupedPaymentMethods("US")[0].methods.map((m) => m.id);
    expect(us).toEqual(["zelle", "cash-app", "venmo", "chime", "apple-pay", "ach"]);
    expect(paymentMethods.every((m) => m.fields.length > 0)).toBe(true);
  });
});
