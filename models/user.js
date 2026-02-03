const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    loginId: {
        type: String,
        required: [true, 'error']
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
    }
})

module.exports = mongoose.model('User', userSchema);