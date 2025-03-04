
/**
 * Utility functions for audio stream analysis and amplitude calculation
 */

export function setupAudioAnalyzer(stream: MediaStream) {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 256;
  
  return { audioContext, analyser };
}

export function calculateAmplitude(
  analyser: AnalyserNode, 
  isRecording: boolean,
  onAmplitudeChange: (amplitude: number) => void
) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  const updateAmplitude = () => {
    if (!analyser || !isRecording) return;
    
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((acc, value) => acc + value, 0);
    const avg = sum / dataArray.length;
    const normalizedAmplitude = avg / 128.0;
    
    const newAmplitude = normalizedAmplitude > 0 ? normalizedAmplitude : 0.05;
    onAmplitudeChange(newAmplitude);
    
    if (isRecording) {
      requestAnimationFrame(updateAmplitude);
    }
  };
  
  // Start amplitude calculation
  requestAnimationFrame(updateAmplitude);
}
