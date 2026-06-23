import type { ChannelFormatter } from "@/lib/formatters/types";
import type { ReportOutput } from "@/lib/types/brief";

export class SlackFormatter implements ChannelFormatter {
  async format(data: ReportOutput): Promise<string> {
    const { summary, actions, subjectLine } = data;

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: `📊 ${subjectLine}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Summary*\n${summary}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💡 Recommended Actions*\n` + (actions ? actions.map((a, i) => `${i + 1}. ${a}`).join("\n") : ""),
        },
      },
    ];

    return JSON.stringify({ blocks }, null, 2);
  }
}
