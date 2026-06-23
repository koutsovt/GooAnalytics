import type { ChannelFormatter } from "@/lib/formatters/types";
import type { ReportOutput } from "@/lib/types/brief";

export class WhatsAppFormatter implements ChannelFormatter {
  async format(data: ReportOutput): Promise<string> {
    const { summary, actions, subjectLine } = data;

    let message = `*📊 ${subjectLine}*\n\n`;
    message += `*Summary*\n${summary}\n\n`;

    message += "*💡 Actions*\n";
    if (actions) {
      actions.forEach((action, i) => {
        message += `${i + 1}. ${action}\n`;
      });
    }

    return message;
  }
}
