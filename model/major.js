const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema({
    majorName: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    majorCode: { // เช่น IT, CS, AI
        type: String, 
        required: true, 
        unique: true, 
        trim: true,
        uppercase: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Major', majorSchema);
