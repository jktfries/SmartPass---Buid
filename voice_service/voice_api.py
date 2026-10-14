# voice_emotion_api.py
import sys
# Windows consoles default to cp1252, which can't encode the emoji in this
# file's print() calls — force UTF-8 stdout/stderr so startup doesn't crash.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import subprocess
import tempfile
import os

# The browser sends audio/webm (Opus), which librosa can't read directly, so it
# is converted to WAV first. ffmpeg is invoked directly rather than through
# pydub, because pydub also shells out to ffprobe — which imageio-ffmpeg (the
# pip-installable static binary used here) does not ship.
try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_EXE = None

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
        print(f"Feature extraction error: {type(e).__name__}: {e}")
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

WELLNESS_MAPPING = {
    'energetic': 'okay',
    'calm':      'fine',
    'content':   'fine',
    'stressed':  'not_okay',
    'anxious':   'not_okay',
    'tired':     'not_okay',
    'neutral':   'okay',
}

def convert_to_wav(src_path: str) -> str:
    """Convert any browser audio format (webm/ogg/mp4) to WAV. Returns WAV path."""
    if not FFMPEG_EXE:
        return src_path  # librosa will attempt direct read
    wav_path = src_path.replace('.webm', '.wav').replace('.ogg', '.wav')
    if wav_path == src_path:
        wav_path = src_path + '.wav'
    try:
        subprocess.run(
            [FFMPEG_EXE, '-y', '-i', src_path, '-ac', '1', '-ar', '22050', wav_path],
            check=True, capture_output=True,
        )
        return wav_path
    except Exception as e:
        detail = e.stderr.decode('utf-8', 'ignore')[-400:] if isinstance(e, subprocess.CalledProcessError) else e
        print(f"⚠️  ffmpeg conversion failed: {detail}. Passing original to librosa.")
        return src_path

@app.route('/api/analyze-voice', methods=['POST'])
def analyze_voice():
    """Analyze voice emotion from audio file (supports audio/webm from MediaRecorder)."""
    tmp_path = None
    wav_path = None
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']

        # Detect format from MIME type or filename
        content_type = audio_file.content_type or ''
        suffix = '.webm' if 'webm' in content_type else '.wav'

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name

        # Convert webm → wav when needed
        if suffix == '.webm':
            wav_path = convert_to_wav(tmp_path)
        else:
            wav_path = tmp_path

        features = extract_features(wav_path)
        emotion, confidence = classify_emotion(features)

        response = {
            'success':          True,
            'emotion':          emotion,
            'confidence':       confidence,
            'features':         features,
            'analysis':         generate_analysis(emotion, confidence, features),
            'wellness_mapping': WELLNESS_MAPPING.get(emotion, 'okay'),
        }

        print(f"✅ Voice analysis: {emotion} ({confidence:.0%})")
        return jsonify(response)

    except Exception as e:
        print(f"❌ Error analyzing voice: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        for p in {tmp_path, wav_path}:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass

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
    app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)


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