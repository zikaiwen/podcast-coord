// Claude responses can contain non-text blocks before the final answer.
export function extractModelText(message) {
  if (message?.stop_reason === 'max_tokens') {
    throw new Error('Model response reached its output limit. Please retry.');
  }
  const text = (Array.isArray(message?.content) ? message.content : [])
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('Model response did not include any text content. Please retry.');
  return text;
}
