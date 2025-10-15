const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth'); 

// Route สำหรับหน้า User Dashboard
// ensureAuthenticated จะตรวจสอบว่าผู้ใช้ต้อง Login แล้วเท่านั้น
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    // เรนเดอร์ไฟล์ user_dashboard.ejs ในโฟลเดอร์ views/user
    res.render('users/user_dashboard', {
        title: 'Users Dashboard',
        user: req.session.user
    });
});

// *** คุณสามารถเพิ่ม Route อื่นๆ ของ User ในไฟล์นี้ได้ ***

module.exports = router;