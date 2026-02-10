const User = require('../models/user');
const Todo = require('../models/todo');
const Reminder = require('../models/reminder');
const DailyComment = require('../models/dailyComment');
const StudyTime = require('../models/studyTime');
const TodoDetail = require('../models/todoDetail');
const Feedback = require('../models/feedback');
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

        // ✅ todo 상세(오답노트) 기반 "멘토 피드백" 목록 (최근 N개)
        const todoById = new Map((todos || []).map((t) => [String(t._id), t]));
        const todoIds = (todos || []).map((t) => t._id);

        let mentorTodoFeedback = [];
        if (todoIds.length > 0) {
            const details = await TodoDetail.find({
                todoId: { $in: todoIds },
                mentorFeedback: { $exists: true, $ne: '' },
            })
                .select('todoId mentorFeedback updatedAt')
                .sort({ updatedAt: -1, _id: -1 })
                .limit(50)
                .lean();

            mentorTodoFeedback = (details || []).map((d) => {
                const todo = todoById.get(String(d.todoId));
                const dateKey = todo?.date ? new Date(todo.date).toISOString().slice(0, 10) : null;
                return {
                    id: String(d._id),
                    todoId: String(d.todoId),
                    title: todo?.title ?? '(제목 없음)',
                    dateKey,
                    category: todo?.category ?? '기타',
                    deletable: todo?.deletable,
                    isDone: !!todo?.isDone,
                    mentorFeedback: d.mentorFeedback ?? '',
                    updatedAt: d.updatedAt,
                };
            }).filter((x) => x.todoId && x.mentorFeedback);
        }

        // ✅ 멘토 화면 '피드백 작성'에서 저장한 일반 피드백(Feedback 모델)
        let mentorGeneralFeedback = [];
        const mentorId = me?.mentorId?._id || me?.mentorId;
        if (mentorId && mongoose.isValidObjectId(mentorId)) {
            const list = await Feedback.find({
                menteeId: userId,
                mentorId,
            })
                .select('date title body createdAt')
                .sort({ createdAt: -1, _id: -1 })
                .limit(50)
                .lean();

            mentorGeneralFeedback = (list || []).map((f) => ({
                id: String(f._id),
                date: f.date,
                title: f.title,
                body: f.body,
                createdAt: f.createdAt,
            }));
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
                mentorTodoFeedback,
                mentorGeneralFeedback,
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
    const { title, date, category, subject, isDone } = req.body;
    const normalizedCategory = category ?? subject;

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
            category: normalizedCategory ?? 'uncategorized',
            isDone: isDone ?? false
        })

        return res.json({
            ok: true,
            data: {
                id: String(todo._id),
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

exports.updateTodo = async (req, res) => {
    const userId = req.session?.userId;
    const { id } = req.params;
    const { isDone } = req.body;

    if (!userId) {
        return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
    }

    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ ok: false, error: 'DB 연결이 되어있지 않습니다.' });
    }

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ ok: false, error: 'todo id 에러' });
    }

    if (typeof isDone !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'isDone(boolean) 필수' });
    }

    try {
        const updated = await Todo.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isDone } },
            { new: true }
        ).select('title date category deletable isDone').lean();

        if (!updated) {
            return res.status(404).json({ ok: false, error: '존재하지 않는 todo' });
        }

        return res.json({
            ok: true,
            data: {
                id: String(updated._id),
                title: updated.title,
                date: updated.date,
                category: updated.category,
                deletable: updated.deletable,
                isDone: updated.isDone
            }
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: '서버 오류' });
    }
};

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
    const { todoId, at } = req.body;

    if (!todoId || !at){
        return res.status(400).json({ok: false, error: 'todoId/at 필수'});
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
            todoId,
            at
        })

        return res.json({
            ok: true,
            data: {
                id: reminder._id,
                todoId: reminder.todoId,
                at: reminder.at
            }
        })
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}