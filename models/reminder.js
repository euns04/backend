const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    isSent: {
        type:Boolean,
        require: false
    }
})

module.exports = mongoose.model('Reminder', reminderSchema);