import { Transform } from "node:stream";
/**
 * Gulp plugin to inline CSS files referenced by link tags with specific IDs
 * @param options - Array of CSS link IDs to inline
 * @returns {Transform} Transform stream
 */
declare function inlineStyle(options?: never[]): Transform;
export default inlineStyle;
