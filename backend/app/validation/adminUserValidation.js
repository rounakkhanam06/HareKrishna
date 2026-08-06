import Joi from "joi";

export const createAdminUserSchema = Joi.object({
  "Farmer Name": Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Farmer Name is required",
    "string.min": "Farmer Name must be at least 2 characters",
  }),
  "eAnnadata Card Number": Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "eAnnadata Card Number is required",
  }),
  // Registration Date is required for DBT subsidy tier calculation
  "eAnnadata Card Registration Date": Joi.date().iso().required().messages({
    "date.base": "Registration Date is required for DBT subsidy calculation",
    "any.required": "Registration Date is required for DBT subsidy calculation",
  }),
  "Father/Mother/Husband": Joi.string().trim().allow('').default("N/A"),
  "Mobile No": Joi.string().trim().pattern(/^(\+91|91)?\d{10}$/).required().messages({
    "string.empty": "Mobile No is required",
    "string.pattern.base": "Mobile No must be a valid 10-digit number with optional +91/91 prefix",
  }),
  "Date Of Birth": Joi.date().iso().allow(null, '').default(() => new Date("1970-01-01")),
  gender: Joi.string().valid("Male", "Female", "Other").default("Other"),
  "Pin Code": Joi.string().trim().allow('').default("N/A"),
  "State Name": Joi.string().trim().allow('').default("N/A"),
  "District Name": Joi.string().trim().allow('').default("N/A"),
  "Block Name": Joi.string().trim().allow('').default("N/A"),
  "Village Name": Joi.string().trim().allow('').default("N/A"),
  "A/C Holder Name": Joi.string().trim().allow('').default("N/A"),
  "Bank Name": Joi.string().trim().allow('').default("N/A"),
  "A/C Number": Joi.string().trim().allow('').default("N/A"),
  "Ifsc Code": Joi.string().trim().allow('').default("N/A"),
  status: Joi.string().valid("active", "inactive").default("active"),
});

export const updateAdminUserSchema = Joi.object({
  "Farmer Name": Joi.string().trim().min(2).max(100).optional(),
  "eAnnadata Card Number": Joi.string().trim().min(3).max(50).optional(),
  // Registration Date can be corrected via update
  "eAnnadata Card Registration Date": Joi.date().iso().allow(null, '').optional(),
  "Father/Mother/Husband": Joi.string().trim().allow('').optional(),
  "Mobile No": Joi.string().trim().pattern(/^(\+91|91)?\d{10}$/).optional().messages({
    "string.pattern.base": "Mobile No must be a valid 10-digit number with optional +91/91 prefix",
  }),
  "Date Of Birth": Joi.date().iso().allow(null, '').optional(),
  gender: Joi.string().valid("Male", "Female", "Other").optional(),
  "Pin Code": Joi.string().trim().allow('').optional(),
  "State Name": Joi.string().trim().allow('').optional(),
  "District Name": Joi.string().trim().allow('').optional(),
  "Block Name": Joi.string().trim().allow('').optional(),
  "Village Name": Joi.string().trim().allow('').optional(),
  "A/C Holder Name": Joi.string().trim().allow('').optional(),
  "Bank Name": Joi.string().trim().allow('').optional(),
  "A/C Number": Joi.string().trim().allow('').optional(),
  "Ifsc Code": Joi.string().trim().allow('').optional(),
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
