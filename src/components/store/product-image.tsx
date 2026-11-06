"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";

export function ProductImage({ src, alt, sizes, priority = false, className = "" }: { src: string | null | undefined; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-ink-700 to-ink-900 ${className}`}>
        <Package className="h-10 w-10 text-white/15" aria-hidden />
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}
