const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for rooms
const rooms = {};

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                ws.roomCode = data.roomCode;
                ws.user = data.user;
                ws.isAdmin = data.isAdmin;
            } else if (data.type === 'poll') {
                const room = rooms[data.roomCode];
                if (room) {
                    room.currentQuestion = data.question;
                    room.questions.push(data.question);
                    room.timer = data.question.timer;
                    broadcast(data.roomCode, { type: 'poll', question: room.currentQuestion });
                    startTimer(data.roomCode, room.timer);
                }
            } else if (data.type === 'answer') {
                const room = rooms[data.roomCode];
                if (room && room.currentQuestion) {
                    room.currentQuestion.responses[data.user] = data.answer;
                    room.students[data.user].answers[room.questions.length - 1] = data.answer;
                    broadcast(data.roomCode, { type: 'update', room });
                }
            }
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });

    ws.on('close', () => {
        if (ws.roomCode && ws.user && !ws.isAdmin) {
            const room = rooms[ws.roomCode];
            if (room) {
                delete room.students[ws.user];
                broadcast(ws.roomCode, { type: 'update', room });
            }
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

// Broadcast to all clients in a room
function broadcast(roomCode, message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.roomCode === roomCode) {
            client.send(JSON.stringify(message));
        }
    });
}

// Timer handling
function startTimer(roomCode, seconds) {
    const room = rooms[roomCode];
    if (!room) return;
    room.timer = seconds;
    const interval = setInterval(() => {
        room.timer--;
        broadcast(roomCode, { type: 'timer', timer: room.timer });
        if (room.timer <= 0) {
            clearInterval(interval);
            room.currentQuestion = null;
            broadcast(roomCode, { type: 'poll', question: null });
        }
    }, 1000);
}

// API routes
app.post('/create-room', (req, res) => {
    const { adminName } = req.body;
    if (!adminName) return res.status(400).json({ error: 'Admin name required' });
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
        code: roomCode,
        admin: adminName,
        questions: [],
        students: {},
        currentQuestion: null,
        timer: 0
    };
    res.json({ roomCode });
});

app.post('/join-room', (req, res) => {
    const { roomCode, studentName } = req.body;
    if (!roomCode || !studentName) return res.status(400).json({ error: 'Room code and name required' });
    const room = rooms[roomCode];
    if (!room) return res.status(404).json({ error: 'Invalid room code' });
    if (room.students[studentName]) return res.status(400).json({ error: 'Student name already taken' });
    room.students[studentName] = { answers: {} };
    broadcast(roomCode, { type: 'update', room });
    res.json({ success: true });
});

app.post('/end-room', (req, res) => {
    const { roomCode } = req.body;
    if (rooms[roomCode]) {
        delete rooms[roomCode];
        broadcast(roomCode, { type: 'end' });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

app.get('/room/:roomCode', (req, res) => {
    const room = rooms[req.params.roomCode];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for rooms
const rooms = {};

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                ws.roomCode = data.roomCode;
                ws.user = data.user;
                ws.isAdmin = data.isAdmin;
            } else if (data.type === 'poll') {
                const room = rooms[data.roomCode];
                if (room) {
                    room.currentQuestion = data.question;
                    room.questions.push(data.question);
                    room.timer = data.question.timer;
                    broadcast(data.roomCode, { type: 'poll', question: room.currentQuestion });
                    startTimer(data.roomCode, room.timer);
                }
            } else if (data.type === 'answer') {
                const room = rooms[data.roomCode];
                if (room && room.currentQuestion) {
                    room.currentQuestion.responses[data.user] = data.answer;
                    room.students[data.user].answers[room.questions.length - 1] = data.answer;
                    broadcast(data.roomCode, { type: 'update', room });
                }
            }
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });

    ws.on('close', () => {
        if (ws.roomCode && ws.user && !ws.isAdmin) {
            const room = rooms[ws.roomCode];
            if (room) {
                delete room.students[ws.user];
                broadcast(ws.roomCode, { type: 'update', room });
            }
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

// Broadcast to all clients in a room
function broadcast(roomCode, message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.roomCode === roomCode) {
            client.send(JSON.stringify(message));
        }
    });
}

// Timer handling
function startTimer(roomCode, seconds) {
    const room = rooms[roomCode];
    if (!room) return;
    room.timer = seconds;
    const interval = setInterval(() => {
        room.timer--;
        broadcast(roomCode, { type: 'timer', timer: room.timer });
        if (room.timer <= 0) {
            clearInterval(interval);
            room.currentQuestion = null;
            broadcast(roomCode, { type: 'poll', question: null });
        }
    }, 1000);
}

// API routes
app.post('/create-room', (req, res) => {
    const { adminName } = req.body;
    if (!adminName) return res.status(400).json({ error: 'Admin name required' });
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
        code: roomCode,
        admin: adminName,
        questions: [],
        students: {},
        currentQuestion: null,
        timer: 0
    };
    res.json({ roomCode });
});

app.post('/join-room', (req, res) => {
    const { roomCode, studentName } = req.body;
    if (!roomCode || !studentName) return res.status(400).json({ error: 'Room code and name required' });
    const room = rooms[roomCode];
    if (!room) return res.status(404).json({ error: 'Invalid room code' });
    if (room.students[studentName]) return res.status(400).json({ error: 'Student name already taken' });
    room.students[studentName] = { answers: {} };
    broadcast(roomCode, { type: 'update', room });
    res.json({ success: true });
});

app.post('/end-room', (req, res) => {
    const { roomCode } = req.body;
    if (rooms[roomCode]) {
        delete rooms[roomCode];
        broadcast(roomCode, { type: 'end' });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

app.get('/room/:roomCode', (req, res) => {
    const room = rooms[req.params.roomCode];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Timer handlingServer running on port ${PORT}`));
