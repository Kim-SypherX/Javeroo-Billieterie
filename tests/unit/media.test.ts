import { describe, expect, it } from "vitest";
import {
  detectVerifiedImageMime,
  MAX_POSTER_SIZE_BYTES,
  validatePosterUpload,
} from "@/modules/media/storage";

describe("Event poster upload validation (magic bytes & size limit)", () => {
  it("reconnaît les en-têtes binaires JPEG, PNG, WebP et AVIF légitimes", () => {
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    const fakeWebp = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    const fakeAvif = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from("ftypavif", "ascii"),
    ]);

    expect(detectVerifiedImageMime(fakeJpeg)).toBe("image/jpeg");
    expect(detectVerifiedImageMime(fakePng)).toBe("image/png");
    expect(detectVerifiedImageMime(fakeWebp)).toBe("image/webp");
    expect(detectVerifiedImageMime(fakeAvif)).toBe("image/avif");
  });

  it("rejette un script SVG/HTML déguisé en image (anti-spoofing)", () => {
    const maliciousSvg = Buffer.from('<svg onload="alert(1)"></svg>', "utf8");
    const result = validatePosterUpload(maliciousSvg);
    expect(result.ok).toBe(false);
  });

  it("rejette une image dépassant la limite de 5 Mo", () => {
    const oversized = Buffer.alloc(MAX_POSTER_SIZE_BYTES + 10);
    oversized[0] = 0xff;
    oversized[1] = 0xd8;
    oversized[2] = 0xff;
    const result = validatePosterUpload(oversized);
    expect(result.ok).toBe(false);
  });
});

