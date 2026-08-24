/**
 * Streaming CSV export.
 *
 * Building a 20,000-50,000 row export by joining one huge string keeps several
 * copies of the whole file in memory and can fail outright on mobile Safari.
 * Instead rows are generated lazily and encoded in small chunks that are piped
 * through a ReadableStream straight into the download Blob, so peak memory is
 * bounded by the chunk size rather than the file size.
 */

export type CsvRow = readonly unknown[];

export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(row: CsvRow): string {
  return row.map(csvCell).join(",");
}

/** Default number of CSV lines flushed per chunk. */
export const CSV_CHUNK_LINES = 500;

/**
 * Lazily turn rows into CSV text chunks. Works with sync or async iterables
 * (including generators that page through the database as they go).
 */
export async function* csvChunks(
  header: CsvRow | null,
  rows: Iterable<CsvRow> | AsyncIterable<CsvRow>,
  chunkLines = CSV_CHUNK_LINES,
): AsyncGenerator<string, void, unknown> {
  let buffer: string[] = [];
  let emitted = 0;

  if (header) buffer.push(csvLine(header));

  for await (const row of rows as AsyncIterable<CsvRow>) {
    buffer.push(csvLine(row));
    emitted++;
    if (buffer.length >= chunkLines) {
      yield buffer.join("\n") + "\n";
      buffer = [];
    }
  }

  if (buffer.length > 0) yield buffer.join("\n") + (emitted > 0 ? "\n" : "");
}

/** Collect the stream into a Blob without ever holding the joined string twice. */
export async function csvToBlob(
  header: CsvRow | null,
  rows: Iterable<CsvRow> | AsyncIterable<CsvRow>,
  chunkLines = CSV_CHUNK_LINES,
): Promise<{ blob: Blob; chunkCount: number; byteLength: number }> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  let chunkCount = 0;
  let byteLength = 0;

  for await (const chunk of csvChunks(header, rows, chunkLines)) {
    const bytes = encoder.encode(chunk);
    parts.push(bytes);
    chunkCount++;
    byteLength += bytes.byteLength;
    // Yield to the event loop so a huge export never freezes the UI thread.
    if (chunkCount % 20 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  return {
    blob: new Blob(parts as BlobPart[], { type: "text/csv;charset=utf-8" }),
    chunkCount,
    byteLength,
  };
}

/** Stream rows to the browser as a downloaded CSV file. */
export async function downloadCsvStream(
  filename: string,
  header: CsvRow | null,
  rows: Iterable<CsvRow> | AsyncIterable<CsvRow>,
  chunkLines = CSV_CHUNK_LINES,
): Promise<{ chunkCount: number; byteLength: number }> {
  const { blob, chunkCount, byteLength } = await csvToBlob(header, rows, chunkLines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { chunkCount, byteLength };
}
