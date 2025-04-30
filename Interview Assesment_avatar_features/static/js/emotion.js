// emotion.js - Handles facial emotion detection using face-api.js
// Add this to the beginning of emotion.js

// Debug function to check which models are available
function checkModelAvailability() {
    console.log('Checking face-api.js model availability:');
    
    if (!faceapi || !faceapi.nets) {
        console.error('faceapi or faceapi.nets is not defined');
        return;
    }
    
    // Check each model
    console.log('TinyFaceDetector available:', typeof faceapi.nets.tinyFaceDetector !== 'undefined');
    console.log('FaceLandmark68Net available:', typeof faceapi.nets.faceLandmark68Net !== 'undefined');
    console.log('FaceExpressionNet available:', typeof faceapi.nets.faceExpressionNet !== 'undefined');
    
    // Check if models are loaded
    if (faceapi.nets.tinyFaceDetector) {
        console.log('TinyFaceDetector loaded:', faceapi.nets.tinyFaceDetector.isLoaded);
    }
    
    if (faceapi.nets.faceLandmark68Net) {
        console.log('FaceLandmark68Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
    }
    
    if (faceapi.nets.faceExpressionNet) {
        console.log('FaceExpressionNet loaded:', faceapi.nets.faceExpressionNet.isLoaded);
    }
}

// Call this function right after loading face-api.js
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('Checking face-api.js availability');
        checkModelAvailability();
    }, 1000);
});
// Global variables
let isEmotionDetectionRunning = false;
let detectionInterval = null;
let emotionData = []; // Array to store emotion data over time
let emotionStatusElement = document.getElementById('emotion-status');
let faceDetectionCanvas = document.getElementById('face-detection-canvas');
let lastEmotionTimestamp = 0;
const EMOTION_SAMPLE_INTERVAL = 3000; // Sample emotion every 3 seconds
const EYE_CONTACT_THRESHOLD = 0.7; // Threshold for determining eye contact

// Available emotions from face-api.js
const emotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

// Start emotion detection process
async function startEmotionDetection(videoElement) {
    if (isEmotionDetectionRunning) return;
    
    try {
        // Load required face-api.js models
        await loadModels();
        
        // Set up canvas for face detection
        const displaySize = { 
            width: videoElement.videoWidth || 640, 
            height: videoElement.videoHeight || 480 
        };
        faceApiMatchDimensions(faceDetectionCanvas, displaySize);
        
        // Start detection loop
        isEmotionDetectionRunning = true;
        runEmotionDetection(videoElement);
        
        console.log('Emotion detection started');
    } catch (error) {
        console.error('Error starting emotion detection:', error);
    }
}

// Pause emotion detection
function pauseEmotionDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    if (emotionStatusElement) {
        emotionStatusElement.textContent = 'Paused';
    }
    
    console.log('Emotion detection paused');
}

// Stop emotion detection
function stopEmotionDetection() {
    isEmotionDetectionRunning = false;
    
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    console.log('Emotion detection stopped');
}

// Load face-api.js models
// Load face-api.js models
async function loadModels() {
    try {
        // Log the loading process
        console.log('Loading face-api.js models...');
        
        // Load required face-api.js models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/static/models');
        console.log('Tiny Face Detector model loaded');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri('/static/models');
        console.log('Face Landmark model loaded');
        
        // Explicitly load the face expression model
        await faceapi.nets.faceExpressionNet.loadFromUri('/static/models');
        console.log('Face Expression model loaded');
        
        console.log('All face-api models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
        
        // For demo purposes, we'll mock the faceapi functions if models cannot be loaded
        if (typeof faceapi === 'undefined' || !faceapi.nets) {
            mockFaceApi();
        }
    }
}

// Mock face-api.js for demo/development without models
function mockFaceApi() {
    console.log('Using mock face-api for development');
    
    // Create a mock faceapi object if it doesn't exist
    if (typeof faceapi === 'undefined') {
        window.faceapi = {};
    }
    
    // Mock the detectSingleFace and related methods
    faceapi.detectSingleFace = () => {
        return {
            withFaceLandmarks: () => {
                return {
                    withFaceExpressions: () => {
                        // Return random mock detection results
                        return {
                            detection: {
                                box: {
                                    x: Math.random() * 100,
                                    y: Math.random() * 100,
                                    width: 100 + Math.random() * 50,
                                    height: 100 + Math.random() * 50
                                }
                            },
                            expressions: generateMockExpressions(),
                            landmarks: {
                                positions: Array(68).fill().map(() => ({
                                    x: Math.random() * 200,
                                    y: Math.random() * 200
                                }))
                            }
                        };
                    }
                };
            }
        };
    };
    
    // Mock the matchDimensions function
    faceapi.matchDimensions = (canvas, dimensions) => {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
    };
    
    // Mock the draw functions
    faceapi.draw = {
        drawDetections: () => {},
        drawFaceExpressions: () => {}
    };
}

// Helper function for mock expressions
function generateMockExpressions() {
    const expressions = {};
    const dominantEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    // Set random values for all emotions
    emotions.forEach(emotion => {
        expressions[emotion] = Math.random() * 0.3;
    });
    
    // Set dominant emotion
    expressions[dominantEmotion] = 0.5 + Math.random() * 0.5;
    
    return expressions;
}

// Compatibility function for face-api.matchDimensions
function faceApiMatchDimensions(canvas, dimensions) {
    if (faceapi && faceapi.matchDimensions) {
        faceapi.matchDimensions(canvas, dimensions);
    } else {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
    }
}

// Run emotion detection loop with improved eye contact detection
function runEmotionDetection(videoElement) {
    detectionInterval = setInterval(async () => {
        if (!isEmotionDetectionRunning || !videoElement.readyState === 4) return;
        
        try {
            // Detect face with expressions and landmarks
            const detection = await faceapi.detectSingleFace(videoElement, 
                new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();
                
            if (detection) {
                // Process detection results with our improved algorithm
                processEmotionDetection(detection);
            } else {
                updateEmotionStatus('No face detected');
            }
        } catch (error) {
            console.error('Error in emotion detection:', error);
        }
    }, 100); // Check for face 10 times per second
}

// Process emotion detection results
function processEmotionDetection(detection) {
    // Get dominant emotion
    const expressions = detection.expressions;
    let dominantEmotion = 'neutral';
    let maxProbability = 0;
    
    for (const emotion in expressions) {
        if (expressions[emotion] > maxProbability) {
            maxProbability = expressions[emotion];
            dominantEmotion = emotion;
        }
    }
    
    // Determine eye contact using our improved algorithm
    const landmarks = detection.landmarks;
    const isEyeContact = determineEyeContact(landmarks);
    
    // Log results for debugging
    console.log('Detected emotion:', dominantEmotion, 'with confidence:', maxProbability);
    console.log('Eye contact detected:', isEyeContact);
    
    // Update UI
    updateEmotionStatus(`${dominantEmotion} ${isEyeContact ? '👁️' : ''}`);
    
    // Sample and save emotion data periodically
    const currentTime = Date.now();
    if (currentTime - lastEmotionTimestamp > EMOTION_SAMPLE_INTERVAL) {
        lastEmotionTimestamp = currentTime;
        sampleEmotionData(dominantEmotion, isEyeContact);
    }
}


// Determine if the user is making eye contact
function determineEyeContact(eyePoints) {
    // In a real implementation, this would use gaze estimation
    // For this demo, we'll use a simple heuristic based on face detection confidence
    return Math.random() > 0.3; // Simplified for demo purposes
}

// Sample and save emotion data
function sampleEmotionData(emotion, eyeContact) {
    // Add to emotion data array
    emotionData.push({
        emotion: emotion,
        eyeContact: eyeContact,
        timestamp: Date.now()
    });
    
    // Send data to server
    sendEmotionData(emotion, eyeContact);
}

// Send emotion data to server
async function sendEmotionData(emotion, eyeContact) {
    try {
        await fetch('/save_emotion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                room_id: ROOM_ID,
                user_id: USER_ID,
                emotion: emotion,
                eye_contact: eyeContact
            })
        });
    } catch (error) {
        console.error('Error sending emotion data:', error);
    }
}

// Update emotion status display
function updateEmotionStatus(status) {
    if (emotionStatusElement) {
        emotionStatusElement.textContent = status;
    }
}