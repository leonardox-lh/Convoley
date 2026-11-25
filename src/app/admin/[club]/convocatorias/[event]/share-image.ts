/**
 * Shares a generated PNG with the phone's share sheet, or downloads it where files can't be
 * shared (desktop). Returns false when it failed; closing the share sheet is not a failure.
 */
export async function shareImage(url: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
    const file = new File([await response.blob()], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    // Revoked on the next tick: revoking right away can cancel the download.
    setTimeout(() => URL.revokeObjectURL(link.href));
    return true;
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError";
  }
}
