import { ImageResponse } from "next/og";

export const alt = "Peak Academy | أكاديمية الذروة";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://peak-academy.net";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${baseUrl}/brand/peak_academy_professional_logo.png`}
          alt="Peak Academy"
          width={720}
          height={220}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
