import Customer from "../models/customer.js";
import Transaction from "../models/transaction.js";
import jwt from "jsonwebtoken";
import Wallet from "../models/wallet.js";
import LedgerEntry from "../models/ledgerEntry.js";
import Order from "../models/order.js";
import handleResponse from "../utils/helper.js";
import * as walletService from "../services/finance/walletService.js";
import { roundCurrency } from "../utils/money.js";
import {
    issueCustomerOtp,
    sanitizeCustomer,
    verifyCustomerOtpCode,
} from "../services/otpAuthService.js";
import {
    sendLoginOtpSchema,
    sendSignupOtpSchema,
    signupSchema,
    validateSchema,
    verifyOtpSchema,
} from "../validation/customerAuthValidation.js";
import { normalizePhoneNumber } from "../utils/phone.js";


const generateToken = (customer) =>
    jwt.sign(
        { id: customer._id, role: "customer" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

/* ===============================
   SIGNUP – Send OTP
================================ */
export const signupCustomer = async (req, res) => {
    try {
        const payload = validateSchema(signupSchema, req.body || {});

        const phone = normalizePhoneNumber(payload.phone);
        const email = payload.email ? payload.email.trim().toLowerCase() : undefined;

        // Prevent duplicate phone numbers (only if the user is already verified)
        const existingPhone = await Customer.findOne({ phone });
        if (existingPhone && existingPhone.isVerified) {
            return handleResponse(res, 400, "Phone number is already registered");
        }

        // Prevent duplicate emails (if email was provided and user is already verified)
        if (email) {
            const existingEmail = await Customer.findOne({ email });
            if (existingEmail && existingEmail.isVerified) {
                return handleResponse(res, 400, "Email is already registered");
            }
        }

        // Create or update existing unverified user
        let customer = existingPhone;
        const name = `${payload.firstName} ${payload.lastName}`.trim();

        const customerData = {
            name,
            phone,
            email: email || undefined,
            isVerified: false,
            isActive: true,
            role: "user",
            isSubsidyEligible: false,
            "eAnnadata Card Status": "no",
        };

        if (!customer) {
            customer = await Customer.create(customerData);
        } else {
            Object.assign(customer, customerData);
            await customer.save();
        }

        // Issue OTP for verification using the existing service
        await issueCustomerOtp({
            name: customer.name,
            rawPhone: customer.phone,
            flow: "signup",
            ipAddress: req.ip,
        });

        return handleResponse(res, 200, "Registration successful. OTP sent for verification.");
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};



/* ===============================
   LOGIN – Send OTP
================================ */
export const loginCustomer = async (req, res) => {
    try {
        const payload = validateSchema(sendLoginOtpSchema, req.body || {});

        await issueCustomerOtp({
            rawPhone: payload.phone,
            flow: "login",
            ipAddress: req.ip,
        });

        return handleResponse(res, 200, "If the number is eligible, OTP has been sent");
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   VERIFY OTP – Login / Signup
================================ */
export const verifyCustomerOTP = async (req, res) => {
    try {
        const payload = validateSchema(verifyOtpSchema, req.body || {});
        const customer = await verifyCustomerOtpCode({
            rawPhone: payload.phone,
            otp: payload.otp,
            ipAddress: req.ip,
        });
        const token = generateToken(customer);

        return handleResponse(
            res,
            200,
            "Login successful",
            {
                token,
                customer: sanitizeCustomer(customer),
            }
        );
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   GET PROFILE
================================ */
export const getCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id);
        if (!customer) {
            return handleResponse(res, 404, "Customer not found");
        }

        const customerObj = customer.toObject({ virtuals: true });
        const wallet = await Wallet.findOne({ ownerId: customer._id, ownerType: "CUSTOMER" });
        const orderCount = await Order.countDocuments({ customer: customer._id });

        const releasedLedgers = await LedgerEntry.find({
            actorId: customer._id,
            type: { $in: ["DBT_SUBSIDY_CREDITED", "DBT_SUBSIDY_RELEASED"] },
            status: "COMPLETED"
        });
        const dbtSubsidy = releasedLedgers.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        const pendingSubsidy = wallet ? (wallet.lockedSubsidyBalance || 0) : 0;

        customerObj.orderCount = orderCount;
        customerObj.pendingSubsidy = pendingSubsidy;
        customerObj.dbtSubsidy = dbtSubsidy;
        customerObj.totalSubsidy = dbtSubsidy + pendingSubsidy;
        customerObj.lockedSubsidyBalance = pendingSubsidy;

        return handleResponse(res, 200, "Profile fetched successfully", customerObj);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   UPDATE PROFILE
================================ */
export const updateCustomerProfile = async (req, res) => {
    try {
        const { name, email, addresses } = req.body;

        const customer = await Customer.findById(req.user.id);
        if (!customer) {
            return handleResponse(res, 404, "Customer not found");
        }

        if (name) customer.name = name;
        if (email) customer.email = email;
        if (addresses) customer.addresses = addresses;

        await customer.save();

        return handleResponse(res, 200, "Profile updated successfully", customer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET WALLET TRANSACTIONS
================================ */
export const getCustomerTransactions = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
        const perPage = Math.min(50, Math.max(1, parseInt(limit, 10)));

        const [ledgers, total] = await Promise.all([
            LedgerEntry.find({ actorId: customerId, actorType: "CUSTOMER" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .populate("orderId", "orderId")
                .lean(),
            LedgerEntry.countDocuments({ actorId: customerId, actorType: "CUSTOMER" }),
        ]);

        const items = ledgers.map((l) => ({
            _id: l._id,
            type: l.direction === "CREDIT" ? "credit" : "debit",
            title: l.type.replace(/_/g, " "),
            amount: l.amount,
            date: l.createdAt,
            reference: l.reference || l.transactionId,
            orderId: l.orderId?.orderId,
            description: l.description,
            status: l.status.toLowerCase(),
        }));

        return handleResponse(res, 200, "Transactions fetched", {
            items,
            total,
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / perPage) || 1,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   REQUEST WITHDRAWAL (Customer)
================================ */
export const requestWithdrawal = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return handleResponse(res, 400, "Please enter a valid amount");
        }

        const availableBalance = await walletService.getCustomerBalance(customerId);
        const requestedAmount = roundCurrency(amount);

        if (requestedAmount > availableBalance) {
            return handleResponse(
                res,
                400,
                `Insufficient balance. Available: ₹${availableBalance}`,
            );
        }

        await walletService.debitWallet({
            ownerType: "CUSTOMER",
            ownerId: customerId,
            amount: requestedAmount,
            bucket: "available",
            ledgerType: "WITHDRAWAL",
            ledgerReference: `WDR-CUST-${Date.now()}`,
            ledgerDescription: "Customer withdrawal request created",
        });

        const withdrawal = await Transaction.create({
            user: customerId,
            userModel: "User",
            type: "Withdrawal",
            amount: -Math.abs(requestedAmount),
            status: "Pending",
            reference: `WDR-CUST-${Date.now()}`,
        });

        return handleResponse(
            res,
            201,
            "Withdrawal request submitted successfully",
            withdrawal,
        );
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
