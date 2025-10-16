const express = require('express');
const router = express.Router();
// 💡 เพิ่มการเรียกใช้ path และ fs สำหรับจัดการไฟล์และลบไฟล์หากมีข้อผิดพลาด
const path = require('path');
const fs = require('fs');

const { ensureAdmin } = require('../middleware/auth'); // ใช้ Middleware ป้องกัน
// 💡 นำเข้า Multer Middleware ที่เราสร้างไว้
const upload = require('../middleware/upload');
const Equipment = require('../model/equipment');
const Category = require('../model/category');


// Route สำหรับหน้า Admin Dashboard
router.get('/dashboard', ensureAdmin, (req, res) => {
    // เรนเดอร์ไฟล์ admin_dashboard.ejs ในโฟลเดอร์ views/admin
    res.render('admin/admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user,
        layout: 'layouts/navbar_admin',
        activePage: 'dashboard'
    });
});

// Route แสดงรายการอุปกรณ์
router.get('/equipment', ensureAdmin, async (req, res) => {
    try {
        // 1. ดึงข้อมูลอุปกรณ์ทั้งหมด
        const equipments = await Equipment.find({ deleted_at: null }) // ดึงเฉพาะอุปกรณ์ที่ยังไม่ถูกลบ
            .populate('category_id')
            .sort({ name: 1 });

        // 2. ดึงข้อมูลประเภทอุปกรณ์ทั้งหมดสำหรับใช้ใน Dropdown Filter
        const categories = await Category.find().sort({ name: 1 });

        // 3. แสดงผลหน้าอุปกรณ์ โดยใช้ list_equipment.ejs
        res.render('admin/list_equipment', {
            title: 'รายการอุปกรณ์',
            activePage: 'equipment_list',
            equipments: equipments,
            categories: categories,
            layout: 'layouts/navbar_admin',
            user: req.session.user,
        });

    } catch (err) {
        console.error("Error loading equipment list page:", err);
        res.redirect('/admin/dashboard');
    }
});

// Route แสดงหน้าฟอร์มเพิ่มอุปกรณ์ใหม่
router.get('/equipment/add', ensureAdmin, async (req, res) => {
    try {
        // 1. ดึงข้อมูลประเภทอุปกรณ์ทั้งหมด
        const categories = await Category.find().sort({ name: 1 });

        // 2. แสดงผลหน้าเพิ่มอุปกรณ์
        res.render('admin/add_equipment', {
            title: 'เพิ่มอุปกรณ์ใหม่',
            activePage: 'add_equipment',
            categories: categories,
            user: req.session.user,
            layout: 'layouts/navbar_admin',
            formData: {}, // ข้อมูลฟอร์มเปล่า
            error: null // ไม่มีข้อความผิดพลาดเริ่มต้น
        });

    } catch (err) {
        console.error("Error loading categories for Add Equipment page:", err);
        res.redirect('/admin/dashboard');
    }
});

/**
 * [POST] /admin/equipment/add
 * จัดการการบันทึกข้อมูลอุปกรณ์ใหม่ลงในฐานข้อมูล พร้อมการอัปโหลดไฟล์
 */
router.post(
    '/equipment/add',
    ensureAdmin,
    upload.single('image'),
    async (req, res) => {
        const { name, category_id, description, status } = req.body;

        let imagePath = '/images/default_equipment.png';
        let uploadedFilePath = null;

        // 💡 ฟังก์ชันช่วยเหลือในการ Render Error
        const renderError = async (message, body) => {
            // 1. ลบไฟล์ที่อัปโหลดไปแล้วทิ้ง หากมี
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                fs.unlinkSync(uploadedFilePath);
                console.log(`[Cleanup] Deleted uploaded file: ${uploadedFilePath}`);
            }
            // 2. ดึง Categories กลับมา
            const categories = await Category.find().sort({ name: 1 });
            // 3. Render หน้าฟอร์มพร้อม Error
            res.render('admin/add_equipment', {
                title: 'เพิ่มอุปกรณ์ใหม่',
                activePage: 'add_equipment',
                categories: categories,
                formData: body,
                error: message
            });
        };


        try {
            // 1. ตรวจสอบการอัปโหลดไฟล์
            if (req.file) {
                imagePath = `/uploads/equipment/${req.file.filename}`;
                uploadedFilePath = req.file.path;
            } else {
                // ถ้าฟอร์มนี้ต้องการรูปภาพ (อิงจาก Error ในครั้งก่อนหน้า)
                if (req.body.image === 'required' || !name || !category_id || !status) { // ถ้าต้องการรูปภาพเป็น Mandatory
                    return renderError('กรุณาเลือกไฟล์รูปภาพ (.jpg, .png) เพื่ออัปโหลด (เป็นไฟล์ที่จำเป็น)', req.body);
                }
            }


            // 2. ตรวจสอบความถูกต้องของข้อมูล (Validation เบื้องต้น)
            if (!name || !category_id || !status) {
                return renderError('กรุณากรอกข้อมูล ชื่อ ประเภท และสถานะอุปกรณ์ให้ครบถ้วน', req.body);
            }

            // 3. สร้าง Equipment Instance ใหม่
            const newEquipment = new Equipment({
                name: name,
                category_id: category_id,
                description: description || '',
                status: status,
                image: imagePath
            });

            // 4. บันทึกข้อมูล
            await newEquipment.save();

            // 5. Redirect เมื่อสำเร็จ
            res.redirect('/admin/equipment?success=added');

        } catch (err) {
            console.error("Error saving new equipment:", err);

            let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกอุปกรณ์';

            // 💡 Mongoose Cast/Validation Error
            if (err.name === 'ValidationError' || err.name === 'CastError') {
                if (err.errors && err.errors.category_id && err.errors.category_id.kind === 'ObjectId') {
                    // 💡 จัดการโดยเฉพาะสำหรับ Cast Error ของ ObjectId
                    errorMessage = 'รหัสประเภทอุปกรณ์ (Category ID) ที่เลือกไม่ถูกต้องหรือไม่พบในระบบ กรุณาลองเลือกใหม่อีกครั้ง';
                } else if (err.name === 'ValidationError') {
                    errorMessage = Object.values(err.errors).map(val => val.message).join(', ');
                } else if (err.kind === 'ObjectId') {
                    errorMessage = `ข้อมูลที่ใส่ในฟิลด์ ${err.path} ไม่ถูกต้อง`;
                }
            } else if (err.message && err.message.includes('file size limit')) {
                errorMessage = 'ขนาดไฟล์รูปภาพใหญ่เกินไป (สูงสุด 5MB)';
            }

            // 6. Render Error ด้วยฟังก์ชันช่วยเหลือ
            renderError(errorMessage, req.body);
        }
    }
);


module.exports = router;
