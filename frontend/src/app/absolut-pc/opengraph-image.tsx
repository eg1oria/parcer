import { ImageResponse } from "next/og";

export const alt = "AbsolutPc — компьютеры, комплектующие и ремонт в Алматы";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at 18% 18%, rgba(79, 209, 255, 0.3), transparent 24%), radial-gradient(circle at 84% 16%, rgba(255, 194, 75, 0.28), transparent 18%), linear-gradient(135deg, #07111f 0%, #0f1b2e 50%, #09101d 100%)",
          color: "#eaf2ff",
          padding: "56px",
          position: "relative",
          fontFamily:
            '"Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 28,
            borderRadius: 34,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "14px 22px",
                background: "rgba(255,255,255,0.04)",
                fontSize: 20,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#7ee0ff",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#4fd1ff",
                }}
              />
              Алматы • premium tech store
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
                fontSize: 24,
                color: "#ffc24b",
              }}
            >
              <span>5.0 рейтинг в 2GIS</span>
              <span style={{ color: "#9ab0ca", fontSize: 18 }}>Навои, 156 • Пн–Пт 10:30–19:00</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 48 }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
              <div
                style={{
                  fontSize: 82,
                  lineHeight: 0.94,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                AbsolutPc
              </div>
              <div
                style={{
                  marginTop: 24,
                  fontSize: 42,
                  lineHeight: 1.12,
                  color: "#dce7f8",
                }}
              >
                Компьютеры, комплектующие, мониторы и ремонт без обезличенного маркетплейса.
              </div>
              <div
                style={{
                  marginTop: 28,
                  display: "flex",
                  gap: 16,
                  fontSize: 22,
                  color: "#a9bfd9",
                }}
              >
                <span>Подбор под задачу</span>
                <span>•</span>
                <span>Рассрочка</span>
                <span>•</span>
                <span>Доставка</span>
                <span>•</span>
                <span>Гарантия</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: 300,
                borderRadius: 36,
                border: "1px solid rgba(255,255,255,0.1)",
                background:
                  "linear-gradient(180deg, rgba(79,209,255,0.14), rgba(255,255,255,0.04))",
                padding: 28,
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: 244,
                  height: 150,
                  borderRadius: 28,
                  background:
                    "radial-gradient(circle at top, rgba(79,209,255,0.4), transparent 35%), linear-gradient(180deg, #17283f, #0b1525)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
              <div
                style={{
                  marginTop: 24,
                  fontSize: 28,
                  color: "#eaf2ff",
                  lineHeight: 1.25,
                }}
              >
                Продажа техники + сервис в одном сильном бренде.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
