const fs = require('fs');
const file = 'D:/Appzeto/HareKrishna/frontend/src/modules/admin/pages/ProductManagement.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace disabled occurrences
content = content.replace(/\bdisabled\s+className=/g, 'className=');
content = content.replace(/\bdisabled\s+placeholder=/g, 'placeholder=');
// there is also one disabled for text area without classname right after it? 
// Let's just remove all standalone `disabled` lines inside the modal
content = content.replace(/^\s*disabled\s*$/gm, '');

// Add Save Button to modal footer
const footerOld = `                             {/* Modal Footer */}
                             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                 <button
                                     onClick={() => setIsProductModalOpen(false)}`;

const footerNew = `                             {/* Modal Footer */}
                             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                 <button
                                     onClick={handleSave}
                                     disabled={isSaving}
                                     className="px-8 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                                 >
                                     {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                                 </button>
                                 <button
                                     onClick={() => setIsProductModalOpen(false)}`;

content = content.replace(footerOld, footerNew);


// Image uploads
const mediaSectionOld = `                                                        {formData.mainImage ? (
                                                            <img src={applyCloudinaryTransform(formData.mainImage, "f_auto,q_auto,w_400")} alt="Main Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <HiOutlinePhoto className="h-10 w-10 text-slate-200" />
                                                                <p className="text-[10px] text-slate-400 font-bold mt-2">NO COVER PHOTO</p>
                                                            </div>
                                                        )}`;

const mediaSectionNew = `                                                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, 'main')} />
                                                        {formData.mainImage ? (
                                                            <img src={applyCloudinaryTransform(formData.mainImage, "f_auto,q_auto,w_400")} alt="Main Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <HiOutlinePhoto className="h-10 w-10 text-slate-200" />
                                                                <p className="text-[10px] text-slate-400 font-bold mt-2">CLICK TO UPLOAD</p>
                                                            </div>
                                                        )}`;

content = content.replace(mediaSectionOld, mediaSectionNew);

const gallerySectionOld = `                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gallery Photos</label>
                                                </div>`;

const gallerySectionNew = `                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gallery Photos</label>
                                                    <div className="relative">
                                                        <input type="file" multiple accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, 'gallery')} />
                                                        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
                                                            + ADD PHOTOS
                                                        </button>
                                                    </div>
                                                </div>`;
content = content.replace(gallerySectionOld, gallerySectionNew);

// Image deletion (Add trash icon for gallery photos)
const imgFind = `<img src={applyCloudinaryTransform(image, "f_auto,q_auto,w_300")} alt={\`Gallery \${index + 1}\`} className="h-full w-full object-cover" />`;
const imgReplace = `<img src={applyCloudinaryTransform(image, "f_auto,q_auto,w_300")} alt={\`Gallery \${index + 1}\`} className="h-full w-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newGallery = formData.galleryImages.filter((_, i) => i !== index);
                                                                        setFormData({ ...formData, galleryImages: newGallery });
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1.5 bg-white text-rose-500 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-md z-20"
                                                                >
                                                                    <HiOutlineTrash className="w-4 h-4" />
                                                                </button>`;
content = content.replace(imgFind, imgReplace);

fs.writeFileSync(file, content);
console.log('Update applied.');
