import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import User from "../../models/customer.js";
import {
  getUserByIdData,
  getUsersData,
} from "../../services/admin/userAdminService.js";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  validateAdminSchema,
} from "../../validation/adminUserValidation.js";
import xlsx from "xlsx";
import { normalizePhoneNumber } from "../../utils/phone.js";
import { notify } from "../../modules/notifications/notification.service.js";
import { NOTIFICATION_EVENTS, NOTIFICATION_ROLES } from "../../modules/notifications/notification.constants.js";
import Notification from "../../modules/notifications/notification.model.js";
import { deliverNotificationById } from "../../modules/notifications/notification.worker.js";

// Helper to parse dates from spreadsheet cells (Excel serial number or string)
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel base date is Dec 30 1899
    return new Date((val - 25569) * 86400 * 1000);
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

export const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });
    const { customerType } = req.query;

    const data = await getUsersData({ page, limit, skip, customerType });
    return handleResponse(res, 200, "Users fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdData(id);

    if (!user) {
      return handleResponse(res, 404, "Customer not found");
    }

    return handleResponse(
      res,
      200,
      "Customer details fetched successfully",
      user,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   MANUAL USER CREATION
   =============================== */
export const createUser = async (req, res) => {
  try {
    const payload = validateAdminSchema(createAdminUserSchema, req.body || {});
    const normalizedMobile = normalizePhoneNumber(payload["Mobile No"]);

    // Check duplicates in database
    const duplicate = await User.findOne({
      $or: [
        { phone: normalizedMobile },
        { "Mobile No": normalizedMobile },
        { "eAnnadata Card Number": payload["eAnnadata Card Number"] },
      ],
    }).lean();

    if (duplicate) {
      const isCardDuplicate = duplicate["eAnnadata Card Number"] === payload["eAnnadata Card Number"];
      return handleResponse(
        res,
        409,
        isCardDuplicate
          ? "eAnnadata Card Number is already registered."
          : "Mobile No is already registered.",
      );
    }

    const newUser = await User.create({
      name: payload.name,
      phone: payload["Mobile No"],
      "Mobile No": payload["Mobile No"],
      "Date Of Birth": payload["Date Of Birth"],
      gender: payload.gender,
      status: payload.status || "active",
      isActive: payload.status !== "inactive",
      created_by: req.user.id,
      role: "user",
      isVerified: true, // Mark verified directly since added by Admin
    });

    return handleResponse(res, 201, "User created successfully", newUser);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/* ===============================
   MANUAL USER UPDATE
   =============================== */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return handleResponse(res, 404, "User not found");
    }

    const payload = validateAdminSchema(updateAdminUserSchema, req.body || {});

    // Check duplicates if changing phone or card
    if (payload["Mobile No"] || payload["eAnnadata Card Number"]) {
      const query = { _id: { $ne: id } };
      const orConditions = [];
      if (payload["Mobile No"]) {
        const normalizedMobile = normalizePhoneNumber(payload["Mobile No"]);
        orConditions.push({ phone: normalizedMobile });
        orConditions.push({ "Mobile No": normalizedMobile });
      }
      if (payload["eAnnadata Card Number"]) {
        orConditions.push({ "eAnnadata Card Number": payload["eAnnadata Card Number"] });
      }
      query.$or = orConditions;

      const duplicate = await User.findOne(query).lean();
      if (duplicate) {
        const isCardDuplicate = duplicate["eAnnadata Card Number"] === payload["eAnnadata Card Number"];
        return handleResponse(
          res,
          409,
          isCardDuplicate
            ? "eAnnadata Card Number is already registered to another user."
            : "Mobile No is already registered to another user.",
        );
      }
    }

    // Apply updates
    if (payload.name !== undefined) {
      user.name = payload.name;
    }
    if (payload["Mobile No"] !== undefined) {
      user.phone = payload["Mobile No"];
      user["Mobile No"] = payload["Mobile No"];
    }
    if (payload.status !== undefined) {
      user.status = payload.status;
      user.isActive = payload.status !== "inactive";
    }


    await user.save();

    return handleResponse(res, 200, "User updated successfully", user);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/* ===============================
   UPDATE STATUS (Deactivate/Activate)
   =============================== */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return handleResponse(res, 400, "Invalid status. Must be active or inactive.");
    }

    const user = await User.findById(id);
    if (!user) {
      return handleResponse(res, 404, "User not found");
    }

    user.status = status;
    user.isActive = status === "active";
    await user.save();

    return handleResponse(
      res,
      200,
      `User successfully ${status === "active" ? "activated" : "deactivated"}`,
      user,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   BULK UPLOAD USERS (CSV/Excel)
   =============================== */
export const bulkUploadUsers = async (req, res) => {
  try {
    if (!req.file) {
      return handleResponse(res, 400, "No file uploaded. Please select a CSV or Excel file.");
    }

    // Parse spreadsheet in memory
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rawRows || rawRows.length === 0) {
      return handleResponse(res, 400, "The uploaded file is empty.");
    }

    const successRows = [];
    const failedRows = [];

    // Keys mapping helper to handle varied spelling/spacing
    const normalizeHeaders = (row) => {
      const normalized = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().toLowerCase().replace(/[\s_'/]/g, "");
        const value = String(row[key]).trim();

        if (["farmername", "fullname", "name", "customername", "username", "customer", "user", "beneficiaryname", "beneficiary", "cardholder", "cardholdername", "membername", "member", "nameinenglish", "englishname", "canteenuser"].includes(cleanKey)) {
          normalized.name = value;
        } else if (["eannadatacardnumber", "cardnumber", "eannadata_card_number", "cardno", "card", "cardno", "eannadatacard", "ennadatacard", "ennadatacardnumber", "cardid"].includes(cleanKey)) {
          normalized["eAnnadata Card Number"] = value;
        } else if (["fathermotherhusband", "fathername", "mothername", "father", "mother", "husband", "fname", "mname"].includes(cleanKey)) {
          normalized["Father/Mother/Husband"] = value;
        } else if (["phone", "phonenumber", "phone_number", "mobile", "mobileno", "contact", "contactnumber", "phone_no", "phoneno", "mobilenumber", "tel", "telephone"].includes(cleanKey)) {
          normalized["Mobile No"] = value;
        } else if (["dob", "dateofbirth", "birthdate", "birth"].includes(cleanKey)) {
          normalized["Date Of Birth"] = parseDateValue(row[key]);
        } else if (["registrationdate", "regdate", "carddate", "eannadataregdate", "cardregistrationdate", "eannadatacardregistrationdate"].includes(cleanKey)) {
          // "Registration Date" from Excel → eAnnadata Card Registration Date (used for DBT tier calculation)
          normalized["eAnnadata Card Registration Date"] = parseDateValue(row[key]);
        } else if (["gender", "sex"].includes(cleanKey)) {
          normalized.gender = value;
        } else if (["pincode", "pin", "zip", "zipcode"].includes(cleanKey)) {
          normalized["Pin Code"] = value;
        } else if (["state", "statename"].includes(cleanKey)) {
          normalized["State Name"] = value;
        } else if (["district", "districtname"].includes(cleanKey)) {
          normalized["District Name"] = value;
        } else if (cleanKey === "block" || cleanKey === "blockname") {
          normalized["Block Name"] = value;
        } else if (cleanKey === "village" || cleanKey === "villagename") {
          normalized["Village Name"] = value;
        } else if (["acholdername", "accountholdername", "acholder", "accountholder", "holdername", "bankholdername"].includes(cleanKey)) {
          normalized["A/C Holder Name"] = value;
        } else if (["bankname", "bank", "nameofbank"].includes(cleanKey)) {
          normalized["Bank Name"] = value;
        } else if (["acnumber", "accountnumber", "acno", "accountno", "accountnum", "acnum", "bankaccountnumber", "bankacnumber"].includes(cleanKey)) {
          normalized["A/C Number"] = value;
        } else if (["ifsccode", "ifsc", "ifsc_code", "bankifsc", "bankifsccode"].includes(cleanKey)) {
          normalized["Ifsc Code"] = value;
        } else if (cleanKey === "status") {
          normalized.status = value;
        }
      });


      // Backup fallbacks for common columns if header is not exact
      if (!normalized.name) {
        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim().toLowerCase().replace(/[\s_'/]/g, "");
          if (cleanKey.includes("name") && String(row[key]).trim()) {
            normalized.name = String(row[key]).trim();
          }
        });
      }
      if (!normalized["Mobile No"]) {
        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim().toLowerCase().replace(/[\s_'/]/g, "");
          if ((cleanKey.includes("phone") || cleanKey.includes("mobile") || cleanKey.includes("contact")) && String(row[key]).trim()) {
            normalized["Mobile No"] = String(row[key]).trim().replace(/\D/g, '');
          }
        });
      }
      if (!normalized["eAnnadata Card Number"]) {
        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim().toLowerCase().replace(/[\s_'/]/g, "");
          if ((cleanKey.includes("card") || cleanKey.includes("number") || cleanKey.includes("id")) && cleanKey !== "mobileno" && cleanKey !== "farmername" && String(row[key]).trim()) {
            normalized["eAnnadata Card Number"] = String(row[key]).trim();
          }
        });
      }

      return normalized;
    };

    // Tracking for internal file duplicates
    const fileMobiles = new Set();
    const fileCards = new Set();

    // STEP 1: Row validation
    const parsedRows = rawRows.map((row, idx) => {
      const normalizedRow = normalizeHeaders(row);
      const rowNum = idx + 2; // spreadsheet 1-indexed, header is row 1

      // Joi validation
      const { error, value } = createAdminUserSchema.validate(normalizedRow, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        failedRows.push({
          row: rowNum,
          name: normalizedRow.name || "Row " + rowNum,
          phone: normalizedRow["Mobile No"] || "N/A",
          reason: error.details.map((item) => item.message).join("; "),
        });
        return null;
      }

      // Check duplicates within the uploaded file
      if (fileMobiles.has(value["Mobile No"])) {
        failedRows.push({
          row: rowNum,
          name: value.name,
          phone: value["Mobile No"],
          reason: "Duplicate Mobile No in upload file.",
        });
        return null;
      }
      if (fileCards.has(value["eAnnadata Card Number"])) {
        failedRows.push({
          row: rowNum,
          name: value.name,
          phone: value["Mobile No"],
          reason: "Duplicate eAnnadata Card Number in upload file.",
        });
        return null;
      }

      fileMobiles.add(value["Mobile No"]);
      fileCards.add(value["eAnnadata Card Number"]);

      return { ...value, rowNum };
    }).filter(Boolean);

    // STEP 2: Database duplicate check
    if (parsedRows.length > 0) {
      const mobilesToCheck = parsedRows.map((r) => r["Mobile No"]);
      const normalizedMobiles = mobilesToCheck.map(m => normalizePhoneNumber(m));
      const cardsToCheck = parsedRows.map((r) => r["eAnnadata Card Number"]);

      const existingUsers = await User.find({
        $or: [
          { phone: { $in: normalizedMobiles } },
          { "Mobile No": { $in: normalizedMobiles } },
          { "eAnnadata Card Number": { $in: cardsToCheck } },
        ],
      }).select({ phone: 1, "Mobile No": 1, "eAnnadata Card Number": 1 }).lean();

      const existingPhones = new Set();
      const existingCards = new Set();

      existingUsers.forEach((u) => {
        if (u.phone) existingPhones.add(u.phone);
        if (u["Mobile No"]) existingPhones.add(u["Mobile No"]);
        if (u["eAnnadata Card Number"]) existingCards.add(u["eAnnadata Card Number"]);
      });

      // Filter out DB duplicates
      const finalRowsToInsert = [];
      parsedRows.forEach((row) => {
        const normPhone = normalizePhoneNumber(row["Mobile No"]);
        const phoneDup = existingPhones.has(normPhone) || existingPhones.has(row["Mobile No"]);
        const cardDup = existingCards.has(row["eAnnadata Card Number"]);

        if (phoneDup) {
          failedRows.push({
            row: row.rowNum,
            name: row.name,
            phone: row["Mobile No"],
            reason: "Mobile No is already registered in database.",
          });
        } else {
          finalRowsToInsert.push({
            name: row.name,
            phone: row["Mobile No"],
            "Mobile No": row["Mobile No"],
            "Date Of Birth": row["Date Of Birth"],
            gender: row.gender,

            status: row.status || "active",
            isActive: row.status !== "inactive",
            created_by: req.user.id,
            role: "user",
            isVerified: true,
          });
        }
      });

      // STEP 3: Bulk insert to database
      if (finalRowsToInsert.length > 0) {
        await User.insertMany(finalRowsToInsert, { ordered: false });
      }
    }

    const successCount = rawRows.length - failedRows.length;

    return handleResponse(res, 200, "Bulk upload finished.", {
      totalRows: rawRows.length,
      successCount,
      failureCount: failedRows.length,
      failedRows,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   VERIFY E-ANNDATA CARD
   =============================== */
export const verifyUserCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return handleResponse(res, 400, "Invalid action. Must be 'approve' or 'reject'.");
    }

    const user = await User.findById(id);
    if (!user) {
      return handleResponse(res, 404, "User not found");
    }

    if (user["eAnnadata Card Status"] !== "pending") {
      return handleResponse(res, 400, `Card is not in pending state (current: ${user["eAnnadata Card Status"]})`);
    }

    user["eAnnadata Card Status"] = action === "approve" ? "yes" : "rejected";
    await user.save();

    return handleResponse(
      res,
      200,
      `Card ${action === "approve" ? "approved" : "rejected"} successfully`,
      { cardStatus: user["eAnnadata Card Status"] }
    );
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/* ===============================
   SEND DIRECT NOTIFICATION TO CUSTOMER
   =============================== */
export const sendUserNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, title } = req.body || {};

    if (!message || !String(message).trim()) {
      return handleResponse(res, 400, "Notification message is required.");
    }

    const user = await User.findById(id);
    if (!user) {
      return handleResponse(res, 404, "Customer not found.");
    }

    const notifTitle = title || "Notice from eAnnadata Canteen";
    const notifBody = String(message).trim();
    const timestamp = Date.now();
    const dedupeKey = `DIRECT:${user._id.toString()}:${timestamp}`;

    const notificationDoc = await Notification.create({
      userId: user._id,
      role: "customer",
      recipient: user._id,
      recipientModel: "User",
      type: "system",
      title: notifTitle,
      body: notifBody,
      message: notifBody,
      isRead: false,
      status: "pending",
      channel: "push",
      provider: "fcm",
      dedupeKey,
      data: {
        type: "ADMIN_DIRECT_MESSAGE",
        customerId: user._id.toString(),
        sentByAdminId: req.user?.id,
      },
    });

    try {
      await deliverNotificationById(notificationDoc._id);
    } catch (deliverErr) {
      // background delivery fallback
    }

    return handleResponse(res, 200, "Notification sent successfully to customer", {
      customerId: user._id,
      notificationId: notificationDoc._id,
      message: notifBody,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

