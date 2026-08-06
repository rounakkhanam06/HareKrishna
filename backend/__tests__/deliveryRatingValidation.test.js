import { describe, it, expect } from "@jest/globals";
import { createDeliveryRatingSchema } from "../app/validation/deliveryRatingValidation.js";

describe("Delivery Rating Validation Schema", () => {
  describe("createDeliveryRatingSchema", () => {
    it("should pass valid rating data with positive tags", () => {
      const data = {
        stars: 5,
        review: "Excellent service!",
        tags: ["Fast Delivery", "Friendly"]
      };
      const { error, value } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeUndefined();
      expect(value.stars).toBe(5);
    });

    it("should pass valid rating data with negative tags", () => {
      const data = {
        stars: 2,
        review: "Very slow delivery",
        tags: ["Late Delivery", "Package Mishandled"]
      };
      const { error, value } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeUndefined();
      expect(value.stars).toBe(2);
    });

    it("should reject rating stars out of 1-5 range", () => {
      const data = {
        stars: 6,
        review: "Awesome",
        tags: ["Fast Delivery"]
      };
      const { error } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject invalid tags", () => {
      const data = {
        stars: 5,
        review: "Excellent",
        tags: ["Fast Delivery", "Invalid Tag Here"]
      };
      const { error } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject negative tags for high rating", () => {
      const data = {
        stars: 5,
        review: "Excellent",
        tags: ["Late Delivery"]
      };
      const { error } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject positive tags for low rating", () => {
      const data = {
        stars: 2,
        review: "Poor",
        tags: ["Fast Delivery"]
      };
      const { error } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject review comments longer than 1000 characters", () => {
      const data = {
        stars: 4,
        review: "a".repeat(1001),
        tags: ["Friendly"]
      };
      const { error } = createDeliveryRatingSchema.validate(data);
      expect(error).toBeDefined();
    });
  });
});
