import { describe, it, expect } from "@jest/globals";
import { validateReview } from "../app/services/productRating.service.js";

describe("Product Review Validation Helper", () => {
  it("should pass valid review parameters", () => {
    const data = {
      stars: 5,
      review: "The apples are extremely fresh and crispy!",
      tags: ["Fresh", "Premium Quality"],
      images: ["https://cloudinary.com/test1.jpg", "https://cloudinary.com/test2.jpg"]
    };
    expect(() => validateReview(data)).not.toThrow();
  });

  it("should reject rating stars out of bounds", () => {
    const data = {
      stars: 0,
      review: "Good product!",
      tags: ["Fresh"],
      images: ["https://cloudinary.com/test.jpg"]
    };
    expect(() => validateReview(data)).toThrow("Rating stars must be a number between 1 and 5.");

    const data2 = {
      stars: 6,
      review: "Good product!",
      tags: ["Fresh"],
      images: ["https://cloudinary.com/test.jpg"]
    };
    expect(() => validateReview(data2)).toThrow("Rating stars must be a number between 1 and 5.");
  });

  it("should reject too short or too long review comments", () => {
    const data = {
      stars: 4,
      review: "Okay", // under 5 chars
      tags: ["Fresh"],
      images: ["https://cloudinary.com/test.jpg"]
    };
    expect(() => validateReview(data)).toThrow("Review comment must be between 5 and 1000 characters.");

    const data2 = {
      stars: 4,
      review: "a".repeat(1001), // over 1000 chars
      tags: ["Fresh"],
      images: ["https://cloudinary.com/test.jpg"]
    };
    expect(() => validateReview(data2)).toThrow("Review comment must be between 5 and 1000 characters.");
  });

  it("should reject invalid/unlisted tags", () => {
    const data = {
      stars: 5,
      review: "Absolutely amazing product",
      tags: ["Fresh", "Awesome Sauce"], // unlisted tag
      images: ["https://cloudinary.com/test.jpg"]
    };
    expect(() => validateReview(data)).toThrow('Invalid tag: "Awesome Sauce". Only predefined tags are accepted.');
  });

  it("should reject reviews without at least 1 image", () => {
    const data = {
      stars: 5,
      review: "Absolutely amazing product",
      tags: ["Fresh"],
      images: [] // empty images
    };
    expect(() => validateReview(data)).toThrow("Please upload at least 1 image of the product.");

    const data2 = {
      stars: 5,
      review: "Absolutely amazing product",
      tags: ["Fresh"]
      // missing images
    };
    expect(() => validateReview(data2)).toThrow("Please upload at least 1 image of the product.");
  });

  it("should reject too many images", () => {
    const data = {
      stars: 4,
      review: "Decent product",
      tags: ["Fresh"],
      images: [
        "https://cloudinary.com/1.jpg",
        "https://cloudinary.com/2.jpg",
        "https://cloudinary.com/3.jpg",
        "https://cloudinary.com/4.jpg",
        "https://cloudinary.com/5.jpg",
        "https://cloudinary.com/6.jpg" // 6 images (max 5)
      ]
    };
    expect(() => validateReview(data)).toThrow("Maximum 5 images allowed per review.");
  });
});
