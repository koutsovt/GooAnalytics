import type { ReportOutput } from "@/lib/types/brief";

export interface ChannelFormatter {
  format(data: ReportOutput): Promise<string>;
}

export interface FormattedReport {
  channel: "email" | "whatsapp" | "slack" | "json";
  content: string;
}
