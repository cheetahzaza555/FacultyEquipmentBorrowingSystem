const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({

    
    name: { 
        type: String, 
        required: true,
        maxlength: 100,
        trim: true,
        unique: true 
    }
}, { 

    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Category', categorySchema);
