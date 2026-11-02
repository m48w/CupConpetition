/** 表示用ロゴの最大サイズ（縦・横の大きい方）。画面では最大でも 128px 程度で表示する。 */
export const LOGO_MAX_SIZE = 256;

export interface EncodedImage {
  contentType: string;
  dataBase64: string;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

/** 縮小後の縦横。小さい画像は大きくしない。 */
export function fitWithin(width: number, height: number, max = LOGO_MAX_SIZE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function original(file: File): Promise<EncodedImage> {
  return {
    contentType: file.type,
    dataBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
  };
}

/**
 * アップロード前にロゴを小さくする（最大 256px、WebP）。
 * Worker では画像を縮小できないので、ブラウザで行う。
 * 縮小できない・小さくならない場合は元の画像をそのまま使う。
 */
export async function shrinkLogo(file: File): Promise<EncodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return original(file);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    // WebP を作れないブラウザは PNG を返すことがある。サーバーが受け付ける形式だけ使う。
    if (!blob || !["image/webp", "image/png", "image/jpeg"].includes(blob.type)) {
      return original(file);
    }
    if (blob.size >= file.size) return original(file);
    return {
      contentType: blob.type,
      dataBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  } catch {
    return original(file);
  }
}
