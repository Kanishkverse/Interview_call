from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import uuid
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management

# In-memory storage for emotion data (in production, use a database)
emotion_data = {}

@app.route('/')
def index():
    """Render the landing page"""
    return render_template('index.html')

@app.route('/create_room', methods=['POST'])
def create_room():
    """Create a new conference room"""
    room_id = str(uuid.uuid4())[:8]  # Generate a unique room ID
    session['user_id'] = str(uuid.uuid4())[:8]  # Assign a user ID
    session['is_host'] = True
    return redirect(url_for('room', room_id=room_id))

@app.route('/join_room', methods=['POST'])
def join_room():
    """Join an existing conference room"""
    room_id = request.form.get('room_id')
    session['user_id'] = str(uuid.uuid4())[:8]  # Assign a user ID
    session['is_host'] = False
    return redirect(url_for('room', room_id=room_id))

@app.route('/room/<room_id>')
def room(room_id):
    """Render the conference room page"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    user_id = session['user_id']
    is_host = session.get('is_host', False)
    
    # Initialize emotion data storage for this user in this room
    if room_id not in emotion_data:
        emotion_data[room_id] = {}
    
    if user_id not in emotion_data[room_id]:
        emotion_data[room_id][user_id] = []
    
    return render_template('room.html', room_id=room_id, user_id=user_id, is_host=is_host)

@app.route('/save_emotion', methods=['POST'])
def save_emotion():
    """Save detected emotion data"""
    data = request.json
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    emotion = data.get('emotion')
    eye_contact = data.get('eye_contact')
    timestamp = datetime.now().isoformat()
    
    if room_id not in emotion_data:
        emotion_data[room_id] = {}
    
    if user_id not in emotion_data[room_id]:
        emotion_data[room_id][user_id] = []
    
    # Save the emotion sample
    emotion_data[room_id][user_id].append({
        'emotion': emotion,
        'eye_contact': eye_contact,
        'timestamp': timestamp
    })
    
    return jsonify({'status': 'success'})

@app.route('/end_call', methods=['POST'])
def end_call():
    """End the call and redirect to the report page"""
    data = request.json
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    
    return jsonify({
        'status': 'success',
        'report_url': url_for('report', room_id=room_id, user_id=user_id)
    })

@app.route('/report/<room_id>/<user_id>')
def report(room_id, user_id):
    """Render the report page with emotion analysis"""
    if room_id not in emotion_data or user_id not in emotion_data[room_id]:
        return "No data available for this session", 404
    
    user_emotion_data = emotion_data[room_id][user_id]
    
    # Calculate emotion statistics
    emotions_count = {}
    total_samples = len(user_emotion_data)
    eye_contact_count = sum(1 for entry in user_emotion_data if entry['eye_contact'])
    
    for entry in user_emotion_data:
        emotion = entry['emotion']
        if emotion in emotions_count:
            emotions_count[emotion] += 1
        else:
            emotions_count[emotion] = 1
    
    # Calculate percentages
    emotion_percentages = {emotion: (count / total_samples) * 100 
                          for emotion, count in emotions_count.items()} if total_samples > 0 else {'neutral': 100.0}
    
    eye_contact_percentage = (eye_contact_count / total_samples) * 100 if total_samples > 0 else 0
    
    # If no emotions were detected, provide default data
    if not emotion_percentages:
        emotion_percentages = {'neutral': 100.0}
    
    return render_template(
        'report.html',
        emotion_percentages=emotion_percentages,
        eye_contact_percentage=eye_contact_percentage,
        total_duration=total_samples or 1  # Ensure non-zero value
    )

if __name__ == '__main__':
    app.run(debug=True)