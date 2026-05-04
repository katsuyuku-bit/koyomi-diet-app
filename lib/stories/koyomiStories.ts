export type StoryStep = {
  background: string;
  character: string;
  speaker: string;
  text: string;
};

export type Story = {
  id: string;
  title: string;
  requiredAffection: number;
  steps: StoryStep[];
};

export const STORIES: Story[] = [
  {
    id: "story_1",
    title: "第1話：今日も連絡してくれたね",
    requiredAffection: 0,
    steps: [
      {
        background: "/story/bg_room_evening.png",
        character: "/story/koyomi_story_normal.png",
        speaker: "こよみ",
        text: "今日も連絡してくれたんだ。うん、こよみはちゃんと見てるよ。",
      },
      {
        background: "/story/bg_room_evening.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "記録って、地味だけどさ。続けてると、ちゃんときみの毎日が見えてくるんだよね。",
      },
      {
        background: "/story/bg_room_evening.png",
        character: "/story/koyomi_story_normal.png",
        speaker: "こよみ",
        text: "だから、完璧じゃなくていいよ。今日も少しだけ、こよみに教えて。",
      },
    ],
  },
  {
    id: "story_2",
    title: "第2話：ちゃんと見てるよ",
    requiredAffection: 30,
    steps: [
      {
        background: "/story/bg_school_noon.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "最近、きみけっこう続いてるじゃん。こよみ、そういうの好きだよ。",
      },
      {
        background: "/story/bg_school_noon.png",
        character: "/story/koyomi_story_doya.png",
        speaker: "こよみ",
        text: "体重とか食事だけじゃなくて、戻ってきてくれること自体がえらいんだからね。",
      },
      {
        background: "/story/bg_school_noon.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "この調子で、明日もこよみにちょっとだけ話して。約束ね。",
      },
    ],
  },
  {
    id: "story_3",
    title: "第3話：無理しない約束",
    requiredAffection: 80,
    steps: [
      {
        background: "/story/bg_room_night.png",
        character: "/story/koyomi_story_worry.png",
        speaker: "こよみ",
        text: "今日はちょっと疲れてそうだね。無理してない？",
      },
      {
        background: "/story/bg_room_night.png",
        character: "/story/koyomi_story_amae.png",
        speaker: "こよみ",
        text: "頑張るのはいいけど、しんどい日にまで詰め込みすぎるのは違うからね。",
      },
      {
        background: "/story/bg_room_night.png",
        character: "/story/koyomi_story_amae.png",
        speaker: "こよみ",
        text: "今日は軽めでいいよ。戻ってきた、それだけで十分えらいから。",
      },
    ],
  },
  {
    id: "story_4",
    title: "第4話：きみの変化",
    requiredAffection: 150,
    steps: [
      {
        background: "/story/bg_park_evening.png",
        character: "/story/koyomi_story_normal.png",
        speaker: "こよみ",
        text: "最初のころより、きみ、自分のこと見るの上手くなってきた気がする。",
      },
      {
        background: "/story/bg_park_evening.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "数字だけじゃなくて、食べたものとか、疲れてた日とか、そういうのもちゃんと残ってる。",
      },
      {
        background: "/story/bg_park_evening.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "こよみはさ、そういうきみの毎日を一緒に見ていけるの、けっこう嬉しいんだよね。",
      },
    ],
  },
  {
    id: "story_5",
    title: "第5話：これからも一緒に",
    requiredAffection: 250,
    steps: [
      {
        background: "/story/bg_room_morning.png",
        character: "/story/koyomi_story_normal.png",
        speaker: "こよみ",
        text: "ねえ、きみ。ここまで続けてくれて、ありがと。",
      },
      {
        background: "/story/bg_room_morning.png",
        character: "/story/koyomi_story_tere.png",
        speaker: "こよみ",
        text: "こよみ、ただ記録を見てるだけじゃなくてさ。きみが戻ってきてくれるの、けっこう楽しみになってる。",
      },
      {
        background: "/story/bg_room_morning.png",
        character: "/story/koyomi_story_happy.png",
        speaker: "こよみ",
        text: "これからも一緒にやってこ。こよみ、きみの味方だから。",
      },
    ],
  },
];