import Joi from "joi";

export const createAdminUserSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Name is required",
  }),

  "Mobile No": Joi.string().trim().pattern(/^(\+91|91)?\d{10}$/).required().messages({
    "string.empty": "Mobile No is required",
    "string.pattern.base": "Mobile No must be a valid 10-digit number with optional +91/91 prefix",
  }),
  "Date Of Birth": Joi.date().iso().allow(null, '').default(() => new Date("1970-01-01")),
  gender: Joi.string().valid("Male", "Female", "Other").default("Other"),

  status: Joi.string().valid("active", "inactive").default("active"),
});

export const updateAdminUserSchema = Joi.object({
  name: Joi.string().trim().optional(),

  "Mobile No": Joi.string().trim().pattern(/^(\+91|91)?\d{10}$/).optional().messages({
    "string.pattern.base": "Mobile No must be a valid 10-digit number with optional +91/91 prefix",
  }),
  "Date Of Birth": Joi.date().iso().allow(null, '').optional(),
  gender: Joi.string().valid("Male", "Female", "Other").optional(),

  status: Joi.string().valid("active", "inactive").optional(),
});


export function validateAdminSchema(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (!error) return value;
  const err = new Error(error.details.map((item) => item.message).join("; "));
  err.statusCode = 400;
  err.details = error.details.map((item) => ({
    field: item.path.join("."),
    message: item.message,
  }));
  throw err;
}
