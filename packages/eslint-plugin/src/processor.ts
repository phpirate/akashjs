/**
 * ESLint processor for .akash files.
 * Extracts the <script> block so ESLint can lint the TypeScript code.
 */

export const processor = {
  preprocess(text: string, filename: string): Array<{ text: string; filename: string }> {
    // Extract <script ...> ... </script>
    const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(text);
    if (!scriptMatch) return [];

    const scriptContent = scriptMatch[1];
    const scriptStart = text.indexOf(scriptMatch[0]) + scriptMatch[0].indexOf('>') + 1;

    // Count lines before script block for offset
    const linesBefore = text.slice(0, scriptStart).split('\n').length - 1;

    // Pad with empty lines so line numbers match the .akash file
    const padded = '\n'.repeat(linesBefore) + scriptContent;

    return [{ text: padded, filename: filename + '.ts' }];
  },

  postprocess(messages: any[][], filename: string): any[] {
    return messages.flat();
  },

  supportsAutofix: true,
};
