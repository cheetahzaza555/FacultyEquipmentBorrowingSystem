const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/auth'); // ใช้ Middleware ป้องกัน

// Route สำหรับหน้า Admin Dashboard
// ensureAdmin จะตรวจสอบว่าผู้ใช้ต้องเป็น admin เท่านั้น
router.get('/dashboard', ensureAdmin, (req, res) => {
    // เรนเดอร์ไฟล์ admin_dashboard.ejs ในโฟลเดอร์ views/admin
    res.render('admin/admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user
    });
});

// Route สำหรับแสดงหน้าเพิ่มสาขา (GET)
router.get('/majors/add', ensureAdmin, (req, res) => {
    res.render('admin/add_major', { error: null });
});

// Route สำหรับรับข้อมูลสาขาใหม่ (POST)
router.post('/majors/add', ensureAdmin, async (req, res) => {
    const { majorName, majorCode } = req.body;
    try {
        const newMajor = new Major({ majorName, majorCode });
        await newMajor.save();
        // Redirect ไปหน้าจัดการสาขา หรือ dashboard
        res.redirect('/admin/dashboard'); 
    } catch (error) {
        console.error("Error adding major:", error);
        res.render('admin/add_major', { error: 'ไม่สามารถเพิ่มสาขาได้: ' + error.message });
    }
});

module.exports = router;