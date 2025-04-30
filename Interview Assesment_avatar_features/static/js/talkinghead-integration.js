// talkinghead-integration.js - Handles TalkingHead avatar and Claude AI integration

import { TalkingHead } from "talkinghead";

// Global variables
let head;
let socket;
let audioContext;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isAvatarVisible = true;
let isAvatarLoaded = false;
let visualizerContext;
let visualizerAnalyser;
let visualizerDataArray;
let audioPlayer = new Audio();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    initializeUI();
    initializeSocketIO();
    await initializeTalkingHead();
    initializeAudioContext();
    initializeVisualizer();
});

// Initialize UI elements and event listeners
function initializeUI() {
    // UI elements
    const loadAvatarBtn = document.getElementById('load-avatar-btn');
    const toggleAvatarBtn = document.getElementById('toggle-avatar');
    const sendTextBtn = document.getElementById('send-text-btn');
    const recordBtn = document.getElementById('record-btn');
    const claudeInput = document.getElementById('claude-input');
    const recordingIndicator = document.getElementById('recording-indicator');
    
    // Event listeners
    if (loadAvatarBtn) {
        loadAvatarBtn.addEventListener('click', loadAvatar);
    }
    
    if (toggleAvatarBtn) {
        toggleAvatarBtn.addEventListener('click', toggleAvatarVisibility);
    }
    
    if (sendTextBtn) {
        sendTextBtn.addEventListener('click', sendTextMessage);
    }
    
    if (recordBtn) {
        recordBtn.addEventListener('click', toggleRecording);
    }
    
    // Send message on Enter key
    if (claudeInput) {
        claudeInput.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                sendTextMessage();
            }
        });
    }
    
    // Add event listener for audio playback ended
    audioPlayer.addEventListener('ended', () => {
        console.log('Audio playback ended');
        // Reset the avatar to neutral state
        if (head) {
            head.setMood('neutral');
        }
    });
}

// Initialize Socket.IO connection
function initializeSocketIO() {
    socket = io();
    
    // Socket.IO event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        updateConversationLog('System', 'Connected to Claude AI');
        
        // Join the room
        socket.emit('join_room', {
            room_id: ROOM_ID,
            user_id: USER_ID
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConversationLog('System', 'Disconnected from Claude AI');
    });
    
    socket.on('status', data => {
        console.log('Status:', data.message);
        updateConversationLog('System', data.message);
    });
    
    socket.on('error', data => {
        console.error('Error:', data.message);
        updateConversationLog('Error', data.message);
    });
    
    socket.on('speech_result', handleSpeechResult);
}

// Initialize TalkingHead
async function initializeTalkingHead() {
    const nodeAvatar = document.getElementById('avatar');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (!nodeAvatar) {
        console.error('Avatar container not found');
        return;
    }
    
    try {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = 'Initializing TalkingHead...';
        }
        
        // Initialize TalkingHead
        head = new TalkingHead(nodeAvatar, {
            ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize", // Required but not used directly
            lipsyncModules: ["en"],
            cameraView: "head"
        });
        
        console.log('TalkingHead initialized');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Enable the Load Avatar button
        const loadAvatarBtn = document.getElementById('load-avatar-btn');
        if (loadAvatarBtn) {
            loadAvatarBtn.disabled = false;
        }
        
        // Start conversation with Claude
        socket.emit('start_conversation', {
            room_id: ROOM_ID,
            user_id: USER_ID
        });
        
    } catch (error) {
        console.error('Error initializing TalkingHead:', error);
        if (loadingIndicator) {
            loadingIndicator.textContent = 'Error: ' + error.message;
        }
    }
}

// Initialize Web Audio API context
function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context initialized');
    } catch (error) {
        console.error('Error initializing audio context:', error);
    }
}

// Initialize audio visualizer
function initializeVisualizer() {
    const canvas = document.getElementById('audio-visualizer');
    if (!canvas) {
        console.warn('Audio visualizer canvas not found');
        return;
    }
    
    visualizerContext = canvas.getContext('2d');
    
    // Resize canvas to match container
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    // Call resize on init and on window resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create analyzer node
    if (audioContext) {
        visualizerAnalyser = audioContext.createAnalyser();
        visualizerAnalyser.fftSize = 256;
        const bufferLength = visualizerAnalyser.frequencyBinCount;
        visualizerDataArray = new Uint8Array(bufferLength);
        
        // Start visualizer animation
        visualize();
    }
}

// Load avatar
async function loadAvatar() {
    if (!head) {
        console.error('TalkingHead not initialized');
        return;
    }
    
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Loading avatar...';
    }
    
    try {
        // Load avatar
        await head.showAvatar({
            url: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png',
            body: 'F', // Full body
            avatarMood: 'neutral',
            lipsyncLang: 'en'
        }, (ev) => {
            if (ev.lengthComputable && loadingIndicator) {
                const percent = Math.min(100, Math.round(ev.loaded / ev.total * 100));
                loadingIndicator.textContent = 'Loading avatar: ' + percent + '%';
            }
        });
        
        // Hide loading indicator when done
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        isAvatarLoaded = true;
        
        const loadAvatarBtn = document.getElementById('load-avatar-btn');
        if (loadAvatarBtn) {
            loadAvatarBtn.textContent = 'Reload Avatar';
        }
        
        console.log('Avatar loaded successfully');
        
        // Welcome message
        const welcomeMessage = "Hello! I'm Claude, your AI assistant. How can I help you today?";
        updateConversationLog('Claude', welcomeMessage);
        
        // Speak the welcome message
        speakText(welcomeMessage);
        
    } catch (error) {
        console.error('Error loading avatar:', error);
        if (loadingIndicator) {
            loadingIndicator.textContent = 'Error: ' + error.message;
        }
    }
}

// Toggle avatar visibility
function toggleAvatarVisibility() {
    const avatarSection = document.querySelector('.avatar-section');
    const toggleAvatarBtn = document.getElementById('toggle-avatar');
    
    if (!avatarSection || !toggleAvatarBtn) {
        return;
    }
    
    isAvatarVisible = !isAvatarVisible;
    
    if (isAvatarVisible) {
        avatarSection.style.display = 'flex';
        toggleAvatarBtn.textContent = 'Hide Avatar';
    } else {
        avatarSection.style.display = 'none';
        toggleAvatarBtn.textContent = 'Show Avatar';
    }
}

// Send text message to Claude
function sendTextMessage() {
    if (!socket) {
        console.error('Socket not connected');
        return;
    }
    
    const claudeInput = document.getElementById('claude-input');
    
    if (!claudeInput) {
        return;
    }
    
    const text = claudeInput.value.trim();
    
    if (text) {
        // Update UI
        updateConversationLog('You', text);
        claudeInput.value = '';
        
        // Send to server
        socket.emit('send_text', {
            room_id: ROOM_ID,
            user_id: USER_ID,
            text: text
        });
    }
}

// Toggle recording for speech input
async function toggleRecording() {
    if (!socket) {
        console.error('Socket not connected');
        return;
    }
    
    const recordBtn = document.getElementById('record-btn');
    const recordingIndicator = document.getElementById('recording-indicator');
    
    if (!recordBtn || !recordingIndicator) {
        return;
    }
    
    if (!isRecording) {
        try {
            // Start recording
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Connect to visualizer if available
            if (audioContext && visualizerAnalyser) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(visualizerAnalyser);
            }
            
            // Set up media recorder
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                // Create blob from chunks
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                // Convert to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result.split(',')[1];
                    
                    // Send to server
                    socket.emit('send_audio', {
                        room_id: ROOM_ID,
                        user_id: USER_ID,
                        audio: base64Audio
                    });
                };
                
                // Reset
                audioChunks = [];
            };
            
            // Start recording
            mediaRecorder.start();
            isRecording = true;
            
            // Update UI
            recordBtn.textContent = 'Stop';
            recordingIndicator.style.display = 'inline';
            
            console.log('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
            updateConversationLog('Error', 'Failed to access microphone: ' + error.message);
        }
    } else {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            
            // Stop all tracks in the stream
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        isRecording = false;
        
        // Update UI
        recordBtn.textContent = 'Record';
        recordingIndicator.style.display = 'none';
        
        console.log('Recording stopped');
    }
}

// Handle speech result from server
function handleSpeechResult(result) {
    console.log('Received speech result:', result);
    
    if (result.error) {
        updateConversationLog('Error', result.error);
        return;
    }
    
    // Update UI with user text if available
    if (result.user_text) {
        updateConversationLog('You', result.user_text);
    }
    
    // Update UI with Claude's response
    updateConversationLog('Claude', result.claude_response);
    
    // Play audio with avatar lip-sync
    if (result.audio_data && result.lipsync_data) {
        playAudioWithLipsync(result.audio_data, result.lipsync_data);
    }
}

// Play audio with lipsync
function playAudioWithLipsync(audioData, lipsyncData) {
    if (!head || !isAvatarLoaded) {
        console.warn('Avatar not loaded, cannot perform lip-sync');
        
        // Still play the audio even if avatar is not available
        playAudioOnly(audioData);
        return;
    }
    
    // Convert base64 audio to blob
    const audioBytes = atob(audioData);
    const arrayBuffer = new ArrayBuffer(audioBytes.length);
    const bytes = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < audioBytes.length; i++) {
        bytes[i] = audioBytes.charCodeAt(i);
    }
    
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Set audio source
    audioPlayer.src = audioUrl;
    
    // Connect to visualizer if available
    if (audioContext && visualizerAnalyser) {
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(visualizerAnalyser);
        visualizerAnalyser.connect(audioContext.destination);
    }
    
    // Start avatar animation with lipsync
    if (head && isAvatarVisible) {
        // Set a subtle expression
        head.setMood('smile', 0.3);
        
        // Create audio object for TalkingHead
        const audio = {
            audio: audioPlayer,
            words: lipsyncData.words || [],
            wtimes: lipsyncData.wtimes || [],
            wdurations: lipsyncData.wdurations || []
        };
        
        // Speak with lipsync
        head.speakAudio(audio);
    }
    
    // Play audio
    audioPlayer.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

// Play audio without lipsync
function playAudioOnly(audioData) {
    // Convert base64 audio to blob
    const audioBytes = atob(audioData);
    const arrayBuffer = new ArrayBuffer(audioBytes.length);
    const bytes = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < audioBytes.length; i++) {
        bytes[i] = audioBytes.charCodeAt(i);
    }
    
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Set audio source
    audioPlayer.src = audioUrl;
    
    // Connect to visualizer if available
    if (audioContext && visualizerAnalyser) {
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(visualizerAnalyser);
        visualizerAnalyser.connect(audioContext.destination);
    }
    
    // Play audio
    audioPlayer.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

// Speak text directly (for simple messages)
function speakText(text) {
    if (!socket) {
        console.error('Socket not connected');
        return;
    }
    
    // Send text to server for TTS
    socket.emit('send_text', {
        room_id: ROOM_ID,
        user_id: USER_ID,
        text: `<speak>${text}</speak>` // Special tag to indicate direct speech without Claude processing
    });
}

// Update conversation log
function updateConversationLog(sender, message) {
    const conversationLog = document.getElementById('conversation-log');
    
    if (!conversationLog) {
        return;
    }
    
    const messageElement = document.createElement('div');
    
    messageElement.className = 'message';
    if (sender === 'You') {
        messageElement.className += ' user-message';
    } else if (sender === 'Claude') {
        messageElement.className += ' assistant-message';
    } else if (sender === 'System') {
        messageElement.className += ' system-message';
    } else if (sender === 'Error') {
        messageElement.className += ' error-message';
    }
    
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    conversationLog.appendChild(messageElement);
    
    // Scroll to bottom
    conversationLog.scrollTop = conversationLog.scrollHeight;
}

// Visualize audio
function visualize() {
    requestAnimationFrame(visualize);
    
    if (!visualizerAnalyser || !visualizerContext) return;
    
    visualizerAnalyser.getByteFrequencyData(visualizerDataArray);
    
    // Clear canvas
    visualizerContext.fillStyle = 'rgba(26, 26, 26, 0.2)';
    visualizerContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Calculate bar width based on canvas width and buffer length
    const barWidth = width / visualizerDataArray.length;
    
    // Draw frequency bars
    for (let i = 0; i < visualizerDataArray.length; i++) {
        const barHeight = visualizerDataArray[i] / 255 * height;
        
        // Calculate x position of the bar
        const x = i * barWidth;
        
        // Calculate gradient color based on frequency
        const hue = i / visualizerDataArray.length * 180 + 180; // Blue to purple range
        
        // Draw the bar
        visualizerContext.fillStyle = `hsl(${hue}, 70%, 60%)`;
        visualizerContext.fillRect(x, height - barHeight, barWidth, barHeight);
    }
}

// Clean up resources when leaving the page
window.addEventListener('beforeunload', () => {
    // Stop any ongoing recording
    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // Close audio context
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    
    // Leave the room
    if (socket) {
        socket.emit('leave_room', {
            room_id: ROOM_ID
        });
    }
});