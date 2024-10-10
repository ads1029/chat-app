let socket;
let connections = {};
let currentRoom = '';
let username = '';

function setUsername() {
    const usernameInput = document.getElementById('username-input');
    username = usernameInput.value.trim();
    if (username) {
        document.getElementById('user-setup').style.display = 'none';
        document.getElementById('room-selection').style.display = 'block';
        initializeSocket();
    } else {
        alert('请输入有效的用户名');
    }
}

function initializeSocket() {
    socket = io();

    socket.on('user-joined', (joinedUsername) => {
        displayMessage(`${joinedUsername} 加入了房间`, false);
    });

    socket.on('room-users', (users) => {
        users.forEach(userId => {
            if (userId !== socket.id && !connections[userId]) {
                createPeerConnection(userId);
            }
        });
    });

    socket.on('offer', async (data) => {
        const pc = createPeerConnection(data.sender);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: data.sender, sdp: answer });
    });

    socket.on('answer', async (data) => {
        const pc = connections[data.sender];
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });

    socket.on('ice-candidate', async (data) => {
        const pc = connections[data.sender];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });
}

function selectRoom(room) {
    currentRoom = room;
    document.getElementById('room-selection').style.display = 'none';
    document.getElementById('chat-room').style.display = 'block';
    document.getElementById('room-title').innerText = `房间 ${room}`;

    loadChatHistory();
    socket.emit('join', { room, username });
}

function createPeerConnection(targetId) {
    const pc = new RTCPeerConnection();
    connections[targetId] = pc;

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: targetId, candidate: event.candidate });
        }
    };

    pc.ondatachannel = (event) => {
        const channel = event.channel;
        setupDataChannel(channel);
    };

    pc.createDataChannel('chat');

    pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('offer', { target: targetId, sdp: offer });
    });

    return pc;
}

function setupDataChannel(channel) {
    channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        displayMessage(`${data.username}: ${data.message}`, false);
    };
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message) {
        const data = JSON.stringify({
            username: username,
            message: message
        });

        Object.values(connections).forEach(pc => {
            const channel = pc.dataChannel || pc.createDataChannel('chat');
            channel.send(data);
        });

        displayMessage(`${username}: ${message}`, true);
        messageInput.value = '';
    }
}

function displayMessage(message, isOwnMessage) {
    console.log('Displaying message:', message, 'isOwnMessage:', isOwnMessage);
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    
    if (isOwnMessage) {
        messageElement.classList.add('own-message');
    } else {
        messageElement.classList.add('other-message');
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    saveChatHistory(message);
}

function loadChatHistory() {
    const history = localStorage.getItem(`chatHistory_${currentRoom}`);
    if (history) {
        const messages = JSON.parse(history);
        messages.forEach(message => displayMessage(message, false));
    }
}

function saveChatHistory(message) {
    let history = localStorage.getItem(`chatHistory_${currentRoom}`);
    history = history ? JSON.parse(history) : [];
    history.push(message);
    localStorage.setItem(`chatHistory_${currentRoom}`, JSON.stringify(history));
}

document.getElementById('message-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});