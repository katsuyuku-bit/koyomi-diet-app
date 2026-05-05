"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { STORIES, type Story } from "@/lib/stories/koyomiStories";

type Tab =
  | "home"
  | "weight"
  | "meals"
  | "exercise"
  | "history"
  | "chat"
  | "story";

type Mood = "normal" | "happy" | "worry" | "amae";

type ChatExpression =
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
  expression?: ChatExpression;
};

type DailyLog = {
  id: string;
  log_date: string;
  weight: string;
  condition_note: string;
  meals_json: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
  };
  exercise_json: {
    memo?: string;
  };
  review_json: {
    text?: string;
    mood?: Mood;
  };
};

type Progress = {
  affection: number;
  unlocked_story_ids: string[];
};

type HomeDisplay = {
  image: string;
  message: string;
};

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: "ai",
    text: "来たね。今日は記録する？それとも、こよみとちょっと話す？",
    expression: "egao",
  },
];

const HOME_DISPLAYS: HomeDisplay[] = [
  {
    image: "/koyomi_normal.png",
    message: "今日もこよみと一緒に、できるところから整えてこ。",
  },
  {
    image: "/koyomi_happy.png",
    message: "来たじゃん。今日も少しだけ、自分のこと見てあげよ。",
  },
  {
    image: "/koyomi_amae.png",
    message: "無理しすぎなくていいよ。こよみとゆるく続けよ。",
  },
  {
    image: "/koyomi_doya.png",
    message: "ふふん、今日も来たじゃん。こよみ、ちゃんと見てるからね。",
  },
  {
    image: "/koyomi_normal.png",
    message: "完璧じゃなくていいから、今日のこと少しだけ残してこ。",
  },
  {
    image: "/koyomi_happy.png",
    message: "今日はどんな感じ？こよみにちょっと教えてよ。",
  },
  {
    image: "/koyomi_doya.png",
    message: "えらいじゃん。今日もこよみと一緒に整えてこ。",
  },
];

const WORRY_DISPLAYS: HomeDisplay[] = [
  {
    image: "/koyomi_worry.png",
    message:
      "昨日は記録なかったみたい。大丈夫だけど、こよみはちょっと気にしてるよ。",
  },
  {
    image: "/koyomi_worry.png",
    message:
      "昨日はお休みだったかな。今日はちょっとだけでも、こよみに教えてね。",
  },
  {
    image: "/koyomi_amae.png",
    message:
      "戻ってきたならOKだよ。今日は無理せず、できる分だけにしよ。",
  },
];

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getTimeBackground() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) return "/bg_morning.png";
  if (hour >= 10 && hour < 16) return "/bg_noon.png";
  if (hour >= 16 && hour < 19) return "/bg_evening.png";
  return "/bg_night.png";
}

function fallbackChatReply(input: string): ChatMessage {
  if (input.includes("ラーメン")) {
    return {
      role: "ai",
      text: "ラーメン食べたんだね。いいじゃん、そういう日もあるよ。こよみ的には、次の食事で野菜とかタンパク質をちょっと足せたら十分えらいと思う。",
      expression: "egao",
    };
  }

  if (
    input.includes("疲") ||
    input.includes("眠") ||
    input.includes("だる") ||
    input.includes("しんど")
  ) {
    return {
      role: "ai",
      text: "そっか、今日はちょっとしんどい感じなんだね。無理に頑張りすぎなくていいよ。こよみは、きみが戻ってきてくれただけでもちゃんと嬉しいから。",
      expression: "amae",
    };
  }

  if (
    input.includes("歩") ||
    input.includes("運動") ||
    input.includes("筋トレ") ||
    input.includes("ウォーキング")
  ) {
    return {
      role: "ai",
      text: "え、ちゃんと動いたのえらいじゃん。少しでも体を動かしたなら、それは普通に前進だよ。こよみ、そういうのちゃんと見てるからね。",
      expression: "ouen",
    };
  }

  return {
    role: "ai",
    text: "うんうん、教えてくれてありがと。今こよみの返事がちょっと届きにくいみたいだけど、ちゃんと聞いてるからね。",
    expression: "egao",
  };
}

function fallbackReviewText(weight: string, note: string) {
  const hasNote = note && note !== "記録なし";

  if (!weight && !hasNote) {
    return {
      text: "今日はまだ記録少なめだね。大丈夫だけど、こよみはちょっと気にしてるよ。まずは体重か食事をひとつだけでも残してみよ。",
      emotion: "worry" as Mood,
    };
  }

  if (
    note.includes("運動") ||
    note.includes("筋トレ") ||
    note.includes("ウォーキング")
  ) {
    return {
      text: `今日も記録してくれてえらいじゃん。\n${
        weight ? `体重は${weight}kgだね。` : ""
      }\n運動もできてるの、かなりいい流れだよ。明日も無理しすぎず、できるところから一緒に整えてこ。`,
      emotion: "happy" as Mood,
    };
  }

  return {
    text: `今日も記録してくれてえらいじゃん。\n${
      weight ? `体重は${weight}kgだね。` : ""
    }\n無理しすぎず、明日もできるところから一緒に整えてこ。`,
    emotion: "normal" as Mood,
  };
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("home");

  const [weight, setWeight] = useState("");
  const [conditionNote, setConditionNote] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [snack, setSnack] = useState("");
  const [exercise, setExercise] = useState("");

  const [review, setReview] = useState("");
  const [mood, setMood] = useState<Mood>("normal");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<DailyLog[]>([]);
  const [progress, setProgress] = useState<Progress>({
    affection: 0,
    unlocked_story_ids: ["story_1"],
  });

  const [selectedStory, setSelectedStory] = useState<Story>(STORIES[0]);
  const [storyStepIndex, setStoryStepIndex] = useState(0);

  const [homeDisplay, setHomeDisplay] = useState<HomeDisplay>(
    HOME_DISPLAYS[0]
  );
  const [homeDisplayReady, setHomeDisplayReady] = useState(false);
  const [homeBackground, setHomeBackground] = useState("/bg_noon.png");

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const today = formatLocalDate(new Date());

  const currentStoryStep = selectedStory.steps[storyStepIndex];
  const isLastStoryStep = storyStepIndex >= selectedStory.steps.length - 1;

  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading, tab]);

  function getMealCount() {
    return [breakfast, lunch, dinner, snack].filter((v) => v.trim()).length;
  }

  function decideMood(): Mood {
    const mealCount = getMealCount();

    if (weight.trim() && mealCount >= 2 && exercise.trim()) return "happy";
    if (!weight.trim() && mealCount === 0 && !exercise.trim()) return "worry";

    if (
      conditionNote.includes("疲") ||
      conditionNote.includes("だる") ||
      conditionNote.includes("眠")
    ) {
      return "amae";
    }

    return "normal";
  }

  function getKoyomiBustImage(expression?: ChatExpression) {
    if (expression === "genki") return "/koyomi_bust_genki.png";
    if (expression === "ouen") return "/koyomi_bust_ouen.png";
    if (expression === "amae") return "/koyomi_bust_amae.png";
    if (expression === "nayami") return "/koyomi_bust_nayami.png";
    if (expression === "odoroki") return "/koyomi_bust_odoroki.png";
    if (expression === "syonbori") return "/koyomi_bust_syonbori.png";
    if (expression === "tere") return "/koyomi_bust_tere.png";
    if (expression === "arigatou") return "/koyomi_bust_arigatou.png";
    if (expression === "gomen") return "/koyomi_bust_gomen.png";
    return "/koyomi_bust_egao.png";
  }

  function buildReviewNote() {
    const parts: string[] = [];

    if (conditionNote.trim()) parts.push(`体調メモ: ${conditionNote.trim()}`);
    if (breakfast.trim()) parts.push(`朝食: ${breakfast.trim()}`);
    if (lunch.trim()) parts.push(`昼食: ${lunch.trim()}`);
    if (dinner.trim()) parts.push(`夕食: ${dinner.trim()}`);
    if (snack.trim()) parts.push(`間食: ${snack.trim()}`);
    if (exercise.trim()) parts.push(`運動: ${exercise.trim()}`);

    return parts.length ? parts.join("\n") : "記録なし";
  }

  function applyTodayLog(log: DailyLog) {
    setWeight(log.weight ?? "");
    setConditionNote(log.condition_note ?? "");
    setBreakfast(log.meals_json?.breakfast ?? "");
    setLunch(log.meals_json?.lunch ?? "");
    setDinner(log.meals_json?.dinner ?? "");
    setSnack(log.meals_json?.snack ?? "");
    setExercise(log.exercise_json?.memo ?? "");
    setReview(log.review_json?.text ?? "");
    setMood(log.review_json?.mood ?? "normal");
  }

  async function fetchGeneratedHomeMessage(isWorry: boolean) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              text: isWorry
                ? "ホーム画面に出す一言を作って。昨日記録がなかった人に、責めずに優しく声をかけて。1〜2文。二人称は「きみ」。"
                : "ホーム画面に出す朝の一言を作って。明るく、軽く、記録したくなる感じで。1〜2文。二人称は「きみ」。",
            },
          ],
        }),
      });

      clearTimeout(timer);

      if (!res.ok) return null;

      const data = await res.json();
      const text = typeof data.text === "string" ? data.text.trim() : "";

      if (!text) return null;
      if (text.length > 90) return text.slice(0, 90) + "…";

      return text;
    } catch {
      return null;
    }
  }

  async function setupHomeDisplay(logs: DailyLog[]) {
    if (homeDisplayReady) return;

    const yesterday = getYesterdayString();
    const hasYesterdayLog = logs.some((log) => log.log_date === yesterday);
    const shouldGenerate = Math.random() < 0.1;

    if (!hasYesterdayLog) {
      const base = pickRandom(WORRY_DISPLAYS);

      if (shouldGenerate) {
        const generated = await fetchGeneratedHomeMessage(true);
        setHomeDisplay({
          image: base.image,
          message: generated ?? base.message,
        });
      } else {
        setHomeDisplay(base);
      }

      setMood("worry");
      setHomeDisplayReady(true);
      return;
    }

    const base = pickRandom(HOME_DISPLAYS);

    if (shouldGenerate) {
      const generated = await fetchGeneratedHomeMessage(false);
      setHomeDisplay({
        image: base.image,
        message: generated ?? base.message,
      });
    } else {
      setHomeDisplay(base);
    }

    setHomeDisplayReady(true);
  }

  function makeHistoryLine(log: DailyLog) {
    const mealCount = [
      log.meals_json?.breakfast,
      log.meals_json?.lunch,
      log.meals_json?.dinner,
      log.meals_json?.snack,
    ].filter(Boolean).length;

    const hasWeight = Boolean(log.weight);
    const hasExercise = Boolean(log.exercise_json?.memo);

    if (!hasWeight && mealCount === 0 && !hasExercise) {
      return "この日はあんまり記録なかったね。でも、こういう日もあるよ。";
    }

    const lines: string[] = [];

    if (hasWeight) {
      lines.push(`体重は${log.weight}kgだったよね。`);
    }

    if (mealCount > 0) {
      lines.push(
        `ごはんも${mealCount}つ書いてて、ちゃんと見ようとしてたのえらいじゃん。`
      );
    }

    if (hasExercise) {
      lines.push(
        "運動も書いてた日だね。こういうの残ってると、あとで見返しやすいよ。"
      );
    }

    return lines.join(" ");
  }

  function getUnlockedStoryIds(affection: number) {
    return STORIES.filter((story) => affection >= story.requiredAffection).map(
      (story) => story.id
    );
  }

  function getNextStory() {
    return STORIES.find(
      (story) => progress.affection < story.requiredAffection
    );
  }

  function openStory(story: Story) {
    setSelectedStory(story);
    setStoryStepIndex(0);
  }

  function advanceStory() {
    if (storyStepIndex < selectedStory.steps.length - 1) {
      setStoryStepIndex(storyStepIndex + 1);
    }
  }

  function resetChat() {
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setChatInput("");
    setChatLoading(false);
  }

  async function getOrCreateProfile() {
    let { data: profiles } = await supabase
      .from("diet_profiles")
      .select("*")
      .limit(1);

    let profile = profiles?.[0];

    if (!profile) {
      const { data } = await supabase
        .from("diet_profiles")
        .insert({
          nickname: "テストユーザー",
          goal_weight: "65",
        })
        .select();

      profile = data?.[0];
    }

    return profile;
  }

  async function getOrCreateProgress(profileId: string) {
    const { data } = await supabase
      .from("koyomi_progress")
      .select("*")
      .eq("profile_id", profileId)
      .limit(1);

    let row = data?.[0];

    if (!row) {
      const { data: inserted } = await supabase
        .from("koyomi_progress")
        .insert({
          profile_id: profileId,
          affection: 0,
          unlocked_story_ids: ["story_1"],
        })
        .select();

      row = inserted?.[0];
    }

    if (row) {
      setProgress({
        affection: row.affection ?? 0,
        unlocked_story_ids: row.unlocked_story_ids ?? ["story_1"],
      });
    }

    return row;
  }

  async function loadProgress() {
    const profile = await getOrCreateProfile();
    if (!profile) return;
    await getOrCreateProgress(profile.id);
  }

  async function addAffection(points: number) {
    if (points <= 0) return;

    const profile = await getOrCreateProfile();
    if (!profile) return;

    const current = await getOrCreateProgress(profile.id);
    const currentAffection = current?.affection ?? 0;
    const nextAffection = currentAffection + points;
    const unlocked = getUnlockedStoryIds(nextAffection);

    const { data, error } = await supabase
      .from("koyomi_progress")
      .upsert(
        {
          profile_id: profile.id,
          affection: nextAffection,
          unlocked_story_ids: unlocked,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "profile_id",
        }
      )
      .select();

    if (!error && data?.[0]) {
      setProgress({
        affection: data[0].affection,
        unlocked_story_ids: data[0].unlocked_story_ids ?? ["story_1"],
      });
    }
  }

  async function loadHistory() {
    const profile = await getOrCreateProfile();
    if (!profile) return;

    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .order("log_date", { ascending: false })
      .limit(14);

    if (!error && data) {
      const logs = data as DailyLog[];
      setHistory(logs);

      const todayLog = logs.find((log) => log.log_date === today);
      if (todayLog) {
        applyTodayLog(todayLog);
        setMessage("今日の記録を読み込んだよ。");
      }

      await setupHomeDisplay(logs);
    } else {
      await setupHomeDisplay([]);
    }
  }

  useEffect(() => {
    setHomeBackground(getTimeBackground());
    loadHistory();
    loadProgress();
  }, []);

  async function handleSave() {
  setLoading(true);
  setMessage("こよみが考え中...");
  setReview("");

  const fallbackMood = decideMood();
  const noteForReview = buildReviewNote();

  let reviewText = "";
  let nextMood: Mood = fallbackMood;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const reviewRes = await fetch("https://koyomi-diet-app.vercel.app/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        weight,
        note: noteForReview,
        meals: {
          breakfast,
          lunch,
          dinner,
          snack,
        },
        exercise,
      }),
    });

    clearTimeout(timer);

    if (!reviewRes.ok) {
      throw new Error("review api failed");
    }

    const reviewData = await reviewRes.json();
    const fallback = fallbackReviewText(weight, noteForReview);

    reviewText = reviewData.text ?? fallback.text;
    nextMood = reviewData.emotion ?? fallback.emotion;
  } catch {
    const fallback = fallbackReviewText(weight, noteForReview);
    reviewText = fallback.text;
    nextMood = fallback.emotion;
  }

  setMood(nextMood);

  const profile = await getOrCreateProfile();

  if (!profile) {
    setMessage("プロフィール作成失敗");
    setLoading(false);
    return;
  }

  const { error } = await supabase.from("daily_logs").upsert(
    {
      profile_id: profile.id,
      log_date: today,
      weight,
      condition_note: conditionNote,
      meals_json: {
        breakfast,
        lunch,
        dinner,
        snack,
      },
      exercise_json: {
        memo: exercise,
      },
      review_json: {
        text: reviewText,
        mood: nextMood,
      },
    },
    {
      onConflict: "profile_id,log_date",
    }
  );

  if (error) {
    setMessage("保存失敗: " + error.message);
  } else {
    let points = 5;
    if (getMealCount() > 0) points += 2;
    if (exercise.trim()) points += 3;
    if (weight.trim()) points += 1;

    await addAffection(points);

    setReview(reviewText);
    setMood(nextMood);
    setMessage(`保存成功！ こよみとの仲が少し深まったよ。+${points}`);
    setTab("home");

    await loadHistory();

    setReview(reviewText);
    setMood(nextMood);
  }

  setLoading(false);
}

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", text },
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({ messages: nextMessages }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error("chat api failed");
      }

      const data = await res.json();

      setChatMessages([
        ...nextMessages,
        {
          role: "ai",
          text: data.text ?? fallbackChatReply(text).text,
          expression: data.expression ?? fallbackChatReply(text).expression,
        },
      ]);
    } catch {
      setChatMessages([...nextMessages, fallbackChatReply(text)]);
    }

    await addAffection(1);
    setChatLoading(false);
  }

  function loadLogToForm(log: DailyLog) {
    setWeight(log.weight ?? "");
    setConditionNote(log.condition_note ?? "");
    setBreakfast(log.meals_json?.breakfast ?? "");
    setLunch(log.meals_json?.lunch ?? "");
    setDinner(log.meals_json?.dinner ?? "");
    setSnack(log.meals_json?.snack ?? "");
    setExercise(log.exercise_json?.memo ?? "");
    setReview(log.review_json?.text ?? "");
    setMood(log.review_json?.mood ?? "normal");
    setMessage("この日の記録だね。ちょっと見返してみよっか。");
    setTab("home");
  }

  const nextStory = getNextStory();

  return (
    <main className="min-h-screen bg-pink-50 px-3 py-3">
      <div className="mx-auto max-w-md pb-24">
        {tab === "home" && (
          <>
            <div className="flex gap-2">
              <section className="min-w-0 flex-1">
                <div className="rounded-3xl bg-white p-3 shadow ring-1 ring-pink-100">
                  <div className="relative h-[330px] overflow-hidden rounded-2xl bg-white">
                    <img
                      src={homeBackground}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    <div className="absolute inset-0 bg-white/20" />

                    <img
                      src={homeDisplay.image}
                      alt="こよみ"
                      className="relative z-10 mx-auto h-full object-contain drop-shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = "/koyomi.png";
                      }}
                    />
                  </div>

                  <div className="mt-2 rounded-2xl bg-pink-50 p-3">
                    <div className="text-sm font-bold leading-6 text-slate-700">
                      {homeDisplay.message}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="w-[126px] shrink-0 space-y-2">
                <div className="rounded-2xl bg-white p-3 shadow ring-1 ring-pink-100">
                  <div className="text-xs font-extrabold text-pink-500">
                    今日の記録
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    選んで保存
                  </div>
                </div>

                <button
                  onClick={() => setTab("weight")}
                  className="w-full rounded-2xl bg-pink-500 p-3 text-left font-bold text-white shadow"
                >
                  <div className="text-[10px] opacity-80">体重</div>
                  <div className="mt-1 text-sm">
                    {weight ? `${weight}kg` : "未入力"}
                  </div>
                </button>

                <button
                  onClick={() => setTab("meals")}
                  className="w-full rounded-2xl bg-white p-3 text-left font-bold text-slate-800 shadow ring-1 ring-pink-100"
                >
                  <div className="text-[10px] text-pink-500">食事</div>
                  <div className="mt-1 text-sm">{getMealCount()}件</div>
                </button>

                <button
                  onClick={() => setTab("exercise")}
                  className="w-full rounded-2xl bg-white p-3 text-left font-bold text-slate-800 shadow ring-1 ring-violet-100"
                >
                  <div className="text-[10px] text-violet-500">運動</div>
                  <div className="mt-1 text-sm">
                    {exercise ? "入力あり" : "未入力"}
                  </div>
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-br from-pink-400 to-violet-400 p-3 text-left font-bold text-white shadow disabled:opacity-60"
                >
                  <div className="text-[10px] opacity-80">まとめ</div>
                  <div className="mt-1 text-sm">
                    {loading ? "考え中" : "保存"}
                  </div>
                </button>

                <button
                  onClick={() => setTab("chat")}
                  className="w-full rounded-2xl bg-white p-3 text-left font-bold text-slate-800 shadow ring-1 ring-pink-100"
                >
                  <div className="text-[10px] text-pink-500">雑談</div>
                  <div className="mt-1 text-sm">話す</div>
                </button>
              </aside>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-4 shadow ring-1 ring-pink-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-pink-500">
                    こよみとの仲
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-800">
                    {progress.affection}
                  </div>
                </div>
                <button
                  onClick={() => setTab("story")}
                  className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-bold text-white"
                >
                  ストーリー
                </button>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-pink-500"
                  style={{
                    width: `${Math.min(
                      100,
                      nextStory
                        ? (progress.affection / nextStory.requiredAffection) *
                            100
                        : 100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-2 text-xs font-bold text-slate-500">
                {nextStory
                  ? `次の解放まであと ${
                      nextStory.requiredAffection - progress.affection
                    }`
                  : "すべてのストーリー解放済み"}
              </div>
            </div>

            {review && (
              <div className="mt-3 rounded-3xl bg-pink-100 p-4 shadow">
                <div className="mb-2 text-sm font-bold text-pink-500">
                  こよみレビュー
                </div>
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-800">
                  {review}
                </p>
              </div>
            )}

            {message && (
              <div className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-slate-700 shadow ring-1 ring-pink-100">
                {message}
              </div>
            )}
          </>
        )}

        {tab === "chat" && (
          <div className="rounded-3xl bg-white p-4 shadow ring-1 ring-pink-100">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                onClick={() => setTab("home")}
                className="text-sm font-bold text-pink-500"
              >
                ← ホームへ戻る
              </button>

              <button
                onClick={resetChat}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500"
              >
                会話リセット
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl bg-pink-50 shadow-sm">
              <img
                src="/koyomi_talk.png"
                alt="こよみと話す"
                className="h-44 w-full object-cover object-left"
              />
            </div>

            <div className="mt-3 rounded-3xl bg-pink-100 p-4">
              <div className="mb-1 text-sm font-bold text-pink-500">
                こよみと話す
              </div>
              <p className="text-sm leading-6 text-slate-700">
                記録以外の話もここでできるよ。短めに話しかけてみて。
              </p>
            </div>

            <div className="mt-4 max-h-[420px] space-y-4 overflow-y-auto rounded-3xl bg-pink-50 p-3">
              {chatMessages.map((m, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "ai" && (
                    <img
                      src={getKoyomiBustImage(m.expression)}
                      alt="こよみ"
                      className="h-14 w-14 shrink-0 rounded-full bg-white object-cover shadow"
                    />
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      m.role === "user"
                        ? "bg-pink-500 text-white"
                        : "bg-white text-slate-800"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-end gap-2">
                  <img
                    src="/koyomi_bust_nayami.png"
                    alt="こよみ"
                    className="h-14 w-14 shrink-0 rounded-full bg-white object-cover shadow"
                  />
                  <div className="inline-block rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500">
                    こよみが考え中...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
                placeholder="こよみに話しかける"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading}
                className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                送信
              </button>
            </div>
          </div>
        )}

        {tab === "story" && (
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-pink-100">
            <button
              onClick={() => setTab("home")}
              className="mb-4 text-sm font-bold text-pink-500"
            >
              ← ホームへ戻る
            </button>

            <h1 className="text-2xl font-extrabold text-pink-500">
              こよみストーリー
            </h1>

            <div className="mt-3 rounded-3xl bg-pink-50 p-4">
              <div className="text-sm font-bold text-pink-500">
                こよみとの仲
              </div>
              <div className="mt-1 text-3xl font-extrabold text-slate-800">
                {progress.affection}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-600">
                {nextStory
                  ? `次は「${nextStory.title}」まであと ${
                      nextStory.requiredAffection - progress.affection
                    }`
                  : "すべての物語を読めます"}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {STORIES.map((story) => {
                const unlocked = progress.unlocked_story_ids.includes(story.id);

                return (
                  <button
                    key={story.id}
                    onClick={() => unlocked && openStory(story)}
                    className={`rounded-2xl p-4 text-left shadow-sm ${
                      unlocked
                        ? "bg-pink-100 text-slate-800"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold">{story.title}</div>
                      <div className="text-xs font-bold">
                        {unlocked
                          ? "解放済み"
                          : `好感度 ${story.requiredAffection}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedStory && currentStoryStep && (
              <div className="mt-5 overflow-hidden rounded-3xl bg-slate-950 shadow-inner ring-1 ring-pink-100">
                <div
                  onClick={advanceStory}
                  className="relative h-[420px] cursor-pointer overflow-hidden bg-slate-900"
                >
                  <img
                    src={currentStoryStep.background}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div className="absolute inset-0 bg-black/10" />

                  <img
                    src={currentStoryStep.character}
                    alt={currentStoryStep.speaker}
                    className="absolute bottom-0 left-1/2 z-10 h-[360px] -translate-x-1/2 object-contain drop-shadow"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
                    <div className="rounded-2xl bg-white/95 p-4 shadow">
                      <div className="mb-2 text-sm font-extrabold text-pink-500">
                        {currentStoryStep.speaker}
                      </div>
                      <p className="min-h-[88px] whitespace-pre-wrap text-base font-bold leading-8 text-slate-800">
                        {currentStoryStep.text}
                      </p>
                      <div className="mt-2 text-right text-xs font-bold text-slate-400">
                        {isLastStoryStep ? "最後です" : "タップで続き"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-white p-3">
                  <button
                    onClick={() => setStoryStepIndex(0)}
                    className="rounded-2xl bg-pink-100 px-4 py-2 text-xs font-bold text-pink-600"
                  >
                    最初から
                  </button>

                  <div className="text-xs font-bold text-slate-500">
                    {storyStepIndex + 1} / {selectedStory.steps.length}
                  </div>

                  <button
                    onClick={() =>
                      setStoryStepIndex(Math.max(0, storyStepIndex - 1))
                    }
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "weight" && (
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-pink-100">
            <button
              onClick={() => setTab("home")}
              className="mb-4 text-sm font-bold text-pink-500"
            >
              ← ホームへ戻る
            </button>

            <h1 className="text-2xl font-extrabold text-pink-500">
              体重・体調
            </h1>

            <input
              className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="体重 例：70.2"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />

            <textarea
              className="mt-4 h-32 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="体調メモ 例：少しむくみ気味"
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
            />

            <button
              onClick={() => setTab("home")}
              className="mt-5 w-full rounded-2xl bg-pink-500 p-4 text-lg font-bold text-white shadow"
            >
              入力完了
            </button>
          </div>
        )}

        {tab === "meals" && (
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-pink-100">
            <button
              onClick={() => setTab("home")}
              className="mb-4 text-sm font-bold text-pink-500"
            >
              ← ホームへ戻る
            </button>

            <h1 className="text-2xl font-extrabold text-pink-500">
              食事記録
            </h1>

            <textarea
              className="mt-4 h-24 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="朝食"
              value={breakfast}
              onChange={(e) => setBreakfast(e.target.value)}
            />

            <textarea
              className="mt-3 h-24 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="昼食"
              value={lunch}
              onChange={(e) => setLunch(e.target.value)}
            />

            <textarea
              className="mt-3 h-24 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="夕食"
              value={dinner}
              onChange={(e) => setDinner(e.target.value)}
            />

            <textarea
              className="mt-3 h-24 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="間食"
              value={snack}
              onChange={(e) => setSnack(e.target.value)}
            />

            <button
              onClick={() => setTab("home")}
              className="mt-5 w-full rounded-2xl bg-pink-500 p-4 text-lg font-bold text-white shadow"
            >
              入力完了
            </button>
          </div>
        )}

        {tab === "exercise" && (
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-pink-100">
            <button
              onClick={() => setTab("home")}
              className="mb-4 text-sm font-bold text-pink-500"
            >
              ← ホームへ戻る
            </button>

            <h1 className="text-2xl font-extrabold text-pink-500">
              運動記録
            </h1>

            <textarea
              className="mt-4 h-36 w-full rounded-2xl border border-slate-200 p-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-pink-300"
              placeholder="運動内容 例：ウォーキング30分"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
            />

            <button
              onClick={() => setTab("home")}
              className="mt-5 w-full rounded-2xl bg-pink-500 p-4 text-lg font-bold text-white shadow"
            >
              入力完了
            </button>
          </div>
        )}

        {tab === "history" && (
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-pink-100">
            <h1 className="text-2xl font-extrabold text-pink-500">
              こよみとの記録
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              前にこよみと話した日の記録だよ。タップすると、その日の内容を読み込めます。
            </p>

            <button
              onClick={loadHistory}
              className="mt-4 w-full rounded-2xl bg-pink-500 p-3 font-bold text-white"
            >
              記録を読みなおす
            </button>

            <div className="mt-4 space-y-3">
              {history.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  まだ記録がありません。まずは今日の分から、こよみに話してみて。
                </div>
              )}

              {history.map((log) => (
                <button
                  key={log.id}
                  onClick={() => loadLogToForm(log)}
                  className="w-full rounded-2xl bg-pink-50 p-4 text-left shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-slate-800">
                      {log.log_date}
                      {log.log_date === today && (
                        <span className="ml-2 text-xs font-bold text-pink-500">
                          今日
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-pink-500">
                      こよみとの記録
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {makeHistoryLine(log)}
                  </p>

                  {log.review_json?.text && (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <div className="mb-1 text-xs font-bold text-pink-500">
                        こよみ
                      </div>
                      <div className="line-clamp-3 text-sm leading-6 text-slate-700">
                        {log.review_json.text}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/70 bg-white/90 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-1">
          {(
            [
              "home",
              "weight",
              "meals",
              "exercise",
              "chat",
              "history",
              "story",
            ] as Tab[]
          ).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`flex-1 rounded-2xl px-1 py-3 text-[10px] font-bold ${
                tab === item ? "bg-pink-100 text-pink-600" : "text-slate-500"
              }`}
            >
              {item === "home" && "ホーム"}
              {item === "weight" && "体重"}
              {item === "meals" && "食事"}
              {item === "exercise" && "運動"}
              {item === "chat" && "会話"}
              {item === "history" && "履歴"}
              {item === "story" && "物語"}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}