"use client";

export default function FileViewerModal({
  url,
  contentType,
  filename,
  onClose,
}: {
  url: string;
  contentType: string | null;
  filename?: string | null;
  onClose: () => void;
}) {
  const isImage = (contentType ?? "").startsWith("image/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-cay-black/10 px-4 py-3">
          <span className="truncate text-sm font-medium text-cay-black">{filename ?? "Factura"}</span>
          <div className="flex shrink-0 items-center gap-4">
            <a href={url} download={filename ?? undefined} className="text-xs font-medium text-cay-red hover:underline">
              Descargar
            </a>
            <button type="button" onClick={onClose} className="text-sm text-cay-ink/60 hover:text-cay-black">
              Cerrar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-cay-paper p-2">
          {isImage ? (
            <img src={url} alt={filename ?? "Factura"} className="mx-auto max-w-full" />
          ) : (
            <iframe
              src={url}
              title={filename ?? "Factura"}
              className="h-full w-full rounded border border-cay-black/10 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
