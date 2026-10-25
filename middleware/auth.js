
const ensureAuthenticated = (req, res, next) => {
    // 1. ตรวจสอบว่ามีอ็อบเจกต์ 'user' ใน session หรือไม่
    if (req.session && req.session.user) { 
        return next(); // อนุญาตให้ดำเนินการต่อ
    }
    // 2. ถ้า Session ไม่สมบูรณ์ ให้ redirect ไปหน้า Login
    res.redirect('/login');
};

const ensureAdmin = (req, res, next) => {
    // ดึงข้อมูล role จากอ็อบเจกต์ user
    const userRole = req.session && req.session.user ? req.session.user.role : null;

    // 1. ตรวจสอบว่า Login แล้ว (มี user) และ Role เป็น 'admin'
    if (userRole === 'admin') { 
        return next(); // อนุญาตให้ดำเนินการต่อ
    }

    // 2. ถ้า Login แล้วแต่ไม่ใช่ admin ให้ส่งไปหน้าผู้ใช้ปกติ
    if (req.session && req.session.user) {
        // ให้ redirect ไปยัง /users/dashboard แทน /users (ตาม Route ที่คุณตั้งไว้)
        return res.redirect('/users/dashboard'); 
    }

    // 3. ถ้ายังไม่ Login ให้ส่งไปหน้า Login
    res.redirect('/login');
};

module.exports = {
    ensureAuthenticated,
    ensureAdmin
};