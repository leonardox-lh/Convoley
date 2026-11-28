import { useState } from "react";

export type ShareImageStatus = "idle" | "generating" | "ready";

/**
 * Shares a generated PNG with the phone's share sheet, or downloads it where files can't be
 * shared (desktop). The image is built on the server and can take a few seconds; by then the
 * browser may no longer link the share to the tap and blocks it. In that case the image is kept
 * and the button turns "ready", so the next tap shares it right away.
 */
export function useShareImage(url: string, fileName: string, text?: string) {
  const [status, setStatus] = useState<ShareImageStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);

  async function share() {
    setFailed(false);
    let image = file;
    try {
      if (!image) {
        setStatus("generating");
        image = await fetchImage(url, fileName);
      }
      await deliver(image, text);
      setFile(null);
      setStatus("idle");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      // Closing the share sheet is not a failure.
      if (name === "AbortError") {
        setFile(null);
        setStatus("idle");
        return;
      }
      if (name === "NotAllowedError" && image && !file) {
        setFile(image);
        setStatus("ready");
        return;
      }
      setFile(null);
      setStatus("idle");
      setFailed(true);
    }
  }

  return { status, failed, share };
}

async function fetchImage(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  return new File([await response.blob()], fileName, { type: "image/png" });
}

async function deliver(file: File, text?: string): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  // Revoked on the next tick: revoking right away can cancel the download.
  setTimeout(() => URL.revokeObjectURL(link.href));
}

/** True on phones whose share sheet takes images (desktop browsers usually don't). */
export function canShareImages(): boolean {
  const probe = new File([], "probe.png", { type: "image/png" });
  return navigator.canShare?.({ files: [probe] }) ?? false;
}
