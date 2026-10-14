# voice_emotion_api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Simple voice emotion detection using audio features
# For production, use pre-trained models like SpeechBrain

def extract_features(audio_path):
    """Extract audio features for emotion detection"""
    try:
        # Load audio
        y, sr = librosa.load(audio_path, duration=10, sr=22050)
        
        # Extract features
        # 1. Pitch (fundamental frequency)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_mean = np.mean(pitches[pitches > 0]) if len(pitches[pitches > 0]) > 0 else 0
        
        # 2. Energy (RMS)
        rms = librosa.feature.rms(y=y)[0]
        energy_mean = np.mean(rms)
        energy_std = np.std(rms)
        
        # 3. Zero Crossing Rate (voice quality)
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = np.mean(zcr)
        
        # 4. Tempo (speaking rate)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # 5. Spectral features
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
        
        return {
            'pitch': float(pitch_mean),
            'energy': float(energy_mean),
            'energy_variance': float(energy_std),
            'zcr': float(zcr_mean),
            'tempo': float(tempo),
            'spectral_centroid': float(spectral_centroid)
        }
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None

def classify_emotion(features):
    """
    Simple rule-based emotion classification
    In production, replace with trained ML model
    """
    if features is None:
        return 'neutral', 0.5
    
    pitch = features['pitch']
    energy = features['energy']
    energy_var = features['energy_variance']
    tempo = features['tempo']
    
    # Rule-based classification (simplified)
    # These thresholds would be learned from training data in production
    
    # High energy + high pitch + fast tempo = energetic/happy
    if energy > 0.05 and pitch > 150 and tempo > 120:
        return 'energetic', 0.75
    
    # High energy + variable energy + high pitch = stressed/anxious
    elif energy > 0.04 and energy_var > 0.02 and pitch > 140:
        return 'stressed', 0.72
    
    # Low energy + low pitch + slow tempo = tired/sad
    elif energy < 0.03 and pitch < 120 and tempo < 90:
        return 'tired', 0.70
    
    # Moderate energy + high variance = anxious
    elif energy_var > 0.025:
        return 'anxious', 0.68
    
    # Moderate everything = calm/content
    elif 0.03 <= energy <= 0.05 and 100 <= tempo <= 120:
        return 'calm', 0.73
    
    # Default
    else:
        return 'content', 0.65

@app.route('/api/analyze-voice', methods=['POST'])
def analyze_voice():
    """Analyze voice emotion from audio file"""
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        # Extract features
        features = extract_features(tmp_path)
        
        # Classify emotion
        emotion, confidence = classify_emotion(features)
        
        # Clean up temp file
        os.remove(tmp_path)
        
        # Prepare response
        response = {
            'success': True,
            'emotion': emotion,
            'confidence': confidence,
            'features': features,
            'analysis': generate_analysis(emotion, confidence, features)
        }
        
        print(f"✅ Voice analysis: {emotion} ({confidence:.0%})")
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error analyzing voice: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generate_analysis(emotion, confidence, features):
    """Generate human-readable analysis"""
    analyses = {
        'calm': 'Voice patterns indicate stable emotional state with steady tone.',
        'stressed': 'Vocal markers suggest elevated stress levels. Voice shows tension.',
        'energetic': 'Enthusiastic tone detected with high engagement levels.',
        'tired': 'Voice energy appears low. May indicate fatigue or exhaustion.',
        'anxious': 'Voice tremors and hesitation detected. Possible anxiety markers.',
        'content': 'Voice tone suggests satisfaction and emotional wellbeing.'
    }
    
    base_analysis = analyses.get(emotion, 'Voice analysis complete.')
    
    # Add feature insights
    if features:
        if features['energy'] < 0.03:
            base_analysis += ' Low vocal energy detected.'
        if features['energy_variance'] > 0.025:
            base_analysis += ' Voice shows significant variation.'
    
    return base_analysis

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Voice Emotion API running'})

if __name__ == '__main__':
    print("🎤 Starting Voice Emotion Analysis API...")
    print("📡 Server running on http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)


# ADVANCED VERSION using SpeechBrain (uncomment to use)
"""
from speechbrain.pretrained import EncoderClassifier

# Load pre-trained emotion model
emotion_classifier = None

def load_model():
    global emotion_classifier
    try:
        print("Loading SpeechBrain emotion model...")
        emotion_classifier = EncoderClassifier.from_hparams(
            source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
            savedir="pretrained_models/emotion"
        )
        print("✅ Model loaded!")
    except Exception as e:
        print(f"❌ Model loading failed: {e}")

@app.route('/api/analyze-voice-advanced', methods=['POST'])
def analyze_voice_advanced():
    try:
        if emotion_classifier is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        audio_file = request.files['audio']
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        # Analyze with pre-trained model
        out_prob, score, index, text_lab = emotion_classifier.classify_file(tmp_path)
        
        emotion = text_lab[0]  # e.g., 'hap', 'sad', 'ang', 'neu'
        confidence = float(score[0])
        
        # Map to our emotion labels
        emotion_map = {
            'hap': 'energetic',
            'sad': 'tired',
            'ang': 'stressed',
            'neu': 'calm',
            'fea': 'anxious'
        }
        
        mapped_emotion = emotion_map.get(emotion, 'content')
        
        os.remove(tmp_path)
        
        return jsonify({
            'success': True,
            'emotion': mapped_emotion,
            'confidence': confidence,
            'raw_emotion': emotion
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Call this on startup
# load_model()
"""