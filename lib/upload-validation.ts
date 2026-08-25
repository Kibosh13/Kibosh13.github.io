export type AllowedUpload = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";
  extension: ".jpg" | ".png" | ".webp" | ".gif" | ".pdf";
};

const signatures: Array<AllowedUpload & { matches: (bytes: Uint8Array) => boolean }> = [
  {
    mimeType: "image/jpeg",
    extension: ".jpg",
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mimeType: "image/png",
    extension: ".png",
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mimeType: "image/webp",
    extension: ".webp",
    matches: (bytes) => startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && at(bytes, 8, [0x57, 0x45, 0x42, 0x50]),
  },
  {
    mimeType: "image/gif",
    extension: ".gif",
    matches: (bytes) => startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  },
  {
    mimeType: "application/pdf",
    extension: ".pdf",
    matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
];

export function detectAllowedUpload(bytes: Uint8Array): AllowedUpload | null {
  const match = signatures.find((signature) => signature.matches(bytes));
  return match ? { mimeType: match.mimeType, extension: match.extension } : null;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return at(bytes, 0, signature);
}

function at(bytes: Uint8Array, offset: number, signature: number[]) {
  return bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
}
