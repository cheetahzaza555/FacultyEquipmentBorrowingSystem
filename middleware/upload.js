// 1. Import necessary libraries
const multer = require('multer');
const path = require('path'); // 💡 โมดูลสำหรับจัดการเส้นทางไฟล์
const fs = require('fs'); // 💡 โมดูลสำหรับจัดการไฟล์และโฟลเดอร์

// 2. Define the destination folder and ensure it exists
const uploadDir = path.join(__dirname, '../public/uploads/equipment');

// Check if the directory exists, if not, create it
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. Configure storage
const storage = multer.diskStorage({
    // Function to set the destination path
    destination: (req, file, cb) => {
        // 'public/uploads/equipment' คือโฟลเดอร์ที่สามารถเข้าถึงได้ผ่าน URL
        cb(null, uploadDir); 
    },
    // Function to set the filename
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน: timestamp + original extension
        const ext = path.extname(file.originalname);
        const fileName = path.basename(file.originalname, ext);
        cb(null, fileName + '-' + Date.now() + ext);
    }
});

// 4. Create the upload middleware instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        // ตรวจสอบชนิดของไฟล์ (อนุญาตเฉพาะรูปภาพ)
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Export the middleware ready for use in routes
module.exports = upload;
