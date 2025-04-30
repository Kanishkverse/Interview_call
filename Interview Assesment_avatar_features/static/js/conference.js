// conference.js - Handles video conference functionality using WebRTC

// Configuration for ICE servers (STUN/TURN)
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Global variables
let localStream = null;
let peerConnections = {};
let localVideo = document.getElementById('local-video');
let remoteVideosContainer = document.getElementById('remote-videos');
let toggleVideoBtn = document.getElementById('toggle-video');
let toggleAudioBtn = document.getElementById('toggle-audio');
let shareScreenBtn = document.getElementById('share-screen');
let endCallBtn = document.getElementById('end-call');
let messageInput = document.getElementById('message-input');
let sendMessageBtn = document.getElementById('send-message');
let chatMessages = document.getElementById('chat-messages');
let participantsList = document.getElementById('participants-list');
let isVideoEnabled = true;
let isAudioEnabled = true;
let isScreenSharing = false;
let originalStream = null;

// For a real application, you would use a production signaling server
// This is a simplified version that would need to be replaced
class SignalingChannel {
    constructor(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        this.callbacks = {};
        
        // Simulate connection to signaling server
        console.log(`Connected to signaling channel for room ${roomId} as user ${userId}`);
        
        // In a real app, this would connect to a WebSocket or other real-time service
        // For this demo, we'll simulate peer connections locally
        this.simulatePeers();
    }
    
    on(event, callback) {
        this.callbacks[event] = callback;
    }
    
    send(event, data) {
        console.log(`Sending signal: ${event}`, data);
        // In a real app, this would send to the signaling server
    }
    
    // This method simulates peer connections for demo purposes
    // In a real app, you would remove this and use actual WebSocket connections
    simulatePeers() {
        // Simulate a delayed peer joining (only in demo mode)
        if (IS_HOST) {
            setTimeout(() => {
                if (this.callbacks['user-joined']) {
                    // Simulate a new user joining
                    const simulatedPeerId = 'simulated-peer-1';
                    this.callbacks['user-joined']({
                        userId: simulatedPeerId,
                        username: 'Simulated User'
                    });
                }
            }, 3000);
        }
    }
}

// Initialize the application
async function initializeConference() {
    try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Save original stream for toggling screen share
        originalStream = localStream;
        
        // Display local video
        localVideo.srcObject = localStream;
        
        // Set up signaling
        const signalingChannel = new SignalingChannel(ROOM_ID, USER_ID);
        
        // Set up event listeners
        setupEventListeners(signalingChannel);
        
        // Set up signaling events
        setupSignalingEvents(signalingChannel);
        
        // Start emotion detection
        startEmotionDetection(localVideo);
    } catch (error) {
        console.error('Error initializing conference:', error);
        alert('Could not access camera and microphone. Please check permissions.');
    }
}

// Set up event listeners for UI controls
function setupEventListeners(signalingChannel) {
    // Toggle video
    toggleVideoBtn.addEventListener('click', () => {
        isVideoEnabled = !isVideoEnabled;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled;
        });
        toggleVideoBtn.innerHTML = `<span class="icon">${isVideoEnabled ? '📹' : '❌'}</span>`;
    });
    
    // Toggle audio
    toggleAudioBtn.addEventListener('click', () => {
        isAudioEnabled = !isAudioEnabled;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = isAudioEnabled;
        });
        toggleAudioBtn.innerHTML = `<span class="icon">${isAudioEnabled ? '🎤' : '🔇'}</span>`;
    });
    
    // Share screen
    shareScreenBtn.addEventListener('click', async () => {
        try {
            if (isScreenSharing) {
                // Switch back to camera
                localStream.getTracks().forEach(track => track.stop());
                localStream = originalStream;
                localVideo.srcObject = localStream;
                shareScreenBtn.innerHTML = `<span class="icon">📤</span>`;
                isScreenSharing = false;
                
                // Restart emotion detection since we switched video sources
                startEmotionDetection(localVideo);
            } else {
                // Switch to screen sharing
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });
                
                // Keep audio from original stream
                const audioTrack = originalStream.getAudioTracks()[0];
                screenStream.addTrack(audioTrack);
                
                // Replace local stream
                localStream.getTracks().forEach(track => {
                    if (track !== audioTrack) {
                        track.stop();
                    }
                });
                
                localStream = screenStream;
                localVideo.srcObject = localStream;
                shareScreenBtn.innerHTML = `<span class="icon">📷</span>`;
                isScreenSharing = true;
                
                // Pause emotion detection while screen sharing
                pauseEmotionDetection();
                
                // Handle the case when user stops screen sharing via browser UI
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    if (isScreenSharing) {
                        shareScreenBtn.click(); // Simulate click to revert to camera
                    }
                });
            }
            
            // Update all peer connections with the new stream
            for (const peerId in peerConnections) {
                const sender = peerConnections[peerId]
                    .getSenders()
                    .find(s => s.track.kind === 'video');
                    
                if (sender) {
                    sender.replaceTrack(localStream.getVideoTracks()[0]);
                }
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    });
    
    // End call
    endCallBtn.addEventListener('click', async () => {
        try {
            // Stop all tracks
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            // Close all peer connections
            for (const peerId in peerConnections) {
                peerConnections[peerId].close();
            }
            
            // Stop emotion detection
            stopEmotionDetection();
            
            // Send final emotion data to server
            const response = await fetch('/end_call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    room_id: ROOM_ID,
                    user_id: USER_ID
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Redirect to the report page
                window.location.href = data.report_url;
            }
        } catch (error) {
            console.error('Error ending call:', error);
        }
    });
    
    // Send chat message
    sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            addMessageToChat('You', message);
            
            // In a real app, send this via signaling channel
            signalingChannel.send('chat-message', {
                sender: USER_ID,
                message: message
            });
            
            messageInput.value = '';
        }
    });
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageBtn.click();
        }
    });
}

// Set up signaling events
function setupSignalingEvents(signalingChannel) {
    // A new user has joined the room
    signalingChannel.on('user-joined', async (data) => {
        const { userId, username } = data;
        console.log(`User joined: ${username} (${userId})`);
        
        // Add user to participants list
        addParticipant(username);
        
        // Create a new peer connection
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnections[userId] = peerConnection;
        
        // Add local tracks to the peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.send('ice-candidate', {
                    target: userId,
                    candidate: event.candidate
                });
            }
        };
        
        // Handle track events (receiving remote streams)
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            addRemoteVideo(userId, username, remoteStream);
        };
        
        try {
            // Create and send offer if we are the host or the joining user has a lower ID
            if (IS_HOST || USER_ID < userId) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                signalingChannel.send('offer', {
                    target: userId,
                    sdp: peerConnection.localDescription
                });
            }
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    });
    
    // Received an offer from a peer
    signalingChannel.on('offer', async (data) => {
        const { sender, sdp } = data;
        
        if (!peerConnections[sender]) {
            // Create a new peer connection if it doesn't exist
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnections[sender] = peerConnection;
            
            // Add local tracks to the peer connection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    signalingChannel.send('ice-candidate', {
                        target: sender,
                        candidate: event.candidate
                    });
                }
            };
            
            // Handle track events (receiving remote streams)
            peerConnection.ontrack = (event) => {
                const remoteStream = event.streams[0];
                // In a real app, you would get the username from your signaling
                addRemoteVideo(sender, 'Remote User', remoteStream);
            };
        }
        
        try {
            await peerConnections[sender].setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnections[sender].createAnswer();
            await peerConnections[sender].setLocalDescription(answer);
            
            signalingChannel.send('answer', {
                target: sender,
                sdp: peerConnections[sender].localDescription
            });
        } catch (error) {
            console.error('Error creating answer:', error);
        }
    });
    
    // Received an answer from a peer
    signalingChannel.on('answer', async (data) => {
        const { sender, sdp } = data;
        
        try {
            if (peerConnections[sender]) {
                await peerConnections[sender].setRemoteDescription(new RTCSessionDescription(sdp));
            }
        } catch (error) {
            console.error('Error setting remote description:', error);
        }
    });
    
    // Received an ICE candidate from a peer
    signalingChannel.on('ice-candidate', (data) => {
        const { sender, candidate } = data;
        
        try {
            if (peerConnections[sender]) {
                peerConnections[sender].addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    });
    
    // Received a chat message
    signalingChannel.on('chat-message', (data) => {
        const { sender, message } = data;
        
        // In a real app, you would get the username from your user management system
        addMessageToChat('Remote User', message);
    });
    
    // A user has left the room
    signalingChannel.on('user-left', (data) => {
        const { userId } = data;
        
        // Close and remove peer connection
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
        }
        
        // Remove remote video
        removeRemoteVideo(userId);
        
        // Remove from participants list
        removeParticipant(userId);
    });
}

// Helper function to add a remote video element
function addRemoteVideo(userId, username, stream) {
    // Check if video element already exists
    if (document.getElementById(`remote-video-${userId}`)) {
        return;
    }
    
    // Create container div
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container remote';
    videoContainer.id = `remote-container-${userId}`;
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.id = `remote-video-${userId}`;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.srcObject = stream;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = username;
    
    overlay.appendChild(nameSpan);
    
    // Add to container
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(overlay);
    
    // Add to remote videos
    remoteVideosContainer.appendChild(videoContainer);
}

// Helper function to remove a remote video element
function removeRemoteVideo(userId) {
    const container = document.getElementById(`remote-container-${userId}`);
    if (container) {
        container.remove();
    }
}

// Helper function to add a participant to the list
function addParticipant(username) {
    const listItem = document.createElement('li');
    listItem.textContent = username;
    participantsList.appendChild(listItem);
}

// Helper function to remove a participant from the list
function removeParticipant(userId) {
    // In a real app, you would have a data structure mapping user IDs to DOM elements
    // For this demo, we'll just update the entire list
    const participantsArray = Array.from(participantsList.children);
    if (participantsArray.length > 1) {
        participantsList.removeChild(participantsList.lastChild);
    }
}

// Helper function to add a chat message
function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const senderElement = document.createElement('strong');
    senderElement.textContent = sender + ': ';
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(document.createTextNode(message));
    
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initializeConference);