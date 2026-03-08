import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back'); // New: Camera facing state
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  const API_URL = "http://192.168.1.2:8000"; 

  // Function to toggle between front and back camera
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Camera access is required for diagnostic scans.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.text}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.7, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhoto(data);
    }
  };

  const uploadAndAnalyze = async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = await response.json();
      if (result.status === "success") {
        Alert.alert("Analysis Complete", `Result: ${result.diagnosis}\nConfidence: ${result.confidence_score}%`);
        router.push('/'); 
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert("Connection Failed", "Ensure your phone and laptop are on the same Wi-Fi.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <View style={{ flex: 1 }}>
          <CameraView 
            style={styles.camera} 
            ref={cameraRef} 
            facing={facing} // Apply the facing state here
          />
          
          <View style={styles.overlay}>
             <View style={styles.focusFrame} />
             <Text style={styles.guideText}>Center the eye within the frame</Text>
          </View>

          {/* Flip Camera Button */}
          <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.innerCircle} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.preview}>
          <Image source={{ uri: photo.uri }} style={styles.image} />
          <TouchableOpacity style={styles.button} onPress={() => setPhoto(null)}>
            <Text style={styles.text}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, {backgroundColor: '#1a73e8'}]} 
            onPress={uploadAndAnalyze}
            disabled={isUploading}
          >
            <Text style={styles.text}>{isUploading ? "AI Analyzing..." : "Analyze Scan"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  camera: { flex: 1 },
  statusText: { color: 'white', textAlign: 'center', marginBottom: 20 },
  flipBtn: { // New style for flip button
    position: 'absolute',
    top: 60,
    right: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  captureBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  innerCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#fff' },
  preview: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  image: { width: '90%', height: '60%', borderRadius: 20 },
  button: { marginTop: 20, padding: 18, backgroundColor: '#333', borderRadius: 12, width: 240 },
  text: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  focusFrame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#1a73e8',
    borderRadius: 15,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
  },
  guideText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
});