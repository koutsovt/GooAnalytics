import type { ChannelFormatter } from "@/lib/formatters/types";
import type { ReportOutput } from "@/lib/types/brief";

export class JsonFormatter implements ChannelFormatter {
  async format(data: ReportOutput): Promise<string> {
    if (!data) {
      throw new Error("No data provided to JSON formatter");
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error(`Failed to stringify report data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
