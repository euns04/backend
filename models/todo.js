const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    deletable: { type: Boolean, default: true },
    isDone: { type: Boolean, default: false }
})

module.exports = mongoose.model('Todo', todoSchema);