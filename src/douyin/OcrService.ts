export type OCRQuery = string | string[];
export type OCRMatchMode = 'any' | 'all';

export interface OCRFindOptions {
  matchMode?: OCRMatchMode;
  useSlim?: boolean;
  caseSensitive?: boolean;
}

export interface OCRBoundsLike {
  centerX: () => number;
  centerY: () => number;
}

export interface OCREntry {
  label: string;
  bounds: OCRBoundsLike;
}

export interface OCRFindResult {
  query: string;
  entry: OCREntry;
}

export class OcrService {
  private hasScreenCapture = false;

  public ocrContains(query: OCRQuery, options: OCRFindOptions = {}): boolean {
    return this.findByOCR(query, options) != null;
  }

  public findByOCR(query: OCRQuery, options: OCRFindOptions = {}): OCRFindResult | null {
    const { matchMode = 'any', useSlim = true, caseSensitive = false } = options;
    const entries = this.detectEntries(useSlim);
    if (!entries.length) {
      return null;
    }

    const keywords = this.normalizeQuery(query, caseSensitive);
    if (!keywords.length) {
      return null;
    }

    if (matchMode === 'all') {
      let firstMatch: OCRFindResult | null = null;
      for (let i = 0; i < keywords.length; i++) {
        const q = keywords[i];
        const hit = this.findFirstEntry(entries, q, caseSensitive);
        if (!hit) {
          return null;
        }
        if (!firstMatch) {
          firstMatch = { query: q, entry: hit };
        }
      }
      return firstMatch;
    }

    for (let i = 0; i < keywords.length; i++) {
      const q = keywords[i];
      const hit = this.findFirstEntry(entries, q, caseSensitive);
      if (hit) {
        return { query: q, entry: hit };
      }
    }

    return null;
  }

  public detectLabels(useSlim = true): string[] {
    const entries = this.detectEntries(useSlim);
    const labels: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      labels.push(entries[i].label);
    }
    return labels;
  }

  private detectEntries(useSlim: boolean): OCREntry[] {
    if (!this.ensureCapturePermission()) {
      return [];
    }

    const img = captureScreen();
    if (!img) {
      return [];
    }

    try {
      const ocrAny = (global as any).ocr;
      const detector = ocrAny?.mlkit?.detect || ocrAny?.paddle?.detect;
      if (!detector) {
        return [];
      }

      const rawResults = detector(img, { useSlim });
      if (!rawResults) {
        return [];
      }

      const arr = Array.from(rawResults as any[]);
      const entries: OCREntry[] = [];

      for (let i = 0; i < arr.length; i++) {
        const item: any = arr[i];
        const label = String(item?.label || '').trim();
        const bounds = item?.bounds as OCRBoundsLike;
        if (!label || !bounds || typeof bounds.centerX !== 'function' || typeof bounds.centerY !== 'function') {
          continue;
        }
        entries.push({ label, bounds });
      }

      return entries;
    } catch (error) {
      console.error('OCR detect error', error);
      return [];
    } finally {
      img.recycle();
    }
  }

  private ensureCapturePermission(): boolean {
    if (this.hasScreenCapture) {
      return true;
    }

    try {
      const ok = requestScreenCapture(false);
      if (!ok) {
        toastLog('需要截图权限来进行 OCR');
        return false;
      }
      this.hasScreenCapture = true;
      return true;
    } catch (error) {
      console.error('requestScreenCapture error', error);
      return false;
    }
  }

  private normalizeQuery(query: OCRQuery, caseSensitive: boolean): string[] {
    const source = Array.isArray(query) ? query : [query];
    const out: string[] = [];

    for (let i = 0; i < source.length; i++) {
      const normalized = String(source[i] || '').trim();
      if (!normalized) {
        continue;
      }
      out.push(caseSensitive ? normalized : normalized.toLowerCase());
    }

    return out;
  }

  private findFirstEntry(entries: OCREntry[], query: string, caseSensitive: boolean): OCREntry | null {
    for (let i = 0; i < entries.length; i++) {
      const rawLabel = entries[i].label;
      const label = caseSensitive ? rawLabel : rawLabel.toLowerCase();
      if (label.indexOf(query) >= 0) {
        return entries[i];
      }
    }
    return null;
  }
}
