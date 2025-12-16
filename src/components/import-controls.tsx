"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, RefreshCcw } from "lucide-react";

type ImportResult =
  | { ok: true; parsedCount: number; upserted: number; fileMtimeMs?: number }
  | { ok: false; error: string };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as T;
}

export function ImportControls({
  onImported,
}: {
  onImported?: (result: ImportResult) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | "auto" | "upload" | "sample">(null);
  const [message, setMessage] = useState<string | null>(null);

  const doAuto = async () => {
    setBusy("auto");
    setMessage(null);
    try {
      const result = await postJson<ImportResult & { fileMtimeMs?: number }>(
        "/api/import/auto",
      );
      if (result.ok && typeof result.fileMtimeMs === "number") {
        localStorage.setItem("tally:lastDefaultMtimeMs", String(result.fileMtimeMs));
        localStorage.setItem("tally:lastAutoLoadAt", String(Date.now()));
      }
      onImported?.(result);
      setMessage(
        result.ok
          ? `Imported: ${result.parsedCount.toLocaleString("en-IN")} rows`
          : result.error,
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Auto import failed.";
      setMessage(err);
      onImported?.({ ok: false, error: err });
    } finally {
      setBusy(null);
    }
  };

  const doSample = async () => {
    setBusy("sample");
    setMessage(null);
    try {
      const result = await postJson<ImportResult>("/api/import/sample");
      onImported?.(result);
      setMessage(
        result.ok
          ? `Imported sample: ${result.parsedCount.toLocaleString("en-IN")} rows`
          : result.error,
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sample import failed.";
      setMessage(err);
      onImported?.({ ok: false, error: err });
    } finally {
      setBusy(null);
    }
  };

  const doSampleXlsx = async () => {
    setBusy("sample");
    setMessage(null);
    try {
      const result = await postJson<ImportResult>("/api/import/fixture-xlsx");
      onImported?.(result);
      setMessage(
        result.ok
          ? `Imported sample XLSX: ${result.parsedCount.toLocaleString("en-IN")} rows`
          : result.error,
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sample XLSX import failed.";
      setMessage(err);
      onImported?.({ ok: false, error: err });
    } finally {
      setBusy(null);
    }
  };

  const doUpload = async (file: File) => {
    setBusy("upload");
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/import/upload", { method: "POST", body: form });
      const result = (await res.json()) as ImportResult;
      onImported?.(result);
      setMessage(
        result.ok
          ? `Imported: ${result.parsedCount.toLocaleString("en-IN")} rows`
          : result.error,
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Upload import failed.";
      setMessage(err);
      onImported?.({ ok: false, error: err });
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={disabled} onClick={doAuto}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Load latest export (default path)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/xml,application/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            doUpload(f).finally(() => {
              if (fileInputRef.current) fileInputRef.current.value = "";
            });
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload file (.xlsx/.xml)
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={doSample}>
          <FileText className="mr-2 h-4 w-4" />
          Load sample XML
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={doSampleXlsx}>
          <FileText className="mr-2 h-4 w-4" />
          Load sample XLSX
        </Button>
      </div>
      {message ? (
        <div className={message.includes("failed") ? "text-sm text-rose-600" : "text-sm text-muted-foreground"}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
