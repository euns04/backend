const mongoose = require('mongoose');

const studyTimeSchema = new mongoose.Schema({
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
    minutesBySubject: {
        type: Map,
        of: Number,
        default: {}
    }
}, {timestamps: true})

studyTimeSchema.index({userId: 1, date: 1}, {unique: true});

module.exports = mongoose.model('StudyTime', studyTimeSchema);