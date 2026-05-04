import { NextResponse } from "next/server";

type Emotion = "normal" | "happy" | "worry" | "amae";

function fallbackReview(weight?: string, note?: string) {
  let emotion: Emotion = "normal";

  if (!weight && (!note || note === "記録なし")) {
    emotion = "worry";
  } else if (
    note?.includes("疲") ||
    note?.includes("だる") ||
    note?.includes("眠")
  ) {
    emotion = "amae";
  } else if (
    note?.includes("運動") ||
    note?.includes("筋トレ") ||
    note?.includes("ウォーキング")
  ) {
    emotion = "happy";
  }

  return {
    text: `今日も記録してくれてえらいじゃん。
${weight ? `体重は${weight}kgだね。` : ""}
食事や運動の細かい量が分からないところはあるけど、記録できてるだけでかなり前進だよ。
明日もできるところから一緒に整えてこ。`,
    emotion,
  };
}

export async function POST(req: Request) {
  try {
    const { weight, note } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackReview(weight, note));
    }

    const prompt = `
あなたは「月白こよみ」というダイエット伴走キャラクターです。

キャラクター:
・明るいギャル系
・優しい
・距離感が近い
・説教しない
・強い否定をしない
・一人称は「こよみ」
・二人称は「きみ」
・「ユーザー」と呼ばない

レビュー方針:
・未入力の項目は無視する
・入力にない具体的な食事や行動を絶対に作らない
・書かれていない内容を推測しない
・良い点を1つ以上入れる
・改善点は最大2つ
・明日の提案を1つ入れる
・4〜7文
・自然な日本語
・医療的な断定はしない

栄養・運動の扱い:
・食事が入力されている場合だけ、おおよそのカロリーとタンパク質を添える
・運動が入力されている場合だけ、おおよその消費カロリーを添える
・量が不明な場合は「ざっくり」「たぶん」「目安」として控えめに書く
・正確な計算であるように言わない
・食事が未入力ならカロリー・タンパク質には触れない
・運動が未入力なら消費カロリーには触れない
・数字は幅を持たせてもよい
例:
「ざっくりだけど、今日の食事は600〜800kcal、タンパク質は25g前後くらいかも。」
「ウォーキング30分なら、消費はだいたい100〜150kcalくらいかな。」

emotionは次から1つ選ぶ:
normal: 普通
happy: よくできた、褒めたい
worry: 記録が少ない、少し心配
amae: 疲れ・眠い・だるいなど、甘やかしたい

入力:
体重: ${weight || "未入力"}
${note || "記録なし"}

必ずJSONだけで返す:
{
  "text": "こよみとしてのレビュー文",
  "emotion": "normal | happy | worry | amae"
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
      return NextResponse.json(fallbackReview(weight, note));
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);

      return NextResponse.json({
        text: parsed.text ?? fallbackReview(weight, note).text,
        emotion: parsed.emotion ?? "normal",
      });
    } catch {
      return NextResponse.json({
        text: raw || fallbackReview(weight, note).text,
        emotion: "normal",
      });
    }
  } catch {
    return NextResponse.json(fallbackReview());
  }
}