
export const homeSteps = [
  {
    target: '.audio-recorder-card',
    content: '音声入力ツールでは、音声を録音して文字起こしができます。',
    placement: 'bottom' as const,
  },
  {
    target: '.transcription-card',
    content: 'InDesignスクリプト生成では、テキストからスクリプトを生成できます。',
    placement: 'bottom' as const,
  },
  {
    target: '.pdf-compare-card',
    content: 'PDF比較ツールでは、2つのPDFファイルの内容を比較できます。',
    placement: 'bottom' as const,
  },
  {
    target: '.settings-card',
    content: '設定ページでは、アプリケーションの各種設定を変更できます。',
    placement: 'bottom' as const,
  },
];

export const pdfCompareSteps = [
  {
    target: '.input-section-1',
    content: 'ここに元のPDFファイルをドロップするか、テキストを入力します。',
    placement: 'top' as const,
  },
  {
    target: '.input-section-2',
    content: 'ここに比較対象のPDFファイルをドロップするか、テキストを入力します。',
    placement: 'top' as const,
  },
  {
    target: '.compare-button',
    content: '「比較する」ボタンをクリックすると、PDFの差分を確認できます。',
    placement: 'bottom' as const,
  },
];

export const transcriptionSteps = [
  {
    target: '.record-section',
    content: 'ここで音声を録音できます。「録音開始」ボタンをクリックしてください。',
    placement: 'top' as const,
  },
  {
    target: '.waveform-section',
    content: '録音中は音声の波形が表示されます。',
    placement: 'top' as const,
  },
  {
    target: '.transcription-section',
    content: '録音が完了すると、ここに文字起こし結果が表示されます。',
    placement: 'bottom' as const,
  },
];

export const audioRecorderSteps = [
  {
    target: '.record-controls',
    content: '「録音開始」ボタンをクリックして、音声の録音を開始します。',
    placement: 'top' as const,
  },
  {
    target: '.audio-visualizer',
    content: '録音中は音声の波形がリアルタイムで表示されます。',
    placement: 'top' as const,
  },
  {
    target: '.upload-section',
    content: '既存の音声ファイルをアップロードすることもできます。',
    placement: 'bottom' as const,
  },
  {
    target: '.transcription-result',
    content: '文字起こし結果がここに表示されます。テキストは編集可能です。',
    placement: 'bottom' as const,
  },
];
