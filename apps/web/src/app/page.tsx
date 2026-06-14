import { greeting } from "@otto/core";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <h1>Otto</h1>
      <p>{greeting("there")}</p>
      <p style={{ color: "#666" }}>
        Web companion + Pro backend placeholder. Phase 1 organizer core lives in the mobile app.
      </p>
    </main>
  );
}
