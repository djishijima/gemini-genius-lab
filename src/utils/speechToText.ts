
export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  try {
    const buffer = await audioBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const durationInSeconds = audioBuffer.duration;

    if (durationInSeconds > 60) {
      return await handleLongAudio(base64Data, apiKey);
    } else {
      return await handleShortAudio(base64Data, apiKey);
    }
  } catch (error) {
    console.error('Speech-to-Text Error:', error);
    throw error;
  }
}

async function handleLongAudio(base64Data: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:longrunningrecognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'ja-JP',
        },
        audio: {
          content: base64Data
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Speech-to-Text API error: ${JSON.stringify(errorData)}`);
  }

  const operationData = await response.json();
  return await checkOperation(operationData.name, apiKey);
}

async function checkOperation(operationName: string, apiKey: string): Promise<string> {
  const operationResponse = await fetch(
    `https://speech.googleapis.com/v1/operations/${operationName}?key=${apiKey}`
  );
  const operationStatus = await operationResponse.json();
  
  if (operationStatus.done) {
    if (operationStatus.response?.results) {
      return operationStatus.response.results
        .map((result: any) => result.alternatives[0].transcript)
        .join('\n');
    }
    return '';
  }
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  return checkOperation(operationName, apiKey);
}

async function handleShortAudio(base64Data: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'ja-JP',
        },
        audio: {
          content: base64Data
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Speech-to-Text API error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  if (data.results) {
    return data.results
      .map((result: any) => result.alternatives[0].transcript)
      .join('\n');
  }
  return '';
}
