const User = require('../models/user');
const Todo = require('../models/todo');
const Reminder = require('../models/reminder');
const DailyComment = require('../models/dailyComment');
const StudyTime = require('../models/studyTime');
const mongoose = require('mongoose');

exports.getDashboard = async(req, res) => {
    const userId = req.session?.userId;

    try{
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }

        const me = await User.findById(userId)
            .select('username role mentorId')
            .populate('mentorId', 'username');

        if(!me){
        return res.status(404).json({ok: false, error: '유저 없음'});
        }

        // 현재 로그인 유저의 dailyComment 조회 (날짜키 -> content)
        const comments = await DailyComment.find({ userId })
            .select('date content')
            .sort({ date: 1, _id: 1 })
            .lean();

        const dailyCommentsByDate = (comments || []).reduce((acc, c) => {
            if (!c?.date) return acc;
            acc[c.date] = c?.content ?? '';
            return acc;
        }, {});

        // 현재 로그인 유저의 todo 조회
        let todos = await Todo.find({ userId })
            .select('title date category deletable isDone')
            .sort({ date: 1, _id: 1 })
            .lean();

        const studyDocs = await StudyTime.find({userId})
            .select('date minutesBySubject')
            .sort({date:1, _id:1})
            .lean();
        
        const studyByDate = (studyDocs || []).reduce((acc, d) => {
            if (!d?.date) return acc;

            const m = d.minutesBySubject || {};
            const obj = (m instanceof Map) ? Object.fromEntries(m.entries()) : m;

            const cleaned = {};
            for (const [sub, val] of Object.entries(obj)){
                const v = Number(val);
                cleaned[sub] = Number.isFinite(v) && v >= 0 ? v : 0;
            }

            acc[d.date] = cleaned;
            return acc;
        }, {});

        // 개발 중에만: 과거 버그로 userId 없이 저장된 todo를 현재 유저에 귀속시켜 복구
        if (process.env.NODE_ENV !== 'production' && mongoose.isValidObjectId(userId)) {
            const orphanQuery = {
                $or: [
                    { userId: { $exists: false } },
                    { userId: null }
                ]
            };

            const orphanTodos = await Todo.find(orphanQuery)
                .select('title date category deletable isDone')
                .sort({ date: 1, _id: 1 })
                .lean();

            if (orphanTodos.length > 0) {
                await Todo.updateMany(orphanQuery, { $set: { userId } });
                todos = [...(todos || []), ...orphanTodos];
            }
        }

        return res.json({
            ok: true,
            data: {
                me: {
                    username: me.username,
                    role: me.role
                },
                mentor: me.mentorId
                    ?{
                        id: me.mentorId._id,
                        username: me.mentorId.username
                    }
                    : null,
                todos: (todos || []).map((t) => ({
                    id: String(t._id),
                    title: t.title,
                    date: t.date,
                    category: t.category,
                    deletable: t.deletable,
                    isDone: t.isDone
                })),
                studyTime: studyByDate,
                weekSummary: [],
                dailyCommentsByDate
            }
        });
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.saveDailyComment = async(req, res) => {
    const userId = req.session?.userId;
    const { date, content } = req.body;

    if (!date){
        return res.status(400).json({ok: false, error: 'date 필수'});
    }
    if (content === undefined){
        return res.status(400).json({ok: false, error: 'content 필수'});
    }

    if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        const comment = await DailyComment.findOneAndUpdate(
            { userId, date },
            { $set: { content: String(content ?? '') } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();

        return res.json({
            ok: true,
            data: comment
        });
    } catch (err) {
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
 }

exports.addTodo = async(req, res) => {
    const userId = req.session?.userId;
    const { title, date, category } = req.body;

    console.log('[addtodo] body:', req.body);

    if (!title || !date ){
        return res.status(400).json({ok: false, error: 'date/text 필수'});
    }
    
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }

        const todo = await Todo.create({
            userId,
            title,
            date,
            category: category ?? 'uncategorized'
        })

        return res.json({
            ok: true,
            data: {
                id: todo._id,
                title: todo.title,
                date: todo.date,
                category: todo.category,
                deletable: todo.deletable,
                isDone: todo.isDone
            }
        })
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.deleteTodo = async(req, res) => {
    const userId = req.session?.userId;
    const { id } = req.params;

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }

        if (!mongoose.isValidObjectId(id)){
            return res.status(400).json({ok: false, error: 'todo id 에러'});
        }

        const todo = await Todo.findOne({_id: id, userId});
    
        if(!todo){
            return res.status(404).json({ok: false, error: '존재하지 않는 todo'});
        }

        if(!todo.deletable){
            return res.status(403).json({ ok: false, error: '멘티는 삭제 불가' });
        }

        await Todo.deleteOne({_id: id, userId});

        return res.json({
            ok: true,
            data: { id: String(todo._id) }
        })
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.saveStudyTime = async(req, res) => {
    const userId = req.session?.userId;
    const { date, minutesBySubject } = req.body;

    if (!date){
        return res.status(400).json({ok: false, error: 'date 필수'});
    }

    if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }

    if (!minutesBySubject || typeof minutesBySubject !== 'object'){
        return res.status(400).json({ok: false, error: 'minutesBySubject 필수'});
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        const cleaned = {};
        for (const [subject, value] of Object.entries(minutesBySubject)){
            const v = Number(value);
            cleaned[subject] = Number.isFinite(v) && v >= 0 ? v:0;
        }

        const studyTime = await StudyTime.findOneAndUpdate(
            { userId, date },
            { $set: { minutesBySubject: cleaned } },
            { upsert: true, new: true }
        ).lean();

        return res.json({
            ok: true,
            data: studyTime
        });
    } catch (err) {
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.addReminder = async(req, res) => {
    const userId = req.session?.userId;
    const { title, date, time } = req.body;

    if (!title || !time){
        return res.status(400).json({ok: false, error: 'title/time 필수'});
    }

    if (!userId) {
            return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
        }
    
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
        }

        const reminder = await Reminder.create({
            userId,
            title,
            date,
            time
        })

        return res.json({
            ok: true,
            data: {
                id: reminder._id,
                date: reminder.date,
                title: reminder.title,
                time: reminder.time
            }
        })
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}