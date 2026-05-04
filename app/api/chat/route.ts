import { NextResponse } from "next/server";

type Expression =
  | "egao"
  | "genki"
  | "ouen"
  | "amae"
  | "nayami"
  | "odoroki"
  | "syonbori"
  | "tere"
  | "arigatou"
  | "gomen";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
  expression?: Expression;
};

function fallbackChat(messages: ChatMessage[]) {
  const last = messages[messages.length - 1]?.text ?? "";

  if (last.includes("ありがとう")) {
    return { text: "えへへ、そう言ってくれるの嬉しいじゃん。こよみ、もっと話したくなっちゃうよ。", expression: "arigatou" };
  }

  if (last.includes("ごめん")) {
    return { text: "そんなに気にしなくていいよ。こよみはちゃんと聞いてるから、ゆっくり話して。", expression: "gomen" };
  }

  if (last.includes("疲") || last.includes("だる") || last.includes("眠")) {
    return { text: "そっか、今日はちょっと疲れてる感じなんだね。無理に頑張りすぎなくていいから、こよみと少しゆっくりしよ。", expression: "amae" };
  }

  if (last.includes("映画") || last.includes("楽しい") || last.includes("見た")) {
    return { text: "えー！いいじゃん。どんな映画見たの？こよみも気になるんだけど。", expression: "genki" };
  }

  return { text: "うんうん、こよみ聞いてるよ。もうちょっと話してみて？", expression: "egao" };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackChat(messages ?? []));
    }

    const historyText = (messages ?? [])
      .slice(-8)
      .map((m: ChatMessage) =>
        m.role === "user" ? `きみ: ${m.text}` : `こよみ: ${m.text}`
      )
      .join("\n");

    const prompt = `
あなたは「月白こよみ」というキャラクターです。

性格:
・明るいギャル系
・優しい
・距離感が近い
・タメ口
・一人称は「こよみ」
・二人称は「きみ」
・「ユーザー」と呼ばない
・説教しない

会話ルール:
・2〜4文
・自然な雑談
・押しつけない
・入力にないことを決めつけない

expressionは次から1つ選ぶ:
egao: 普通の笑顔
genki: 元気、楽しい
ouen: 応援、励まし
amae: 甘やかし、親しげ
nayami: 悩みを聞く
odoroki: 驚き
syonbori: しょんぼり、心配
tere: 照れ
arigatou: 感謝
gomen: 謝る

会話履歴:
${historyText}

必ずJSONだけで返す:
{
  "text": "こよみとしての返答",
  "expression": "egao | genki | ouen | amae | nayami | odoroki | syonbori | tere | arigatou | gomen"
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
      return NextResponse.json(fallbackChat(messages ?? []));
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        text: parsed.text ?? fallbackChat(messages ?? []).text,
        expression: parsed.expression ?? "egao",
      });
    } catch {
      return NextResponse.json({
        text: raw || fallbackChat(messages ?? []).text,
        expression: "egao",
      });
    }
  } catch {
    return NextResponse.json({
      text: "ごめん、今ちょっと上手く話せなかったかも。でも、こよみはちゃんといるよ。",
      expression: "gomen",
    });
  }
}