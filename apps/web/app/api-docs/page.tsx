export default function ApiDocsPage() {
  return (
    <div className="flex-1 hp-bg flex flex-col px-8 pb-8">
      <div className="flex justify-center py-12">
        <div className="flex flex-col gap-4" id="logo-container">
          <h1 className="w-full text-gradient text-4xl sm:text-5xl font-sans font-semibold tracking-tight text-base-content">
            polypad
          </h1>
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-350 flex-1 rounded-2xl overflow-hidden flex flex-col"
        style={{ padding: 60, background: "rgba(10, 5, 40, 0.55)" }}
      >
        <iframe
          src="/api-docs/content"
          className="flex-1 w-full rounded-xl"
          style={{ border: "none" }}
          title="Polypad API Reference"
        />
      </div>
    </div>
  );
}
