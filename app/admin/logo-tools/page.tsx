import { LogoTools } from "@/components/LogoTools";

export default function LogoToolsPage() {
  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Artwork</p>
          <h1>Logo tools</h1>
          <p className="muted">
            Send a logo to Gemini to knock out the background or sharpen it, then preview and download the image Gemini returns.
            Set <code>GEMINI_API_KEY</code> in <code>.env</code> and restart the API before the first run.
          </p>
        </div>
      </div>
      <LogoTools />
    </div>
  );
}
