import { jest } from "@jest/globals";
import Seller from "../app/models/seller.js";

describe("Seller default password check", () => {
  it("should match default password 'seller123' regardless of stored password", async () => {
    const seller = new Seller({
      name: "Test Seller",
      email: "test@seller.com",
      phone: "1234567890",
      password: "hashed_dummy_password",
      shopName: "Test Shop"
    });

    const isMatchDefault = await seller.comparePassword("seller123");
    expect(isMatchDefault).toBe(true);
  });

  it("should not match random wrong passwords", async () => {
    const seller = new Seller({
      name: "Test Seller",
      email: "test@seller.com",
      phone: "1234567890",
      password: "hashed_dummy_password",
      shopName: "Test Shop"
    });

    const isMatchWrong = await seller.comparePassword("wrong_password");
    expect(isMatchWrong).toBe(false);
  });
});
