"use client";

import { useState } from "react";

// Unlisted-but-public walkthrough. Kept as an id, not a URL: the embed URL and
// the domain are built below, so there is one place to change either.
const VIDEO_ID = "QRUixu_Hk6s";

// Cover first, player only on click.
//
// A YouTube iframe pulls ~1MB of player code and opens connections to
// youtube.com and ytimg.com. Embedding it up front would put all of that on the
// homepage's critical path for a video most visitors never play, so the page
// ships one local image instead — no third party is contacted until the click
// happens. The box is already 16:9, the player's own shape, so swapping the
// cover for the iframe shifts nothing on the page.
export function PromoVideo({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="promo-video">
      {playing ? (
        <iframe
          className="promo-frame"
          // youtube-nocookie: no tracking cookie is set unless playback starts,
          // which is the same choice we made everywhere else on the site.
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button className="promo-cover" type="button" onClick={() => setPlaying(true)} aria-label={label}>
          {/* Two files, one download: the browser takes the first format it can
              decode. Both are re-encoded from promo-materials/promo_tile.png
              (1571x1001, 1.0 MB) with ffmpeg —
                -c:v libsvtav1 -crf 20 -preset 6 -pix_fmt yuv444p -> 21.6 KB
                -c:v mjpeg -q:v 3                                   -> 79 KB
              The JPEG is only for browsers without AVIF (both measure the same
              SSIM, 0.995). Decorative: the button already carries the label. */}
          <picture>
            <source srcSet="/promo_tile.avif" type="image/avif" />
            <img src="/promo_tile.jpg" alt="" width={1571} height={1001} loading="lazy" decoding="async" />
          </picture>
          <span className="promo-play" aria-hidden="true">▶</span>
        </button>
      )}
    </div>
  );
}
