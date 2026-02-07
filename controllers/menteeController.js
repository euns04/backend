const User = require('../models/user');
const Todo = require('../models/todo');
const Reminder = require('../models/reminder');

exports.getDashboard = async(req, res) => {
    const userId = req.session.userId;

    try{
        const me = await User.findById(userId)
            .select('username role mentorId')
            .populate('mentorId', 'username');

        if(!me){
        return res.status(400).json({ok: false, error: '유저 없음'});
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
                todos: [],
                studyTime: {},
                weekSummary: []
            }
        });
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.addTodo = async(req, res) => {
    const userId = req.session.userId;
    const { title, date } = req.body;

    if (!title || !date){
        return res.status(400).json({ok: false, error: 'title/date 필수'});
    }
    
    try {
        const todo = await Todo.create({
            userId,
            title,
            date
        })

        return res.json({
            ok: true,
            data: {
                id: todo._id,
                title: todo.title,
                date: todo.date,
                deletable: todo.deletable,
                isDone: todo.isDone
            }
        })
    } catch (err){
        return res.status(500).json({ok: false, error: '서버 오류'});
    }
}

exports.addReminder = async(req, res) => {
    const userId = req.session.userId;
    const { title, date, time } = req.body;

    if (!title || !time){
        return res.status(400).json({ok: false, error: 'title/time 필수'});
    }
    
    try {
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