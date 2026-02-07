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
    category: {
        type: String,
        default: 'uncategorized'
    },
    deletable: { type: Boolean, default: true },
    isDone: { type: Boolean, default: false }
}, {timestamps: true})

module.exports = mongoose.model('Todo', todoSchema);