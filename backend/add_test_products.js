import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to DB");
        
        const Seller = (await import('./app/models/seller.js')).default;
        const Category = (await import('./app/models/category.js')).default;
        const Product = (await import('./app/models/product.js')).default;

        const seller = await Seller.findOne();
        if (!seller) {
            console.log("No seller found in the database. Please create a seller first.");
            process.exit(1);
        }
        console.log("Found seller:", seller.storeName || seller._id);

        const targetCatId = '699b4d9bbdd7f3ef4dbd7cf8';
        const category = await Category.findById(targetCatId);
        
        if (!category) {
            console.log("Category with ID", targetCatId, "not found.");
            process.exit(1);
        }
        
        console.log("Found category:", category.name, "Type:", category.type);
        
        let headerId, categoryId, subcategoryId;
        
        if (category.type === 'header') {
            headerId = category._id;
            // find a category and subcategory under this header
            const cat = await Category.findOne({ type: 'category', parentId: headerId });
            categoryId = cat ? cat._id : category._id;
            const sub = await Category.findOne({ type: 'subcategory', parentId: categoryId });
            subcategoryId = sub ? sub._id : categoryId;
        } else if (category.type === 'category') {
            headerId = category.parentId || category._id;
            categoryId = category._id;
            const sub = await Category.findOne({ type: 'subcategory', parentId: categoryId });
            subcategoryId = sub ? sub._id : categoryId;
        } else {
            subcategoryId = category._id;
            categoryId = category.parentId || category._id;
            const parentCat = await Category.findById(categoryId);
            headerId = parentCat ? (parentCat.parentId || parentCat._id) : categoryId;
        }

        const productsToAdd = [
            {
                name: "Test Product 1 for " + category.name,
                slug: "test-product-1-" + Date.now(),
                sku: "SKU-" + Date.now() + "-1",
                description: "This is a test product generated via script.",
                price: 100,
                salePrice: 80,
                stock: 50,
                headerId,
                categoryId,
                subcategoryId,
                sellerId: seller._id,
                status: "active",
                approvalStatus: "approved",
                mainImage: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400"
            },
            {
                name: "Test Product 2 for " + category.name,
                slug: "test-product-2-" + Date.now(),
                sku: "SKU-" + Date.now() + "-2",
                description: "This is another test product generated via script.",
                price: 200,
                salePrice: 150,
                stock: 20,
                headerId,
                categoryId,
                subcategoryId,
                sellerId: seller._id,
                status: "active",
                approvalStatus: "approved",
                mainImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=400"
            }
        ];

        const inserted = await Product.insertMany(productsToAdd);
        console.log("Successfully added", inserted.length, "products.");
        console.log("IDs:", inserted.map(i => i._id));
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();
