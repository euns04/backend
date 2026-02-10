const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    todoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Todo',
        required: true,
        index: true
    },
    at: {
        type: Date,
        required: true,
        index: true
    },
    isSent: {
        type:Boolean,
        required: false,
        default: false,
        index: true
    }
}, {timestamps: true})

reminderSchema.index({userId: 1, todoId: 1, at: 1}, {unique: true});

module.exports = mongoose.model('Reminder', reminderSchema);