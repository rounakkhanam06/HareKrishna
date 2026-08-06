import Joi from "joi";

export const sendSignupOtpSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  phone: Joi.string().trim().min(7).max(24).required(),
});

// Clean signup — no card fields. Subsidy is only for admin-added farmers.
export const signupSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  phone: Joi.string().trim().pattern(/^\d{10}$/).required().messages({
    "string.pattern.base": "Phone number must be a valid 10-digit number",
  }),
  email: Joi.string().trim().email().lowercase().optional().allow("", null),
});


export const sendLoginOtpSchema = Joi.object({
  phone: Joi.string().trim().min(7).max(24).required(),
});

export const verifyOtpSchema = Joi.object({
  phone: Joi.string().trim().min(7).max(24).required(),
  otp: Joi.string().trim().pattern(/^\d{4,8}$/).required(),
});

export function validateSchema(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (!error) return value;
  const err = new Error(error.details.map((item) => item.message).join("; "));
  err.statusCode = 400;
  throw err;
}
