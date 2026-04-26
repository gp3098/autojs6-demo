export type OCRQuery = string | RegExp | Array<string | RegExp>;
export type OCRMatchMode = "any" | "all";

export interface OCRFindOptions {
  matchMode?: OCRMatchMode;
  useSlim?: boolean;
  caseSensitive?: boolean;
  exactMatch?: boolean;
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
  query: string | RegExp;
  entry: OCREntry;
}

export class OcrService {
  private hasScreenCapture = false;
  private captureBackoffUntil = 0;
  private lastCaptureErrorAt = 0;
  private consecutiveCaptureFailures = 0;
  private inTick = false;
  private tickCacheBySlim: { [key: string]: OCREntry[] | null } = {};
  private lastStatusLogAt = 0;

  public beginTick() {
    this.inTick = true;
    this.tickCacheBySlim = {};
  }

  public endTick() {
    this.inTick = false;
    this.tickCacheBySlim = {};
  }

  public ocrContains(query: OCRQuery, options: OCRFindOptions = {}): boolean {
    return this.findByOCR(query, options) != null;
  }

  public findByOCR(query: OCRQuery, options: OCRFindOptions = {}): OCRFindResult | null {
    const {
      matchMode = "any",
      useSlim = true,
      caseSensitive = false,
      exactMatch = false,
    } = options;
    const entries = this.detectEntries(useSlim);
    if (!entries.length) {
      return null;
    }

    const keywords = this.normalizeQuery(query, caseSensitive);
    if (!keywords.length) {
      return null;
    }

    if (matchMode === "all") {
      let firstMatch: OCRFindResult | null = null;
      for (const q of keywords) {
        const hit = this.findFirstEntry(entries, q, caseSensitive, exactMatch);
        if (!hit) {
          return null;
        }
        if (!firstMatch) {
          firstMatch = { query: q, entry: hit };
        }
      }
      return firstMatch;
    }

    for (const q of keywords) {
      const hit = this.findFirstEntry(entries, q, caseSensitive, exactMatch);
      if (hit) {
        return { query: q, entry: hit };
      }
    }

    return null;
  }

  public detectLabels(useSlim = true): string[] {
    const entries = this.detectEntries(useSlim);
    const labels: string[] = [];
    for (const element of entries) {
      labels.push(element.label);
    }
    return labels;
  }

  public detectEntries(useSlim: boolean): OCREntry[] {
    const cacheKey = useSlim ? "slim" : "full";
    if (this.inTick && Object.prototype.hasOwnProperty.call(this.tickCacheBySlim, cacheKey)) {
      return this.tickCacheBySlim[cacheKey] || [];
    }

    const result = this.detectEntriesInternal(useSlim);
    if (this.inTick) {
      this.tickCacheBySlim[cacheKey] = result;
    }
    return result;
  }

  private detectEntriesInternal(useSlim: boolean): OCREntry[] {
    if (!this.ensureCapturePermission()) {
      return [];
    }

    const now = Date.now();
    if (now < this.captureBackoffUntil) {
      return [];
    }

    let img: any = null;
    try {
      img = captureScreen();
      if (!img) {
        return [];
      }
      this.consecutiveCaptureFailures = 0;

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

      for (const element of arr) {
        const item: any = element;
        const label = opencc.t2s(String(item?.label || "").trim());
        const bounds = item?.bounds as OCRBoundsLike;
        if (
          !label ||
          !bounds ||
          typeof bounds.centerX !== "function" ||
          typeof bounds.centerY !== "function"
        ) {
          continue;
        }
        entries.push({ label, bounds });
      }

      if (now - this.lastStatusLogAt > 4000) {
        console.log(
          `[OcrService] Screen captured successfully, detected ${entries.length} text entries.`,
          entries,
          rawResults
        );
        this.lastStatusLogAt = now;
      }

      return entries;
    } catch (error) {
      this.consecutiveCaptureFailures += 1;
      // 截图出错（如横竖屏切换），立即重置权限以便重新申请正确方向的截图
      this.hasScreenCapture = false;
      // 退避时间缩短，确保能快速从横竖屏切换中恢复
      this.captureBackoffUntil = Date.now() + 1500;
      const nowTs = Date.now();
      if (nowTs - this.lastCaptureErrorAt > 4000) {
        console.error(
          `[OcrService] Capture screen error (consecutive ${this.consecutiveCaptureFailures} times):`,
          error
        );
        this.lastCaptureErrorAt = nowTs;
      }
      return [];
    } finally {
      if (img) {
        img.recycle();
      }
    }
  }

  private ensureCapturePermission(): boolean {
    if (this.hasScreenCapture) {
      return true;
    }

    try {
      // 根据当前宽高决定申请横屏还是竖屏截图
      const w = Number((device as any)?.width || 0);
      const h = Number((device as any)?.height || 0);
      const isLandscape = w > h;

      const ok = requestScreenCapture(isLandscape);
      if (!ok) {
        toastLog("需要截图权限来进行 OCR");
        this.captureBackoffUntil = Date.now() + 4000;
        return false;
      }
      this.hasScreenCapture = true;
      this.consecutiveCaptureFailures = 0;
      return true;
    } catch (error) {
      console.error("requestScreenCapture error", error);
      this.captureBackoffUntil = Date.now() + 8000;
      return false;
    }
  }

  private normalizeQuery(query: OCRQuery, caseSensitive: boolean): (string | RegExp)[] {
    const source = Array.isArray(query) ? query : [query];
    const out: (string | RegExp)[] = [];

    for (const q of source) {
      if (q instanceof RegExp) {
        out.push(q);
        continue;
      }
      const normalized = String(q || "").trim();
      if (!normalized) {
        continue;
      }
      out.push(caseSensitive ? normalized : normalized.toLowerCase());
    }

    return out;
  }

  private findFirstEntry(
    entries: OCREntry[],
    query: string | RegExp,
    caseSensitive: boolean,
    exactMatch: boolean
  ): OCREntry | null {
    for (const element of entries) {
      const rawLabel = element.label;
      if (query instanceof RegExp) {
        if (query.test(rawLabel)) {
          return element;
        }
      } else {
        const label = caseSensitive ? rawLabel : rawLabel.toLowerCase();
        if (exactMatch) {
          if (label === query) {
            return element;
          }
        } else {
          if (label.indexOf(query) >= 0) {
            return element;
          }
        }
      }
    }
    return null;
  }
}
