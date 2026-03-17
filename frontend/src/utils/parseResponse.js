export function extractAudioCues(rawText) {
  if (!rawText) return { displayText: '', cues: [] };
  
  const cues = [];
  const lines = rawText.split('\n');
  const displayLines = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('AUDIO_CUE::')) {
      try {
        const jsonStr = line.replace('AUDIO_CUE::', '').trim();
        cues.push(JSON.parse(jsonStr));
      } catch (e) {
        console.warn("Failed to parse AUDIO_CUE:", line);
      }
    } else {
      displayLines.push(line);
    }
  }
  
  return {
    displayText: displayLines.join('\n').trim(),
    cues
  };
}
