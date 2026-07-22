"use client";

import { useEffect } from "react";

// Full-screen click-to-preview overlay for a post's attached image. Shared
// between Feed and Profile so clicking any post image behaves the same way.
export function ImagePreviewModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        onClick={onClose}
        aria-label="Close preview"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- externally-hosted user upload, not a static/optimizable asset */}
      <img
        src={imageUrl}
        alt="Full screen preview"
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
