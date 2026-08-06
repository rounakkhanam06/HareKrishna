import Joi from "joi";

export const RATING_TAG_WHITELIST = [
  "Fast Delivery",
  "Friendly",
  "Helpful",
  "Professional",
  "Polite",
  "Careful Handling",
  "Late Delivery",
  "Rude Behaviour",
  "Package Mishandled",
];

export const createDeliveryRatingSchema = Joi.object({
  stars: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be at least 1 star.",
    "number.max": "Rating cannot exceed 5 stars.",
    "any.required": "Rating stars is required.",
  }),
  review: Joi.string().trim().max(1000).allow("").messages({
    "string.max": "Review cannot exceed 1000 characters.",
  }),
  tags: Joi.array()
    .items(Joi.string().valid(...RATING_TAG_WHITELIST))
    .unique()
    .custom((value, helpers) => {
      const { stars } = helpers.state.ancestors[0];
      const positiveTags = [
        "Fast Delivery",
        "Friendly",
        "Helpful",
        "Professional",
        "Polite",
        "Careful Handling",
      ];
      const negativeTags = [
        "Late Delivery",
        "Rude Behaviour",
        "Package Mishandled",
      ];

      if (stars >= 4) {
        const hasNegative = value.some((t) => negativeTags.includes(t));
        if (hasNegative) {
          return helpers.error("any.invalid");
        }
      } else {
        const hasPositive = value.some((t) => positiveTags.includes(t));
        if (hasPositive) {
          return helpers.error("any.invalid");
        }
      }
      return value;
    })
    .messages({
      "any.only": "Invalid feedback tag provided.",
      "any.invalid": "Feedback tags must match the rating sentiment (positive tags for 4-5 stars, negative tags for 1-3 stars).",
    }),
});
