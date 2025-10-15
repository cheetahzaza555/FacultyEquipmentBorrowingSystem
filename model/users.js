const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 💡 userSchema (โครงสร้างข้อมูลที่ปรับปรุงแล้ว)
const userSchema = new mongoose.Schema({
    // ข้อมูลผู้ใช้
    userId: { type: String, required: true, unique: true }, // รหัสผู้ใช้ (ไม่ใช่ ID ฐานข้อมูล)
    firstName: { type: String, required: true, maxlength: 100 }, // ชื่อจริง
    lastName: { type: String, required: true, maxlength: 100 }, // นามสกุล
    email: { type: String, required: true, unique: true, maxlength: 255 }, // อีเมล

    // ข้อมูล Authentication
    password: { type: String, required: true, maxlength: 100 },
    
    // ข้อมูลติดต่อและประเภท
    phone: { type: String, required: true, maxlength: 10 }, // เบอร์โทรศัพท์
    role: { type: String, enum: ['admin', 'user'], default: 'user' }, // ประเภทผู้ใช้

    // 🔗 การเชื่อมโยง: สาขาที่สังกัด
    // สมมติว่ามี Model ชื่อ 'Major' สำหรับเก็บข้อมูลสาขา
    major: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Major', // Reference ไปยัง Major Model
        required: true 
    }
}, { 
    timestamps: true // เพิ่ม createdAt และ updatedAt อัตโนมัติ
});

// 🛡️ Middleware: เข้ารหัส password ก่อนบันทึก
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 🔑 Method: ฟังก์ชันเช็ครหัสผ่าน
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);