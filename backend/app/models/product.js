import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        sku: {
            type: String,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        salePrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
        },
        lowStockAlert: {
            type: Number,
            default: 5,
        },
        brand: {
            type: String,
            trim: true,
        },
        weight: {
            type: String,
            trim: true,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        mainImage: {
            type: String, // Cloudinary URL
        },
        galleryImages: [{
            type: String, // Array of Cloudinary URLs
        }],
        headerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        subcategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
        },
        approvalRequestedAt: {
            type: Date,
            default: null,
        },
        approvalReviewedAt: {
            type: Date,
            default: null,
        },
        approvalReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
        approvalNote: {
            type: String,
            trim: true,
            default: "",
        },
        lastSubmittedByRole: {
            type: String,
            enum: ["seller", "admin"],
            default: null,
        },
        variants: [
            {
                name: String,
                price: Number,
                salePrice: Number,
                stock: Number,
                sku: String,
            }
        ],
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isReturnable: {
            type: Boolean,
            default: false,
        },
        returnWindowDays: {
            type: Number,
            default: 0,
        },
        shelfLife: {
            type: String,
            trim: true,
            default: "",
        },
        countryOfOrigin: {
            type: String,
            trim: true,
            default: "",
        },
        fssaiLicense: {
            type: String,
            trim: true,
            default: "",
        },
        averageRating: {
            type: Number,
            default: 0,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
        totalStars: {
            type: Number,
            default: 0,
        },
        ratingDistribution: {
            star1: { type: Number, default: 0 },
            star2: { type: Number, default: 0 },
            star3: { type: Number, default: 0 },
            star4: { type: Number, default: 0 },
            star5: { type: Number, default: 0 },
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
        reviewImagesCount: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

// Optimize performance for common queries on home/search pages
productSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ status: 1, createdAt: -1, _id: -1 });
productSchema.index({ approvalStatus: 1, status: 1, createdAt: -1 });
productSchema.index({ headerId: 1, status: 1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ subcategoryId: 1, status: 1 });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ sellerId: 1, approvalStatus: 1, createdAt: -1 });
productSchema.index({ sellerId: 1, createdAt: -1, _id: -1 });
productSchema.index({ name: "text", tags: "text" }); // For better search if regex is too slow

export default mongoose.model("Product", productSchema);
