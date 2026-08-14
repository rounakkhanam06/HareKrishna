const fs = require('fs');
const file = 'D:/Appzeto/HareKrishna/frontend/src/modules/customer/components/shared/ProductDetailSheet.jsx';
let content = fs.readFileSync(file, 'utf8');

// Mobile Title
content = content.replace(
    'className="text-xl font-black text-[#1A1A1A] leading-tight mb-2"',
    'className="text-[18px] font-bold text-[#1A1A1A] leading-tight mb-2"'
);

// Desktop Title
content = content.replace(
    'className="text-[19px] lg:text-[22px] font-black text-[#111827] leading-[1.2] tracking-tight mb-1"',
    'className="text-[19px] lg:text-[22px] font-bold text-[#111827] leading-[1.2] tracking-tight mb-1"'
);

// Mobile Variants
content = content.replace(
    '"flex-shrink-0 px-5 py-2.5 font-bold rounded-xl text-sm transition-all relative border-2"',
    '"flex-shrink-0 px-3 py-1.5 font-semibold rounded-lg text-[11px] transition-all relative border-2"'
);

// Desktop Variants
content = content.replace(
    "'px-4 py-2 font-black rounded-xl text-xs transition-all border-2'",
    "'px-3 py-1.5 font-semibold rounded-lg text-[11px] transition-all border-2'"
);

fs.writeFileSync(file, content);
console.log('Update applied');
