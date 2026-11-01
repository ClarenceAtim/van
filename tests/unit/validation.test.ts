import { describe, expect, it } from "vitest";
import { addressSchema, cartMutationSchema, checkoutSchema, contactSchema, reviewSchema, safeRedirect, signupSchema } from "@/lib/validation";

describe("safeRedirect (open-redirect protection)", () => {
  it("allows same-site paths", () => {
    expect(safeRedirect("/account/orders")).toBe("/account/orders");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])("rejects %s", (v) => {
    expect(safeRedirect(v)).toBe("/account");
  });
});

describe("cartMutationSchema", () => {
  it("accepts a slug and quantity", () => {
    expect(cartMutationSchema.parse({ slug: "normal-ball-python", quantity: "2" })).toEqual({ slug: "normal-ball-python", quantity: 2 });
  });
  it("rejects price fields, bad slugs and silly quantities", () => {
    expect(cartMutationSchema.safeParse({ slug: "../etc/passwd", quantity: 1 }).success).toBe(false);
    expect(cartMutationSchema.safeParse({ slug: "a", quantity: 1000 }).success).toBe(false);
    expect(cartMutationSchema.safeParse({ slug: "a", quantity: -1 }).success).toBe(false);
    // Unknown keys such as a client-sent price are stripped, never used.
    expect(cartMutationSchema.parse({ slug: "a", quantity: 1, price_cents: 1 })).not.toHaveProperty("price_cents");
  });
});

describe("contactSchema", () => {
  it("trims, lowercases email and strips control characters", () => {
    const r = contactSchema.parse({ name: "  Ann\u0000 ", email: " ANN@Example.COM ", subject: "Hello there", message: "Line one\r\nLine two is long enough" });
    expect(r.name).toBe("Ann");
    expect(r.email).toBe("ann@example.com");
    expect(r.message).toBe("Line one\nLine two is long enough");
  });
  it("rejects missing or oversized fields", () => {
    expect(contactSchema.safeParse({ name: "A", email: "x", subject: "", message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ann", email: "a@b.co", subject: "Hi there", message: "x".repeat(5001) }).success).toBe(false);
  });
  it("keeps HTML as plain text (it is rendered escaped, never as markup)", () => {
    const r = contactSchema.parse({ name: "Ann", email: "a@b.co", subject: "<b>hi</b>", message: "<script>alert(1)</script> hello" });
    expect(r.message).toContain("<script>");
  });
});

describe("signupSchema", () => {
  it("requires a reasonably strong password", () => {
    const base = { fullName: "Ann Lee", email: "a@b.co" };
    expect(signupSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "onlyletterslong" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "longenough123" }).success).toBe(true);
  });
});

describe("checkoutSchema", () => {
  it("requires a valid US state and parses the 18+ checkbox", () => {
    expect(checkoutSchema.parse({ shippingRegion: "TX", liveAnimalAck: "on" }).liveAnimalAck).toBe(true);
    expect(checkoutSchema.parse({ shippingRegion: "TX" }).liveAnimalAck).toBe(false);
    expect(checkoutSchema.safeParse({ shippingRegion: "ZZ" }).success).toBe(false);
  });
});

describe("addressSchema and reviewSchema", () => {
  it("validates ZIP codes and ratings", () => {
    const address = { full_name: "Ann Lee", line1: "1 Main St", city: "Austin", region: "TX", postal_code: "78701" };
    expect(addressSchema.safeParse(address).success).toBe(true);
    expect(addressSchema.safeParse({ ...address, postal_code: "ABCDE" }).success).toBe(false);
    expect(reviewSchema.safeParse({ productSlug: "a", rating: 6, title: "Great", body: "x".repeat(30) }).success).toBe(false);
  });
});
