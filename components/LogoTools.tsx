"use client";

import { useState } from "react";

type Mode = "remove" | "enhance";

type Result = {
  mode: Mode;
  mimeType: string;
  url: string;
  note?: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp";

function extension(mimeType: string) {
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

export function LogoTools() {
  const [fileName, setFileName] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | null) => {
    setResult(null);
    setError(null);
    if (!file) {
      setOriginal(null);
      setFileName("");
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setOriginal(null);
      setFileName("");
      setError("Upload a PNG, JPG, or WebP logo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setOriginal(null);
      setFileName("");
      setError("That file is larger than 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOriginal(typeof reader.result === "string" ? reader.result : null);
      setFileName(file.name);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const run = async (mode: Mode) => {
    if (!original || busy) return;
    setBusy(mode);
    setError(null);
    try {
      const response = await fetch("/api/logo-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, image: original }),
      });
      const payload = (await response.json()) as { mimeType?: string; data?: string; error?: string; note?: string };
      if (!response.ok || !payload.data || !payload.mimeType) {
        setError(payload.error || "Gemini did not return an image.");
        return;
      }
      setResult({
        mode,
        mimeType: payload.mimeType,
        url: `data:${payload.mimeType};base64,${payload.data}`,
        note: payload.note,
      });
    } catch {
      setError("The request did not finish. Check that the API is running.");
    } finally {
      setBusy(null);
    }
  };

  const downloadName =
    result?.mode === "enhance" ? `logo-enhanced.${extension(result.mimeType)}` : `logo-no-background.${extension(result?.mimeType ?? "image/png")}`;

  return (
    <div className="admin-card logo-tools">
      <label className="logo-tools__file">
        <span>Logo file</span>
        <input
          type="file"
          accept={ACCEPT}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {fileName ? <p className="tiny">{fileName}</p> : null}

      <div className="logo-tools__actions">
        <button type="button" className="btn-primary" disabled={!original || !!busy} onClick={() => run("remove")}>
          {busy === "remove" ? "Removing background…" : "Remove background"}
        </button>
        <button type="button" className="btn-ghost" disabled={!original || !!busy} onClick={() => run("enhance")}>
          {busy === "enhance" ? "Enhancing…" : "Enhance image"}
        </button>
      </div>
      <p className="tiny">
        Each run calls Gemini Nano Banana and uses the billed image quota, about a few cents at 1K.
        Background removal comes back on white, because Gemini redraws the logo instead of cutting a transparent PNG.
      </p>
      {error ? <p className="warn">{error}</p> : null}

      <div className="logo-tools__compare">
        <figure>
          <figcaption>Original</figcaption>
          <div className="logo-tools__frame">
            {original ? <img src={original} alt="Uploaded logo" /> : <span className="muted">No file yet</span>}
          </div>
        </figure>
        <figure>
          <figcaption>{result?.note ? "Local result" : "Gemini result"}</figcaption>
          {result?.note ? <p className="warn">{result.note}</p> : null}
          <div className="logo-tools__frame logo-tools__frame--check">
            {result ? (
              <img src={result.url} alt={result.note ? "Local cutout of the logo" : "Image returned by Gemini"} />
            ) : (
              <span className="muted">Run a tool to see it here</span>
            )}
          </div>
          {result ? (
            <a className="btn-primary" href={result.url} download={downloadName}>
              Download
            </a>
          ) : null}
        </figure>
      </div>
    </div>
  );
}
