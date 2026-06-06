import { cn } from "@/lib/utils";

const FILLS = {
  white: "#ffffff",
  cream: "#f4f6fa",
  navy: "#0a1220",
  surface: "#0a1220"
};

/** فاصل موجي ناعم بين أقسام الهبوط الداكنة والفاتحة */
export default function LandingWaveDivider({
  fill = "white",
  flip = false,
  className = "",
  height = "h-14 md:h-20"
}) {
  const fillColor = FILLS[fill] || fill;

  return (
    <div
      className={cn("pointer-events-none relative -mt-px w-full overflow-hidden leading-[0]", height, className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 h-full w-full", flip && "rotate-180")}
      >
        <path
          fill={fillColor}
          d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
        />
      </svg>
    </div>
  );
}
