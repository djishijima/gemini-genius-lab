
// このファイルは新しいモジュールを再エクスポートするだけです
import { 
  transcribeAudio as transcribeAudioImpl,
  processFile as processFileImpl
} from './speechRecognition';

// 後方互換性のために元の関数を再エクスポート
export const transcribeAudio = transcribeAudioImpl;
export const processFile = processFileImpl;

// 型定義もエクスポート
export type { 
  SpeechRecognitionResult, 
  SpeechRecognitionResponse 
} from './speechRecognition/types';
