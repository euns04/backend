const mongoose = require('mongoose');

const dailyCommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    date: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        default: ''
    }
}, {timestamps: true})

dailyCommentSchema.index({userId: 1, date: 1}, {unique: true});

module.exports = mongoose.model('DailyComment', dailyCommentSchema);