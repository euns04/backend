const clientsByUser = new Map();

function addClient(userId, res) {
    if(!clientsByUser.has(userId)){
        clientsByUser.set(userId, new Set());
    }
    clientsByUser.get(userId).add(res);
}

function removeClient(userId, res){
    const set = clientsByUser.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) clientsByUser.delete(userId);
}

function sendToUser(userId, payload){
    const set = clientsByUser.get(userId);
    if(!set) return;

    const data =  `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) res.write(data);
}

module.exports = {addClient, removeClient, sendToUser};