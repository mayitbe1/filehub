export function saveFileFromBytes(
  blob: Blob,
  fileName: string,
  mimeType = "application/octet-stream",
) {
  // Generate a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a hidden anchor element
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName; // Specify the file name

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
