import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves `?url` to a hashed asset URL for the worker bundle.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PageText } from '@sovereign/shared'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

/**
 * Extract per-page text from raw PDF bytes using pdfjs-dist's web worker.
 * Runs entirely in the renderer process — bytes never leave the device.
 *
 * Items are joined respecting `hasEOL` so addresses that pdfjs split across
 * adjacent items don't get fractured by stray whitespace. Even so, a long
 * 0x… can still land on two lines; the orchestrator's regex sweep also
 * scans a whitespace-stripped variant to catch that case.
 *
 * Throws if the bytes are not a valid PDF or if the worker fails to load.
 */
export async function extractPdfTextFromBytes(
  bytes: Uint8Array
): Promise<PageText[]> {
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise
  const pages: PageText[] = []
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      let text = ''
      for (const it of content.items) {
        if (!('str' in it)) continue
        text += it.str
        if ((it as { hasEOL?: boolean }).hasEOL) text += '\n'
      }
      pages.push({ pageNum, text })
      page.cleanup()
    }
  } finally {
    await doc.destroy()
  }
  return pages
}

/** Convenience for drag-drop, where we still receive a File. */
export async function extractPdfText(file: File): Promise<PageText[]> {
  const buf = await file.arrayBuffer()
  return extractPdfTextFromBytes(new Uint8Array(buf))
}
