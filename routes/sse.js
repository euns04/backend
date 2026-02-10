const router = require('express').Router();
const {addClient, removeClient} = require('../sseHub');

router.get('/subscribe', (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).end();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addClient(String(userId), res);

    res.write(`data: ${JSON.stringify({type: 'CONNECTED'})}\n\n`);

    req.on('close', () => {
        removeClient(String(userId), res);
    })
})

module.exports = router;