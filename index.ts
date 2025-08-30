import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";

import PluginError from "plugin-error";

import type Vinyl from "vinyl";

const PLUGIN_NAME = "gulp-inline-style";

function inlineStyle(options = []) {
  return new Transform({
    objectMode: true,
    async transform(file: Vinyl, enc: BufferEncoding, cb: (error: Error | null, file: Vinyl) => void) {
      if (file.isNull()) return cb(null, file);
      if (file.isStream()) {
        return cb(new PluginError(PLUGIN_NAME, "Streaming not supported"), file);
      }

      try {
        let content = file.contents!.toString(enc);

        for (const id of options) {
          const regex = new RegExp(
            `<link[^>]+id=["']${id}["'][^>]+href=["']([^"']+)["']([^>]*)>`,
            "gi",
          );

          content = await content.replace(regex, (match, href, attrs) => {
            const cssPath = path.resolve(path.dirname(file.path), href);
            if (!fs.existsSync(cssPath)) return match;

            const cssContent = fs.readFileSync(cssPath, "utf8");
            const mediaMatch = attrs.match(/media=["']([^"']+)["']/i);
            const mediaAttr = mediaMatch ? ` media="${mediaMatch[1]}"` : "";

            return `<style${mediaAttr}>${cssContent}</style>`;
          });
        }

        file.contents = Buffer.from(content, enc);
        cb(null, file);
      } catch (err) {
        cb(new PluginError(PLUGIN_NAME, err as Error), file);
      }
    },
  });
}

export default inlineStyle;
