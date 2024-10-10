import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onChildAdded } from 'firebase/database';

const firebaseConfig = {
  // Your Firebase configuration here
  // You can get this from your Firebase project settings
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentRoom: string | null = null;

function joinRoom() {
  const roomInput = document.getElementById('roomInput') as HTMLInputElement;
  const room = roomInput.value.trim();
  
  if (room) {
    currentRoom = room;
    const messagesDiv = document.getElementById('messages') as HTMLDivElement;
    messagesDiv.innerHTML = '';
    loadMessages(room);
  }
}

function sendMessage() {
  const messageInput = document.getElementById('messageInput') as HTMLInputElement;
  const message = messageInput.value.trim();
  
  if (message && currentRoom) {
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    push(messagesRef, {
      text: message,
      timestamp: Date.now()
    });
    messageInput.value = '';
  }
}

function loadMessages(room: string) {
  const messagesRef = ref(database, `rooms/${room}/messages`);
  onChildAdded(messagesRef, (snapshot) => {
    const message = snapshot.val();
    displayMessage(message);
  });
}

function displayMessage(message: { text: string, timestamp: number }) {
  const messagesDiv = document.getElementById('messages') as HTMLDivElement;
  const messageElement = document.createElement('div');
  messageElement.textContent = message.text;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  const joinButton = document.getElementById('joinButton');
  const sendButton = document.getElementById('sendButton');
  
  joinButton?.addEventListener('click', joinRoom);
  sendButton?.addEventListener('click', sendMessage);
});