import sharp from "sharp";

const MODEL = "gemini-nano-banana-2.1";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

const ASPECTS: Array<[string, number]> = [
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["5:4", 5 / 4],
  ["3:4", 3 / 4],
  ["4:3", 4 / 3],
  ["2:3", 2 / 3],
  ["3:2", 3 / 2],
  ["9:16", 9 / 16],
  ["16:9", 16 / 9],
  ["21:9", 21 / 9],
];

const PROMPTS = {
  remove:
    "Remove only the background from this logo. Keep every part of the logo — shapes, colours, outlines, and text — exactly as they are. Do not redraw, restyle, crop tightly, or add effects. Put the logo on a flat pure white background with no shadow, no texture, and no extra objects.",
  enhance:
    "Enhance this image for print: increase sharpness and clarity and clean up noise. Keep the design, text, colours, layout, and background exactly the same. Do not add, remove, or redraw any part of the artwork.",
} as const;

export type LogoToolMode = keyof typeof PROMPTS;

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export function parseLogoUpload(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw new Error("Upload a PNG, JPG, or WebP logo.");
  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) throw new Error("Upload a PNG, JPG, or WebP logo.");
  const data = match[2].replace(/\s/g, "");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) {
    throw new Error("That file is empty or larger than 8 MB.");
  }
  return { mimeType, data, bytes };
}

function closestAspect(width: number, height: number) {
  const ratio = width / Math.max(height, 1);
  let best = ASPECTS[0][0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [label, value] of ASPECTS) {
    const diff = Math.abs(Math.log(ratio / value));
    if (diff < bestDiff) {
      best = label;
      bestDiff = diff;
    }
  }
  return best;
}

function imageFromBlock(block: unknown): { data: string; mimeType: string } | null {
  if (!block || typeof block !== "object") return null;
  const record = block as Record<string, unknown>;
  const data = typeof record.data === "string" ? record.data.replace(/\s/g, "") : "";
  const mime =
    typeof record.mime_type === "string"
      ? record.mime_type
      : typeof record.mimeType === "string"
        ? record.mimeType
        : "image/png";
  if (data.length > 80 && mime.startsWith("image/")) return { data, mimeType: mime };
  return null;
}

function textFromBlock(block: unknown) {
  if (!block || typeof block !== "object") return "";
  const record = block as Record<string, unknown>;
  return typeof record.text === "string" ? record.text : "";
}

function extractResult(body: unknown) {
  if (!body || typeof body !== "object") return { image: null, note: "" };
  const root = body as Record<string, unknown>;
  const direct = imageFromBlock(root.output_image) ?? imageFromBlock(root.outputImage);
  const notes: string[] = [];
  const steps = Array.isArray(root.steps) ? root.steps : [];
  let stepped: { data: string; mimeType: string } | null = null;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (!step || typeof step !== "object") continue;
    const content = (step as { content?: unknown }).content;
    const blocks = Array.isArray(content) ? content : [step];
    for (let j = blocks.length - 1; j >= 0; j -= 1) {
      const image = imageFromBlock(blocks[j]);
      if (image && !stepped) stepped = image;
      const text = textFromBlock(blocks[j]);
      if (text) notes.push(text);
    }
  }
  return { image: direct ?? stepped, note: notes.filter(Boolean).at(-1) ?? "" };
}

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const root = body as { error?: { message?: string; code?: string }; message?: string };
    const message = root.error?.message || root.message || "";
    const code = typeof root.error?.code === "string" ? root.error.code : "";
    console.error("Gemini image error", status, code, message);
    if (/safety|prohibited/i.test(`${code} ${message}`)) {
      return "Gemini’s image filter blocked this file. That filter cannot be turned off, and it sometimes flags ordinary logos. Crop tightly around the logo and try again, or use Enhance image.";
    }
    if (message) return message;
  }
  return `Gemini returned ${status}.`;
}

async function knockOutLightBackground(bytes: Buffer) {
  const { data, info } = await sharp(bytes).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  const bg = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, pixel) => sum + pixel[channel], 0) / corners.length));
  for (let i = 0; i < data.length; i += channels) {
    const dist = Math.max(
      Math.abs(data[i] - bg[0]),
      Math.abs(data[i + 1] - bg[1]),
      Math.abs(data[i + 2] - bg[2]),
    );
    if (dist <= 40) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).jpeg({ quality: 92 }).toBuffer();
}

async function sharpenLogo(bytes: Buffer) {
  return sharp(bytes).rotate().sharpen({ sigma: 1.2 }).jpeg({ quality: 92 }).toBuffer();
}

export async function editLogo(mode: LogoToolMode, upload: ReturnType<typeof parseLogoUpload>) {
  try {
    return await editLogoWithGemini(mode, upload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!message.includes("Gemini’s image filter blocked")) throw err;
    const bytes = mode === "remove" ? await knockOutLightBackground(upload.bytes) : await sharpenLogo(upload.bytes);
    return {
      mimeType: "image/jpeg",
      data: bytes.toString("base64"),
      note:
        mode === "remove"
          ? "Gemini blocked this file. This is a local cutout of the light background, not an image from Gemini."
          : "Gemini blocked this file. This is a local sharpen, not an image from Gemini.",
    };
  }
}

export async function editLogoWithGemini(mode: LogoToolMode, upload: ReturnType<typeof parseLogoUpload>) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Add GEMINI_API_KEY to .env and restart the API. The image model needs billing on that key.");
  }

  const cleaned = await sharp(upload.bytes).rotate().jpeg({ quality: 92 }).toBuffer();
  const meta = await sharp(cleaned).metadata();
  const aspect = closestAspect(meta.width ?? 1, meta.height ?? 1);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { type: "text", text: PROMPTS[mode] },
        { type: "image", mime_type: "image/jpeg", data: cleaned.toString("base64") },
      ],
      safety_settings: [
        { type: "harassment", threshold: "off" },
        { type: "hate_speech", threshold: "off" },
        { type: "sexually_explicit", threshold: "off" },
        { type: "dangerous_content", threshold: "off" },
      ],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: aspect,
        image_size: "1K",
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const raw = await response.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(errorMessage(body, response.status));
  }

  const result = extractResult(body);
  if (!result.image) {
    throw new Error(result.note || "Gemini did not return an image.");
  }
  return result.image;
}
