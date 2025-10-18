const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { ensureAdmin } = require('../middleware/auth'); // ใช้ Middleware ป้องกัน
// 💡 นำเข้า Multer Middleware ที่เราสร้างไว้
const upload = require('../middleware/upload');
const Equipment = require('../model/equipment');
const Category = require('../model/category');
const User = require('../model/users');
const Major = require('../model/major');


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
            formData: {},
            error: null
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

// ===================================================================
// GET /admin/users - แสดงหน้ารายชื่อผู้ใช้งานทั้งหมด
// ===================================================================
router.get('/users', ensureAdmin, async (req, res) => {
    try {
        // ดึงข้อมูลผู้ใช้งานทั้งหมด และ populate สาขา (Major)
        const users = await User.find()
            .select('-password') // ไม่ดึงรหัสผ่านมา
            .populate('major', 'majorName'); // ดึงเฉพาะ majorName จาก Major Model

        // Render หน้า EJS
        res.render('admin/list_users', {
            pageTitle: 'จัดการผู้ใช้งาน',
            users: users,
            activePage: 'users',
            layout: 'layouts/navbar_admin',
            user: req.session.user,
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error: Cannot fetch user list.');
    }
});


// ===================================================================
// DELETE /admin/users/delete/:id - ลบผู้ใช้งาน
// ===================================================================
router.post('/users/delete/:id', ensureAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // ค้นหาและลบผู้ใช้งานตาม ID ฐานข้อมูล
        const result = await User.findByIdAndDelete(userId);

        if (!result) {
            // หากไม่พบผู้ใช้งาน
            console.warn(`Attempted to delete non-existent user ID: ${userId}`);
            // 💡 ในระบบจริง: อาจเพิ่ม Flash Message แจ้งเตือนว่าลบไม่สำเร็จ
            // req.flash('error', 'ไม่พบผู้ใช้งานที่ต้องการลบ');
            return res.redirect('/admin/users');
        }

        // ลบสำเร็จ
        // 💡 ในระบบจริง: อาจเพิ่ม Flash Message แจ้งเตือนว่าลบสำเร็จ
        // req.flash('success', `ลบผู้ใช้งาน ${result.firstName} สำเร็จแล้ว`);
        res.redirect('/admin/users');

    } catch (error) {
        console.error('Error deleting user:', error);
        // 💡 ในระบบจริง: แจ้งเตือนผู้ใช้หากเกิดข้อผิดพลาด
        // req.flash('error', 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
        res.status(500).redirect('/admin/users');
    }
});

// ===================================================================
// GET /admin/users/edit/:id - แสดงหน้าฟอร์มแก้ไขผู้ใช้งาน
// ===================================================================
router.get('/users/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // ** DEBUG 1: ตรวจสอบ ID ที่รับมา **
        console.log(`[DEBUG] Attempting to find user with ID: ${userId}`);

        // 1. ดึงข้อมูลผู้ใช้งานที่ต้องการแก้ไข
        const userToEdit = await User.findById(userId).select('-password').populate('major', 'majorName');
        // 2. ดึงข้อมูลสาขา/คณะทั้งหมดสำหรับ Dropdown
        const majors = await Major.find().sort({ majorName: 1 });

        // ** DEBUG 2: ตรวจสอบผลลัพธ์จาก Mongoose **
        if (userToEdit) {
            console.log(`[DEBUG] User found: ${userToEdit.email}`);
        } else {
            console.log(`[DEBUG] User NOT found for ID: ${userId}. Redirecting.`);
        }

        if (!userToEdit) {
            // 💡 ไม่พบผู้ใช้งาน -> Redirect
            // แนะนำให้ใช้ Flash Message แจ้งเตือนว่า "ไม่พบผู้ใช้งาน"
            return res.redirect('/admin/users');
        }

        // 3. กำหนดรายการสิทธิ์ที่อนุญาตให้เลือก
        const roles = ['user', 'admin'];

        // 4. Render หน้าฟอร์มแก้ไข
        res.render('admin/edit_user', {
            title: 'แก้ไขข้อมูลผู้ใช้งาน',
            activePage: 'users',
            layout: 'layouts/navbar_admin',
            user: req.session.user,
            userToEdit: userToEdit,
            majors: majors,
            roles: roles,
            error: null
        });

    } catch (error) {
        // ** DEBUG 3: ตรวจสอบข้อผิดพลาดของ Mongoose **
        // ข้อผิดพลาดที่พบบ่อยคือ CastError: Cast to ObjectId failed for value "..."
        console.error('Error loading user edit page or Mongoose error:', error);
        // 💡 จัดการข้อผิดพลาดและ Redirect
        res.status(500).redirect('/admin/users');
    }
});


// ===================================================================
// POST /admin/users/edit/:id - จัดการการบันทึกแก้ไขข้อมูลผู้ใช้งาน
// ===================================================================
router.post('/users/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        // ดึงข้อมูลที่ส่งมาจากฟอร์ม (Role, Major, Status และฟิลด์อื่นๆ ที่อาจแก้ไข)
        const { role, major, status } = req.body;

        const roles = ['user', 'admin'];

        // 1. ตรวจสอบความถูกต้องของสิทธิ์ (Role Validation)
        if (!role || !roles.includes(role)) {
            // 💡 ในระบบจริง: ควรใช้ Flash Message และ Render ฟอร์มพร้อม Error
            console.error('Invalid role provided or missing:', role);
            // ส่งผู้ใช้กลับไปหน้าแก้ไข
            return res.redirect(`/admin/users/edit/${userId}`);
        }

        // 2. เตรียมข้อมูลที่ต้องการอัพเดท
        const updateData = {
            role: role,
            // 💡 เพิ่มฟิลด์อื่นๆ ที่ต้องการแก้ไข เช่น major, status หากมีในฟอร์ม
            major: major || null, // สมมติว่า major คือ ObjectId หรือ null
            status: status || 'active' // สมมติว่า status มีให้เลือกในฟอร์ม
        };

        // 3. อัพเดทผู้ใช้งานในฐานข้อมูล
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true, // คืนค่า Document ที่อัพเดทแล้ว
            runValidators: true // รัน Validation ใน Schema
        });

        if (!updatedUser) {
            // 💡 ผู้ใช้งานไม่พบ
            // req.flash('error', 'ไม่พบผู้ใช้งานที่ต้องการแก้ไข');
            return res.redirect('/admin/users');
        }

        // 4. อัพเดทสำเร็จ
        // req.flash('success', `อัปเดตข้อมูลผู้ใช้งาน ${updatedUser.firstName} สำเร็จแล้ว`);
        res.redirect('/admin/users?success=user_updated');

    } catch (error) {
        console.error('Error updating user:', error);
        // 💡 จัดการข้อผิดพลาดจาก Mongoose (เช่น CastError)
        // req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้งาน');
        res.status(500).redirect(`/admin/users/edit/${req.params.id}`);
    }
});

// GET: หน้าแก้ไขอุปกรณ์
router.get('/edit/:id', async (req, res) => {
    try {
        const equipment = await Equipment.findById(req.params.id).populate('category_id');
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/edit_equipment', { equipment, categories, user: req.session.user, layout: 'layouts/navbar_admin',  activePage: 'equipment_list' });
    } catch (err) {
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
});

// POST: บันทึกการแก้ไข
router.post('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            category_id: req.body.category_id,
            description: req.body.description,
            status: req.body.status,
        };

        if (req.file) {
            updateData.image = '/uploads/' + req.file.filename;
        }

        await Equipment.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/equipment');
    } catch (err) {
        res.status(500).send('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
});


module.exports = router;
