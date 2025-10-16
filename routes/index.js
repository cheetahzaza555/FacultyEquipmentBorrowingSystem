const express = require('express');
const router = express.Router();
// ❌ ลบ bcryptjs ออก เพราะ Model เป็นตัวจัดการ Hashing
const User = require('../model/users');
const Major = require('../model/major'); // 🔑 ต้องเพิ่ม Major Model เข้ามา
const { ensureAuthenticated } = require('../middleware/auth');


// ========================================
// 🏠 หน้าแรก (Public)
// ========================================
router.get('/', function (req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/users/dashboard');
    }
  }
  res.render('index', { title: 'Express' });
});

// ========================================
// 🔐 หน้า Login & Register
// ========================================

// GET /login - แสดงหน้า Login.
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 🔑 GET /register - แสดงหน้า Register พร้อมดึงข้อมูลสาขา
router.get('/register', async (req, res) => {
  try {
    // ดึงข้อมูลสาขาจาก MongoDB มาใส่ใน Dropdown
    const majors = await Major.find({});
    res.render('register', { error: null, majors: majors });
  } catch (error) {
    console.error("Error fetching majors for register page:", error);
    res.render('register', { error: 'ไม่สามารถดึงข้อมูลสาขาได้', majors: [] });
  }
});

router.post('/register', async (req, res) => {
  const { userId, firstName, lastName, email, password, confirmPassword, phone, major, role = 'user' } = req.body;
  let majors = []; // 🔑 กำหนด majors นอก try/catch เพื่อให้เข้าถึงได้เสมอ

  // 1. พยายามดึง Majors ก่อน (ใช้ในการ render หน้า error กลับ)
  try {
    // [ข้อควรระวัง]: ตรวจสอบให้แน่ใจว่า Major model ถูก import และใช้งานได้ถูกต้อง
    majors = await Major.find({});
  } catch (dbError) {
    console.error("Major Fetch Error (Pre-register):", dbError);
    // ถ้าดึงไม่ได้ ให้ majors เป็น Array ว่าง ซึ่งจะป้องกันไม่ให้ EJS error
  }

  try {
    // 2. ตรวจสอบรหัสผ่านไม่ตรงกัน (Server-Side Validation)
    if (password !== confirmPassword) {
      return res.render('register', { error: '❌ รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', majors: majors });
    }

    // 3. ตรวจสอบว่ามี userId หรือ email ซ้ำกันหรือไม่
    const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
    if (existingUser) {
      const duplicateField = existingUser.userId === userId ? 'รหัสผู้ใช้' : 'อีเมล';
      return res.render('register', { error: `❌ ${duplicateField} นี้มีอยู่ในระบบแล้ว`, majors: majors });
    }

    // 4. สร้างและบันทึก User ใหม่
    const newUser = new User({
      userId, firstName, lastName, email, password, phone, major, role
    });

    await newUser.save();

    // 🎯 [แก้ไข] Redirect เมื่อสำเร็จ: ใช้ Query Parameter เพื่อให้ SweetAlert ทำงานในหน้า Login
    res.redirect('/login?registered=true');

  } catch (error) {
    console.error("Register Error:", error);

  }
});

// ========================================
// 🚀 POST /login - เข้าสู่ระบบ (ใช้ userId/email แทน username)
// ========================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ $or: [{ userId: username }, { email: username }] });

    if (!user) {
      return res.render('login', { error: '❌ ไม่พบบัญชีผู้ใช้' });
    }

    // 1. เปรียบเทียบรหัสผ่าน: ใช้ Method comparePassword ที่อยู่ใน Model
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.render('login', { error: '❌ รหัสผ่านไม่ถูกต้อง' });
    }

    // 2. เก็บ session (เก็บ userId, ชื่อ-สกุล เพื่อนำไปแสดงผล)
    req.session.user = {
      id: user._id,
      userId: user.userId, // เก็บ userId
      username: user.firstName + ' ' + user.lastName, // เปลี่ยนไปเก็บชื่อ-นามสกุล
      role: user.role
    };

    // 3. กำหนด URL ปลายทางตาม role
    let targetUrl;
    if (user.role === 'admin') {
      targetUrl = '/admin/dashboard';
    } else {
      targetUrl = '/users/dashboard';
    }

    // 🔑 เปลี่ยนจาก res.redirect() เป็น res.render() เพื่อแสดง SweetAlert ก่อน
    return res.render('login', {
      loginSuccess: true,       // Flag ให้ EJS แสดง SweetAlert
      targetUrl: targetUrl,     // URL ที่จะ Redirect ไปหลัง Alert หายไป
      error: undefined          // ล้างข้อความ Error เดิม
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.render('login', { error: 'เกิดข้อผิดพลาดของระบบ' });
  }
});


// ========================================
// 🚪 GET /logout - ออกจากระบบ
// ========================================
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout Error:', err);
      return res.redirect('/');
    }
    res.redirect('/login');
  });
});


module.exports = router;
