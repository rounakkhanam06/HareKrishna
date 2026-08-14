const fs = require('fs');
const file = 'D:/Appzeto/HareKrishna/frontend/src/modules/customer/components/shared/ProductDetailSheet.jsx';
let content = fs.readFileSync(file, 'utf8');

// Reduce font weights globally in the file
// First replace explicit heavy weights
content = content.replace(/\bfont-black\b/g, 'font-semibold');
content = content.replace(/\bfont-\[800\]\b/g, 'font-semibold');
content = content.replace(/\bfont-extrabold\b/g, 'font-semibold');

// Then replace bold with medium
content = content.replace(/\bfont-bold\b/g, 'font-medium');
content = content.replace(/\bfont-\[700\]\b/g, 'font-medium');

// If there's any text-primary or uppercase that look too heavy with medium, they will still look cleaner.

fs.writeFileSync(file, content);
console.log('Fonts updated globally in ProductDetailSheet');
