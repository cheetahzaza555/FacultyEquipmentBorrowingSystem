const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

const upload = require('../middleware/upload');
const Equipment = require('../model/equipment');
const Category = require('../model/category');
const User = require('../model/users');
const Major = require('../model/major');
const Borrows = require('../model/borrow');

function getStatusBadge(status) {
    switch (status) {
        case 'waitingForApproval':
        case 'pending':
        case 'waiting':
            return '<span class="badge bg-warning">รออนุมัติ</span>';
        case 'borrowed':
            return '<span class="badge bg-primary">ยืมอยู่</span>';
        case 'returned':
            return '<span class="badge bg-success">คืนแล้ว</span>';
        case 'rejected':
        case 'late':
            return '<span class="badge bg-danger">' + status + '</span>';
        default:
            return '<span class="badge bg-secondary">' + status + '</span>';
    }
}

// Route สำหรับหน้า User Dashboard
// ensureAuthenticated จะตรวจสอบว่าผู้ใช้ต้อง Login แล้วเท่านั้น
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;

        // นับจำนวนคำขอของ user
        const totalPending = await Borrows.countDocuments({ user: userId, status: 'waitingForApproval' });
        const totalApproved = await Borrows.countDocuments({ user: userId, status: 'borrowed' });
        const totalRejected = await Borrows.countDocuments({ user: userId, status: 'rejected' });

        res.render('users/user_dashboard', {
            user: req.session.user,
            pending: totalPending,
            approved: totalApproved,
            rejected: totalRejected,
            layout: 'layouts/navbar_user',
            activePage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.render('users/user_dashboard', { user: req.session.user, pending: 0, approved: 0, rejected: 0 , layout: 'layouts/navbar_user', activePage: 'dashboard'});
    }
});

router.get('/equipment', ensureAuthenticated, async (req, res) => {
    try {
        // 1. ดึงข้อมูลอุปกรณ์ทั้งหมด
        const equipments = await Equipment.find({ deleted_at: null }) // ดึงเฉพาะอุปกรณ์ที่ยังไม่ถูกลบ
            .populate('category_id')
            .sort({ name: 1 });

        // 2. ดึงข้อมูลประเภทอุปกรณ์ทั้งหมดสำหรับใช้ใน Dropdown Filter
        const categories = await Category.find().sort({ name: 1 });

        res.render('users/list_equipment', {
            title: 'Equipment',
            user: req.session.user,
            layout: 'layouts/navbar_user',
            activePage: 'equipment',
            equipments: equipments,
            categories: categories
        });

    } catch (err) {
        console.error("Error loading equipment list page:", err);
        res.redirect('/users/dashboard');
    }
});

// แสดงหน้าฟอร์มยืม
router.get('/borrow/:id', async (req, res) => {
    const equipment = await Equipment.findById(req.params.id).populate('category_id');
    if (!equipment) return res.status(404).send("ไม่พบอุปกรณ์");

    res.render('users/borrow_form', {
        title: 'ยืมอุปกรณ์',
        equipment: equipment,
        user: req.session.user,
        layout: 'layouts/navbar_user',
        activePage: 'equipment'

    });
});

router.post('/borrow/:id', ensureAuthenticated, async (req, res) => {
    try {

        const borrow = new Borrows({
            user_id: req.session.user.id,
            equipment_id: req.params.id,
            return_date: req.body.return_date,
            note: req.body.note
        });

        const { id } = req.params;
        const equipment = await Equipment.findById(id);
        if (!equipment) return res.status(404).send('ไม่พบอุปกรณ์');

        equipment.status = 'unavailable';
        await equipment.save();


        await borrow.save();
        res.redirect('/users/requests');
    } catch (err) {
        console.error(err);
        res.status(500).send("เกิดข้อผิดพลาด");
    }
});

router.get('/requests', ensureAuthenticated, async (req, res) => {
    try {
        // ดึงข้อมูลการยืมของผู้ใช้คนนี้ พร้อมข้อมูลอุปกรณ์
        const borrows = await Borrows.find({ user_id: req.session.user.id }) // หรือ ._id ถ้า session เก็บ _id
            .populate('equipment_id')
            .sort({ created_at: -1 }); // ล่าสุดขึ้นก่อน

        res.render('users/requests', {
            title: 'รายการยืมของฉัน',
            user: req.session.user,
            layout: 'layouts/navbar_user',
            activePage: 'requests',
            getStatusBadge,
            borrows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

router.post('/return/:id', ensureAuthenticated, async (req, res) => {
    try {
        const borrowId = req.params.id;
        const borrow = await Borrows.findById(borrowId);
        if (!borrow) return res.status(404).send('ไม่พบรายการยืม');

        // อัพเดตสถานะการยืมเป็น 'returned'
        borrow.status = 'returned';
        await borrow.save();

        // อัพเดตสถานะอุปกรณ์เป็น 'available'
        const equipment = await Equipment.findById(borrow.equipment_id);
        if (equipment) {
            equipment.status = 'available';
            await equipment.save();
        }

        res.redirect('/users/requests');
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});


module.exports = router;