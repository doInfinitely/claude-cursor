"use client";

export default function SlowVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className={className}
      ref={(el) => { if (el) el.playbackRate = 0.75; }}
    />
  );
}
