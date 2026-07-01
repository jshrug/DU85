import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { COLORS } from "../../constants.js";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const PAGE_WIDTH = Math.min(window.innerWidth - 32, 720);

export default function PdfViewerModal({ url, filename, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState("");

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(4,3,1,0.94)" }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(196,150,42,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70 truncate">
          {filename}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          {numPages > 1 && (
            <div className="flex items-center gap-3 text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="disabled:opacity-30"
                style={{ color: COLORS.champagne }}
              >
                ‹
              </button>
              <span>{pageNumber} / {numPages}</span>
              <button
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="disabled:opacity-30"
                style={{ color: COLORS.champagne }}
              >
                ›
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {loadError ? (
          <p className="text-sm text-white/50 mt-10">{loadError}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setLoadError("Could not load this PDF.")}
            loading={<p className="text-sm text-white/40 mt-10">Loading…</p>}
          >
            <Page pageNumber={pageNumber} width={PAGE_WIDTH} />
          </Document>
        )}
      </div>
    </div>
  );
}
