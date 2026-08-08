require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const Category = require('./app/models/category.js').default;
        // Let's just try to do what findByIdAndUpdate does when updating a category
        const id = '699b5329683721d007fc4f19';
        const categoryData = {
            name: "Pet Grooming",
            slug: "pet-grooming",
            status: "active",
            type: "category",
            parentId: "699b52cded37c95c0e15b31d"
        };
        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { $set: categoryData },
            { new: true, runValidators: true }
        );
        console.log("Success:", updatedCategory);
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}).catch(console.error);
