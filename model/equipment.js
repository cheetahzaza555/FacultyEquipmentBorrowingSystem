const mongoose = require('mongoose');

// Schema สำหรับอุปกรณ์ (Equipment)
const equipmentSchema = new mongoose.Schema({
    // equipment_id (PK) - Mongoose ใช้ _id โดยอัตโนมัติเป็น Primary Key
    
    name: { 
        type: String, 
        required: true, 
        maxlength: 100,
        trim: true
    },
    
    // Foreign Key: เชื่อมโยงไปยัง Category Model
    category_id: { 
        type: mongoose.Schema.Types.ObjectId, // ใช้ ObjectId สำหรับ Foreign Key
        required: true,
        ref: 'Category' // อ้างอิงถึง Category Model
    },
    
    description: { 
        type: String, 
        maxlength: 255,
        default: ''
    },
    
    status: { // สถานะอุปกรณ์: available, unavailable, broken
        type: String, 
        required: true,
        enum: ['available', 'unavailable', 'broken'],
        default: 'available'
    },
    
    image: { // URL หรือ Path รูปภาพ
        type: String, 
        maxlength: 255,
        default: '/images/default_equipment.png' 
    }
}, { 
    // ใช้ timestamps สำหรับ created_at (วันเวลาที่สร้าง) และ updated_at (วันเวลาที่แก้ไข)
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// เพิ่ม field สำหรับ soft delete (วันเวลาที่ลบ)
equipmentSchema.add({
    deleted_at: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Equipment', equipmentSchema);
