export function floatTo16BitPCM(output: Float32Array): DataView {
  const dataView = new DataView(new ArrayBuffer(output.length * 2));
  for (let i = 0; i < output.length; i++) {
    const s = Math.max(-1, Math.min(1, output[i]));
    dataView.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return dataView;
}

export function createWavHeader(
  channels: number,
  sampleRate: number,
  dataLength: number,
): Uint8Array {
  const blockAlign = channels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = dataLength * channels * 2;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* RIFF size */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF format */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk byte count */
  view.setUint32(16, 16, true);
  /* format code (PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, channels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk byte count */
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}

function convertToMono(buffer: AudioBuffer): Float32Array {
  const monoData = new Float32Array(buffer.length);

  // Mix all channels to mono
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      monoData[i] += channelData[i] / buffer.numberOfChannels;
    }
  }

  return monoData;
}

export async function convertAudioToWav(audioBlob: Blob): Promise<Blob> {
  try {
    console.log("Converting audio blob:", audioBlob.type, audioBlob.size, "bytes");
    
    // WebMまたはOpus形式のままでAPIに送信する場合は変換をスキップ
    if (audioBlob.type.includes('webm') || audioBlob.type.includes('opus')) {
      console.log("Using native format for API:", audioBlob.type);
      return audioBlob;
    }
    
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();

    // デコードしてオーディオバッファに変換
    console.log("Decoding audio data...");
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log("Audio decoded successfully. Channels:", audioBuffer.numberOfChannels, "Duration:", audioBuffer.duration);

    // モノラルに変換
    const monoData = convertToMono(audioBuffer);

    // 16ビットPCMに変換
    const pcmData = floatTo16BitPCM(monoData);

    // WAVヘッダーを作成（サンプルレートを44100に設定）
    const wavHeader = createWavHeader(1, 44100, monoData.length);

    // WAVヘッダーとPCMデータを結合
    const wavBlob = new Blob([wavHeader, pcmData.buffer], { type: "audio/wav" });
    console.log("WAV conversion complete:", wavBlob.size, "bytes");

    return wavBlob;
  } catch (error) {
    console.error("Audio conversion error:", error);
    // エラーが発生した場合は元のBlobを返す（APIが直接処理できる場合がある）
    console.log("Returning original blob due to conversion error");
    return audioBlob;
  }
}

export const processAudioForTranscription = async (blob: Blob): Promise<string> => {
  const wavBlob = await convertAudioToWav(blob);
  // TODO: ここで実際の文字起こし処理を実装
  return "文字起こしのテスト結果です";
};
