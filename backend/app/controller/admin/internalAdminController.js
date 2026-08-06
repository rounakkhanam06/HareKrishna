import Admin from "../../models/admin.js";
import handleResponse from "../../utils/helper.js";
import Joi from "joi";

const passwordSchema = Joi.string()
  .min(10)
  .max(128)
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[0-9]/, "number");

const createInternalAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: passwordSchema.required(),
  permissions: Joi.array().items(Joi.string()).default(["dashboard"]),
  isSuperAdmin: Joi.boolean().default(false),
});

const updateInternalAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  email: Joi.string().trim().lowercase().email().optional(),
  password: passwordSchema.optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isSuperAdmin: Joi.boolean().optional(),
});

export const getInternalAdmins = async (req, res) => {
  try {
    // Return all admins. Exclude password field.
    const admins = await Admin.find({}).select("-password").sort({ createdAt: -1 });
    return handleResponse(res, 200, "Internal admins fetched successfully", admins);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createInternalAdmin = async (req, res) => {
  try {
    const { error, value } = createInternalAdminSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return handleResponse(res, 400, error.details.map((item) => item.message).join("; "));
    }

    // Check if duplicate email
    const duplicate = await Admin.findOne({ email: value.email }).lean();
    if (duplicate) {
      return handleResponse(res, 409, "Email is already registered as an admin");
    }

    const newAdmin = await Admin.create({
      name: value.name,
      email: value.email,
      password: value.password,
      permissions: value.permissions,
      isSuperAdmin: value.isSuperAdmin,
      isVerified: true,
      role: "admin",
    });

    const sanitized = newAdmin.toObject();
    delete sanitized.password;

    return handleResponse(res, 201, "Internal admin created successfully", sanitized);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateInternalAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateInternalAdminSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return handleResponse(res, 400, error.details.map((item) => item.message).join("; "));
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return handleResponse(res, 404, "Internal admin not found");
    }

    // Check email duplicate if changing email
    if (value.email && value.email !== admin.email) {
      const duplicate = await Admin.findOne({ email: value.email, _id: { $ne: id } }).lean();
      if (duplicate) {
        return handleResponse(res, 409, "Email is already in use by another admin");
      }
      admin.email = value.email;
    }

    if (value.name) admin.name = value.name;
    if (value.permissions) admin.permissions = value.permissions;
    if (value.isSuperAdmin !== undefined) {
      // Prevent self-demotion or modifying own superadmin status
      if (req.user.id === id && admin.isSuperAdmin !== value.isSuperAdmin) {
        return handleResponse(res, 400, "Cannot change your own superadmin status");
      }
      admin.isSuperAdmin = value.isSuperAdmin;
    }

    if (value.password) {
      admin.password = value.password; // Mongoose pre-save hook will hash it
    }

    await admin.save();

    const sanitized = admin.toObject();
    delete sanitized.password;

    return handleResponse(res, 200, "Internal admin updated successfully", sanitized);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const deleteInternalAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return handleResponse(res, 400, "You cannot delete your own admin account");
    }

    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return handleResponse(res, 404, "Internal admin not found");
    }

    return handleResponse(res, 200, "Internal admin deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
