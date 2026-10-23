/**
 * Supabase Network & Data Flow Inspector
 * Tüm gidiş-geliş verilerini, REST isteklerini, Storage ve Auth trafiğini
 * ölçer, loglar ve metrikleri toplar.
 */

export type SupabaseLogEntry = {
  id: number;
  timestamp: string;
  method: string;
  endpoint: string;
  category: 'REST' | 'AUTH' | 'STORAGE' | 'RPC' | 'REALTIME' | 'OTHER';
  status?: number;
  statusText?: string;
  durationMs?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  isError: boolean;
};

class SupabaseTelemetry {
  private logs: SupabaseLogEntry[] = [];
  private maxLogs = 100;
  private reqCounter = 0;
  private totalRequests = 0;
  private successCount = 0;
  private errorCount = 0;
  private totalDurationMs = 0;

  private categorize(url: string): SupabaseLogEntry['category'] {
    if (url.includes('/rest/v1/rpc')) return 'RPC';
    if (url.includes('/rest/v1/')) return 'REST';
    if (url.includes('/auth/v1/')) return 'AUTH';
    if (url.includes('/storage/v1/')) return 'STORAGE';
    if (url.includes('/realtime/v1/')) return 'REALTIME';
    return 'OTHER';
  }

  private cleanEndpoint(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      return url.split('.co')?.[1] || url;
    }
  }

  public async interceptFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const id = ++this.reqCounter;
    this.totalRequests++;
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as any).method : 'GET');
    const category = this.categorize(url);
    const endpoint = this.cleanEndpoint(url);

    // Request payload'u güvenle ayrıştır
    let parsedReqBody: any = null;
    if (init?.body) {
      if (typeof init.body === 'string') {
        try {
          parsedReqBody = JSON.parse(init.body);
        } catch {
          parsedReqBody = init.body.length > 200 ? `${init.body.slice(0, 200)}...` : init.body;
        }
      } else {
        parsedReqBody = '[Binary/FormData Payload]';
      }
    }

    const logEntry: SupabaseLogEntry = {
      id,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      method,
      endpoint,
      category,
      requestBody: parsedReqBody,
      isError: false,
    };

    // 📤 İstek Çıkış Logu
    console.log(
      `🌐 [Supabase OUT #${id}] [${category}] ${method} ${endpoint}`,
      parsedReqBody ? '\n  📦 Payload:' : '',
      parsedReqBody ?? ''
    );

    try {
      const response = await fetch(input, init);
      const durationMs = Date.now() - startTime;
      this.totalDurationMs += durationMs;

      logEntry.status = response.status;
      logEntry.statusText = response.statusText;
      logEntry.durationMs = durationMs;
      logEntry.isError = !response.ok;

      // Yanıtı güvenle oku (stream'i bozmamak için clone() kullan)
      let parsedResBody: any = null;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        if (text) {
          try {
            parsedResBody = JSON.parse(text);
          } catch {
            parsedResBody = text.length > 200 ? `${text.slice(0, 200)}...` : text;
          }
        }
      } catch (cloneErr) {
        parsedResBody = '[Okunamayan yanıt akışı]';
      }

      logEntry.responseBody = parsedResBody;

      if (response.ok) {
        this.successCount++;
        // 📥 Başarılı Yanıt Logu (özet)
        console.log(
          `✅ [Supabase IN #${id}] ${response.status} ${response.statusText} (${durationMs}ms) [${category}] ${endpoint}`
        );
      } else {
        this.errorCount++;
        logEntry.error = parsedResBody?.message || response.statusText;
        // ❌ Hata Yanıt Logu
        console.warn(
          `❌ [Supabase HATA #${id}] ${response.status} (${durationMs}ms) [${category}] ${endpoint}`,
          '\n  ⚠️ Hata Detayı:',
          parsedResBody ?? response.statusText
        );
      }

      this.addLog(logEntry);
      return response;
    } catch (networkError: any) {
      const durationMs = Date.now() - startTime;
      this.errorCount++;
      logEntry.durationMs = durationMs;
      logEntry.isError = true;
      logEntry.error = networkError?.message || 'Ağ bağlantı hatası';

      console.error(
        `🚨 [Supabase BAĞLANTI HATASI #${id}] (${durationMs}ms) [${category}] ${endpoint}:`,
        networkError?.message
      );

      this.addLog(logEntry);
      throw networkError;
    }
  }

  private addLog(entry: SupabaseLogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  /**
   * Toplanan metriklerin özetini döner
   */
  public getStats() {
    const avgDuration =
      this.totalRequests > 0
        ? Math.round(this.totalDurationMs / this.totalRequests)
        : 0;

    return {
      totalRequests: this.totalRequests,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate:
        this.totalRequests > 0
          ? `${Math.round((this.successCount / this.totalRequests) * 100)}%`
          : '100%',
      avgLatencyMs: avgDuration,
      recentLogs: this.logs.slice(0, 15),
    };
  }

  /**
   * Konsola detaylı telemetry raporu basar
   */
  public printSummary() {
    const stats = this.getStats();
    console.log(
      `\n📊 ═══════ SUPABASE VERİ AKIŞI RAPORU ═══════\n` +
      `  Toplam İstek : ${stats.totalRequests}\n` +
      `  Başarılı     : ${stats.successCount}\n` +
      `  Hatalı       : ${stats.errorCount}\n` +
      `  Başarı Oranı : ${stats.successRate}\n` +
      `  Ortalama Hız : ${stats.avgLatencyMs} ms\n` +
      `═══════════════════════════════════════════════\n`
    );
  }
}

export const supabaseTelemetry = new SupabaseTelemetry();
