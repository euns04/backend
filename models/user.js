const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    loginId: {
        type: String,
        required: [true, 'error'],
        unique: true
    },
    username: {
        type: String,
        required: [true, 'error']
    },
    password: {
        type: String, 
        required: [true, 'error']
    },
    role: {
        type: String,
        enum: ['mentor', 'mentee'],
        required: true
    },
    // user가 멘티일 때 mentor의 id
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {timestamps: true})

module.exports = mongoose.model('User', userSchema);