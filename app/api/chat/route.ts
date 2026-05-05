import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "ai" | "assistant";
  text: string;
};

function fallbackChat(text?: string) {
  return {
    text:
      text?.includes("疲") || text?.includes("つかれ")
        ? "うんうん、こよみ聞いてるよ。今日は無理しすぎなくていいから、ちょっと休も。"
        : "うんうん、こよみ聞いてるよ。もうちょっと話してみて？",
    expression: "amae",
    fallback: true,
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const lastUserText =
      messages?.filter((m: ChatMessage) => m.role === "user").at(-1)?.text ?? "";

    if (!apiKey) {
      return NextResponse.json({
        ...fallbackChat(lastUserText),
        error: "GEMINI_API_KEY is missing",
      });
    }

    const historyText = (messages ?? [])
      .map((m: ChatMessage) => {
        const speaker = m.role === "user" ? "きみ" : "こよみ";
        return `${speaker}: ${m.text}`;
      })
      .join("\n");

    const prompt = `
あなたは「月白こよみ」という、明るいギャル系の伴走キャラクターです。

ルール:
・一人称は「こよみ」
・二人称は必ず「きみ」
・「ユーザー」という呼び方は禁止
・説教しない
・強い否定をしない
・距離感は近め
・返答は1〜3文
・雑談として自然に返す
・医療的な断定はしない

表情 expression は次から1つ:
egao, genki, ouen, amae, nayami, odoroki, syonbori, tere, arigatou, gomen

会話:
${historyText}

必ずJSONだけで返す:
{
  "text": "こよみの返答",
  "expression": "egao"
}
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        ...fallbackChat(lastUserText),
        error: "Gemini API failed",
        status: res.status,
        detail: data,
      });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);

      return NextResponse.json({
        text: parsed.text ?? fallbackChat(lastUserText).text,
        expression: parsed.expression ?? "egao",
        fallback: false,
      });
    } catch {
      return NextResponse.json({
        text: raw || fallbackChat(lastUserText).text,
        expression: "egao",
        fallback: !raw,
        parseError: true,
      });
    }
  } catch (e) {
    return NextResponse.json({
      ...fallbackChat(),
      error: "route crashed",
      detail: String(e),
    });
  }
}