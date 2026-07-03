/**
 * Render an uploaded image onto a fixed 256x256 canvas at the given zoom and
 * return a compressed JPEG data URL, ready to persist as an account avatar.
 */
export function cropAvatar(src: string, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("canvas_unavailable"));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      const baseScale = Math.max(size / image.width, size / image.height) * scale;
      const drawWidth = image.width * baseScale;
      const drawHeight = image.height * baseScale;
      context.drawImage(image, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => reject(new Error("image_load_failed"));
    image.src = src;
  });
}
