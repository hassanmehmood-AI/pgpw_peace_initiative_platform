type ImagePlaceholderProps = {
  icon?: string;
  label?: string;
  className?: string;
};

/**
 * Stands in for the mockups' photographic imagery, which is hotlinked to
 * third-party AI-preview URLs (lh3.googleusercontent.com) that aren't ours to
 * depend on. The halftone/grayscale treatment already fits the "Radical
 * Neutrality" brutalist aesthetic, so this isn't just a fallback.
 */
export function ImagePlaceholder({
  icon = "image",
  label,
  className = "",
}: ImagePlaceholderProps) {
  return (
    <div
      className={`halftone-bg flex items-center justify-center border border-outline-variant bg-surface-container-high text-on-surface-variant ${className}`}
    >
      <div className="flex flex-col items-center gap-2 opacity-60">
        <span className="material-symbols-outlined text-[40px]">{icon}</span>
        {label && <span className="font-caption text-caption">{label}</span>}
      </div>
    </div>
  );
}
