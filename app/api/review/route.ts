import { NextResponse } from "next/server";

type Emotion = "normal" | "happy" | "worry" | "amae";

type Meals = {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snack?: string;
};

function buildMealText(meals?: Meals) {
  if (!meals) return "記録なし";

  const lines: string[] = [];

  if (meals.breakfast) lines.push(`朝食: ${meals.breakfast}`);
  if (meals.lunch) lines.push(`昼食: ${meals.lunch}`);
  if (meals.dinner) lines.push(`夕食: ${meals.dinner}`);
  if (meals.snack) lines.push(`間食: ${meals.snack}`);

  return lines.length ? lines.join("\n") : "記録なし";
}

function fallbackReview(
  weight?: string,
  note?: string,
  meals?: Meals,
  exercise?: string
) {
  let emotion: Emotion = "normal";

  const mealText = buildMealText(meals);
  const hasMeals = mealText !== "記録なし";
  const hasExercise = Boolean(exercise?.trim());

  if (!weight && !hasMeals && !hasExercise && (!note || note === "記録なし")) {
    emotion = "worry";
  } else if (
    note?.includes("疲") ||
    note?.includes("だる") ||
    note?.includes("眠")
  ) {
    emotion = "amae";
  } else if (
    hasExercise ||
    note?.includes("運動") ||
    note?.includes("筋トレ") ||
    note?.includes("ウォーキング")
  ) {
    emotion = "happy";
  }

  return {
    text: `今日も記録してくれてえらいじゃん。
${weight ? `体重は${weight}kgだね。` : ""}
${
  hasMeals
    ? "食事内容も残せてるの、かなりいいよ。摂取カロリーとタンパク質はざっくり推定で見る感じだけど、明日は量も少しだけ書けるともっと見やすくなるかも。"
    : "摂取カロリーとタンパク質は、食事記録がないから今回は推定できないね。"
}
${
  hasExercise
    ? "運動もできてるのいい流れだよ。消費カロリーは運動内容からざっくり目安で見ていこうね。"
    : "消費カロリーは、運動記録がないから今回は推定できないね。"
}
明日も無理しすぎず、できるところから一緒に整えてこ。`,
    emotion,
  };
}

export async function POST(req: Request) {
  try {
    const { weight, note, meals, exercise } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackReview(weight, note, meals, exercise));
    }

    const mealText = buildMealText(meals);

    const prompt = `
あなたは「月白こよみ」というダイエット伴走キャラクターです。

キャラクター:
・明るいギャル系
・優しい
・距離感が近い
・説教しない
・強い否定をしない
・一人称は「こよみ」
・二人称は必ず「きみ」
・「ユーザー」という呼び方は禁止

レビュー方針:
・未入力の項目も完全には無視しない
・入力にない具体的な食事や行動を絶対に作らない
・書かれていない内容を推測しすぎない
・良い点を1つ以上入れる
・改善点は最大2つ
・明日の提案を1つ入れる
・3〜6文
・自然な日本語
・医療的な断定はしない
・ダイエットを責めない
・厳密な栄養計算ではなく、ざっくり推定として話す
・レビュー本文には必ず「摂取カロリー」「タンパク質」「消費カロリー」という3つの語を入れる
・食事記録がある場合は、摂取カロリーとタンパク質をざっくり数値で出す
・運動記録がある場合は、消費カロリーをざっくり数値で出す
・食事記録がない場合は「摂取カロリーとタンパク質は、食事記録がないから今回は推定できない」と書く
・運動記録がない場合は「消費カロリーは、運動記録がないから今回は推定できない」と書く

栄養コメント方針:
・食事記録がある場合は、必ずざっくり摂取カロリーとタンパク質量を出す
・量が書かれていない場合でも、一般的な一食分・一人前として仮定してよい
・数字は正確でなくてよい。「だいたい」「ざっくり」「目安」を付ける
・例: 「プロテインとバナナなら、摂取カロリーはざっくり250〜350kcal、タンパク質は20〜30gくらいかも」
・ラーメン、カレー、丼もの、弁当なども一人前としてざっくり推定する

運動コメント方針:
・運動記録がある場合は、必ずざっくり消費カロリーを出す
・体重や強度が不明でも、一般的な成人の軽〜中強度として仮定してよい
・例: 「ウォーキング30分なら、消費カロリーはざっくり100〜150kcalくらいありそう」
・運動記録がない場合は、推定できないと短く言う

emotionは次から1つ選ぶ:
normal: 普通
happy: よくできた、褒めたい
worry: 記録が少ない、少し心配
amae: 疲れ・眠い・だるいなど、甘やかしたい

入力:
体重: ${weight || "未入力"}

食事:
${mealText}

運動:
${exercise || "記録なし"}

メモ:
${note || "記録なし"}

必ずJSONだけで返す:
{
  "text": "3〜6文のレビュー本文。本文内に必ず「摂取カロリー」「タンパク質」「消費カロリー」を入れる。",
  "emotion": "normal"
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
      return NextResponse.json(fallbackReview(weight, note, meals, exercise));
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);

      const fallback = fallbackReview(weight, note, meals, exercise);

      return NextResponse.json({
        text: parsed.text ?? fallback.text,
        emotion: parsed.emotion ?? fallback.emotion,
      });
    } catch {
      const fallback = fallbackReview(weight, note, meals, exercise);

      return NextResponse.json({
        text: raw || fallback.text,
        emotion: fallback.emotion,
      });
    }
  } catch {
    return NextResponse.json(fallbackReview());
  }
}