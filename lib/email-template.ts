import {
  CircadianInsight,
  CircadianScores,
  ProtocolPlan,
} from "@/types/circadian";

function buildProtocolList(protocol: ProtocolPlan) {
  return protocol.steps
    .map((step) => {
      const actions = step.actions.map((action) => `<li>${action}</li>`).join("");

      return `
        <tr>
          <td style="padding: 0 0 20px 0;">
            <div style="padding: 20px; border: 1px solid #e5ddd0; border-radius: 18px; background: #fffdf8;">
              <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #7d7365;">${step.window}</div>
              <h3 style="margin: 10px 0 10px; font-size: 22px; color: #1f1c18;">${step.title}</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6f665a; line-height: 1.7;">
                ${actions}
              </ul>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildNotes(protocol: ProtocolPlan) {
  return protocol.supportNotes
    .map((note) => `<li style="margin-bottom: 8px;">${note}</li>`)
    .join("");
}

export function buildProtocolEmail(args: {
  insight: CircadianInsight;
  scores: CircadianScores;
  protocol: ProtocolPlan;
}) {
  const subject = `Your 7-day protocol for ${args.insight.primaryBrokenSignal.label}`;

  const text = [
    "Foundational Flow: Your 7-day protocol",
    "",
    `Primary broken signal: ${args.insight.primaryBrokenSignal.label}`,
    `Overall Circadian Score: ${args.scores.overallCircadianScore}`,
    "",
    args.insight.summary,
    "",
    `Focus area: ${args.protocol.focusArea}`,
    args.protocol.rationale,
    "",
    ...args.protocol.steps.flatMap((step) => [
      `${step.window} — ${step.title}`,
      ...step.actions.map((action) => `- ${action}`),
      "",
    ]),
    "Implementation notes:",
    ...args.protocol.supportNotes.map((note) => `- ${note}`),
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f8f4ec;font-family:'Avenir Next','Segoe UI',sans-serif;color:#1f1c18;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ec;padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#fffdf8;border-radius:28px;overflow:hidden;border:1px solid rgba(60,51,41,0.12);">
              <tr>
                <td style="padding:40px 40px 24px;background:linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,231,214,0.92));">
                  <div style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#7d7365;">Foundational Flow</div>
                  <h1 style="margin:16px 0 10px;font-size:40px;line-height:1.05;font-family:'Iowan Old Style','Palatino Linotype',Georgia,serif;color:#1f1c18;">Your 7-day circadian protocol</h1>
                  <p style="margin:0;font-size:16px;line-height:1.8;color:#6f665a;">Your body is not broken. The goal now is to repair one signal cleanly enough that the rest of the system can start to organize around it.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px 12px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0 0 20px 0;">
                        <div style="padding:24px;border-radius:22px;background:#1f1c18;color:#f8f4ec;">
                          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#dcc496;">Primary broken signal</div>
                          <h2 style="margin:12px 0 8px;font-size:32px;font-family:'Iowan Old Style','Palatino Linotype',Georgia,serif;color:#f8f4ec;">${args.insight.primaryBrokenSignal.label}</h2>
                          <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:rgba(248,244,236,0.78);">${args.insight.primaryReason}</p>
                          <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#dcc496;">Overall score: ${args.scores.overallCircadianScore}</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 20px 0;">
                        <div style="padding:20px;border:1px solid #e5ddd0;border-radius:20px;background:#fffdf8;">
                          <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7d7365;">Clinical read</div>
                          <p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:#6f665a;">${args.insight.summary}</p>
                        </div>
                      </td>
                    </tr>
                    ${buildProtocolList(args.protocol)}
                    <tr>
                      <td style="padding:0 0 40px 0;">
                        <div style="padding:20px;border-radius:20px;background:linear-gradient(145deg,rgba(179,145,80,0.12),rgba(255,255,255,0.84));border:1px solid #e5ddd0;">
                          <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7d7365;">Implementation notes</div>
                          <ul style="margin:12px 0 0;padding-left:20px;color:#6f665a;line-height:1.8;">
                            ${buildNotes(args.protocol)}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
}
