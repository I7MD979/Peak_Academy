export const metadata = {
  title: "Peak Academy — قريباً",
  description: "منصة الثانوية العامة المصرية — قريباً"
};

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1b2d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
        color: "#fff",
        textAlign: "center",
        padding: "20px",
        gap: "16px"
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#f5721a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 900,
          color: "#fff",
          marginBottom: 8
        }}
      >
        P
      </div>

      <h1
        style={{
          fontSize: "clamp(32px, 6vw, 56px)",
          fontWeight: 900,
          color: "#f5721a",
          margin: 0
        }}
      >
        Peak Academy
      </h1>

      <p
        style={{
          fontSize: "clamp(16px, 2.5vw, 22px)",
          color: "#8da3bc",
          margin: 0
        }}
      >
        منصة الثانوية العامة المصرية
      </p>

      <div
        style={{
          marginTop: 8,
          padding: "8px 24px",
          borderRadius: 999,
          background: "rgba(245, 114, 26, 0.12)",
          border: "1px solid rgba(245, 114, 26, 0.3)",
          color: "#ffa855",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1
        }}
      >
        قريباً — Coming Soon
      </div>

      <p style={{ fontSize: 13, color: "#334d66", marginTop: 24 }}>peak-academy.net</p>
    </main>
  );
}
