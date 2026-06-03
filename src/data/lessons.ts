import type { Lesson } from "@/lib/types";
import { lessonDifficulty } from "@/lib/learning-levels";

const coreLessons: Lesson[] = [
  {
    id: "zoo",
    title: "At the Zoo",
    topic: "Animals",
    level: 1,
    cover: "🦁",
    pattern: "I see a ____.",
    sentences: [
      { en: "Mia goes to the zoo.", zh: "Mia 去動物園。", image: "🎒" },
      { en: "She sees a big lion.", zh: "她看到一隻大獅子。", image: "🦁" },
      { en: "She sees a funny monkey.", zh: "她看到一隻有趣的猴子。", image: "🐵" },
      { en: "The monkey can jump.", zh: "猴子會跳。", image: "🦘" },
      { en: "Mia is happy.", zh: "Mia 很開心。", image: "😊" }
    ],
    words: [
      { word: "zoo", meaning: "動物園", part: "noun", image: "🏞️", example: "I go to the zoo.", translation: "我去動物園。", level: "Level 1" },
      { word: "lion", meaning: "獅子", part: "noun", image: "🦁", example: "The lion is big.", translation: "獅子很大。", level: "Level 1" },
      { word: "monkey", meaning: "猴子", part: "noun", image: "🐵", example: "The monkey can jump.", translation: "猴子會跳。", level: "Level 1" },
      { word: "big", meaning: "大的", part: "adjective", image: "🔵", example: "It is big.", translation: "它很大。", level: "Level 1" },
      { word: "funny", meaning: "有趣的", part: "adjective", image: "😄", example: "The monkey is funny.", translation: "猴子很有趣。", level: "Level 2" },
      { word: "jump", meaning: "跳", part: "verb", image: "⬆️", example: "I can jump.", translation: "我會跳。", level: "Level 1" }
    ],
    listen: [
      { id: "z-l1", skill: "listen", type: "choice", prompt: "聽單字，選出意思：lion", audio: "lion", answer: "獅子", options: ["獅子", "猴子", "書包", "午餐"] },
      { id: "z-l2", skill: "listen", type: "choice", prompt: "聽句子：She sees a funny monkey.", audio: "She sees a funny monkey.", answer: "她看到猴子。", options: ["她看到猴子。", "她吃蘋果。", "她在下雨。", "她找書包。"] },
      { id: "z-l3", skill: "listen", type: "trueFalse", prompt: "The monkey can jump.", audio: "The monkey can jump.", answer: "True", options: ["True", "False"] },
      { id: "z-l4", skill: "listen", type: "choice", prompt: "聽單字，選出意思：big", audio: "big", answer: "大的", options: ["大的", "小的", "開心的", "藍色的"] },
      { id: "z-l5", skill: "listen", type: "choice", prompt: "Mia goes to the ____.", audio: "Mia goes to the zoo.", answer: "zoo", options: ["zoo", "classroom", "garden", "party"] }
    ],
    read: [
      { id: "z-r1", skill: "read", type: "choice", prompt: "Where does Mia go?", answer: "the zoo", options: ["the zoo", "school", "home", "the garden"] },
      { id: "z-r2", skill: "read", type: "choice", prompt: "What animal is funny?", answer: "monkey", options: ["monkey", "lion", "cat", "dog"] },
      { id: "z-r3", skill: "read", type: "trueFalse", prompt: "The lion can jump in the story.", answer: "False", options: ["True", "False"] }
    ],
    speak: [
      { id: "z-s1", prompt: "跟讀單字", target: "lion" },
      { id: "z-s2", prompt: "跟讀單字", target: "monkey" },
      { id: "z-s3", prompt: "跟讀句子", target: "I see a big lion." },
      { id: "z-s4", prompt: "跟讀句子", target: "The monkey can jump." },
      { id: "z-s5", prompt: "看圖說一句", target: "I see a monkey." }
    ],
    write: [
      { id: "z-w1", prompt: "完成句子", starter: "I see a ____.", answerHint: "lion / monkey" },
      { id: "z-w2", prompt: "完成句子", starter: "The monkey can ____.", answerHint: "jump" },
      { id: "z-w3", prompt: "寫一句自己的動物句子", starter: "I like ____.", answerHint: "animals you like" }
    ]
  },
  {
    id: "lunch",
    title: "My Lunch Box",
    topic: "Food",
    level: 1,
    cover: "🍱",
    pattern: "I like ____.",
    sentences: [
      { en: "Ben opens his lunch box.", zh: "Ben 打開他的午餐盒。", image: "🍱" },
      { en: "He has rice and eggs.", zh: "他有米飯和雞蛋。", image: "🍚" },
      { en: "He drinks milk.", zh: "他喝牛奶。", image: "🥛" },
      { en: "He shares a cookie.", zh: "他分享一片餅乾。", image: "🍪" },
      { en: "His friend says thank you.", zh: "他的朋友說謝謝。", image: "🙏" }
    ],
    words: [
      { word: "lunch", meaning: "午餐", part: "noun", image: "🍱", example: "I eat lunch.", translation: "我吃午餐。", level: "Level 1" },
      { word: "rice", meaning: "米飯", part: "noun", image: "🍚", example: "I like rice.", translation: "我喜歡米飯。", level: "Level 1" },
      { word: "egg", meaning: "雞蛋", part: "noun", image: "🥚", example: "This is an egg.", translation: "這是一顆雞蛋。", level: "Level 1" },
      { word: "milk", meaning: "牛奶", part: "noun", image: "🥛", example: "I drink milk.", translation: "我喝牛奶。", level: "Level 1" },
      { word: "cookie", meaning: "餅乾", part: "noun", image: "🍪", example: "The cookie is sweet.", translation: "餅乾很甜。", level: "Level 2" },
      { word: "share", meaning: "分享", part: "verb", image: "🤝", example: "I share my cookie.", translation: "我分享我的餅乾。", level: "Level 2" }
    ],
    listen: [
      { id: "l-l1", skill: "listen", type: "choice", prompt: "聽單字，選出意思：milk", audio: "milk", answer: "牛奶", options: ["牛奶", "米飯", "餅乾", "書"] },
      { id: "l-l2", skill: "listen", type: "choice", prompt: "He has rice and eggs.", audio: "He has rice and eggs.", answer: "rice and eggs", options: ["rice and eggs", "milk and cookies", "cats and dogs", "books and pencils"] },
      { id: "l-l3", skill: "listen", type: "trueFalse", prompt: "Ben drinks milk.", audio: "Ben drinks milk.", answer: "True", options: ["True", "False"] },
      { id: "l-l4", skill: "listen", type: "choice", prompt: "聽單字，選出意思：share", audio: "share", answer: "分享", options: ["分享", "跑步", "閱讀", "畫畫"] },
      { id: "l-l5", skill: "listen", type: "choice", prompt: "His friend says ____.", audio: "His friend says thank you.", answer: "thank you", options: ["thank you", "good night", "sorry", "hello"] }
    ],
    read: [
      { id: "l-r1", skill: "read", type: "choice", prompt: "What does Ben drink?", answer: "milk", options: ["milk", "juice", "water", "tea"] },
      { id: "l-r2", skill: "read", type: "choice", prompt: "What does Ben share?", answer: "a cookie", options: ["a cookie", "a pencil", "a bag", "a flower"] },
      { id: "l-r3", skill: "read", type: "trueFalse", prompt: "Ben opens his school bag.", answer: "False", options: ["True", "False"] }
    ],
    speak: [
      { id: "l-s1", prompt: "跟讀單字", target: "rice" },
      { id: "l-s2", prompt: "跟讀單字", target: "cookie" },
      { id: "l-s3", prompt: "跟讀句子", target: "I drink milk." },
      { id: "l-s4", prompt: "跟讀句子", target: "I share a cookie." },
      { id: "l-s5", prompt: "看圖說一句", target: "I like rice." }
    ],
    write: [
      { id: "l-w1", prompt: "完成句子", starter: "I like ____.", answerHint: "rice / eggs / milk" },
      { id: "l-w2", prompt: "完成句子", starter: "I drink ____.", answerHint: "milk" },
      { id: "l-w3", prompt: "寫一句午餐句子", starter: "I have ____.", answerHint: "food in your lunch box" }
    ]
  },
  {
    id: "classroom",
    title: "In the Classroom",
    topic: "School",
    level: 1,
    cover: "🏫",
    pattern: "This is my ____.",
    sentences: [
      { en: "Amy is in the classroom.", zh: "Amy 在教室裡。", image: "🏫" },
      { en: "She has a book.", zh: "她有一本書。", image: "📘" },
      { en: "She writes with a pencil.", zh: "她用鉛筆寫字。", image: "✏️" },
      { en: "The teacher smiles.", zh: "老師微笑。", image: "👩‍🏫" }
    ],
    words: [
      { word: "classroom", meaning: "教室", part: "noun", image: "🏫", example: "I am in the classroom.", translation: "我在教室裡。", level: "Level 1" },
      { word: "book", meaning: "書", part: "noun", image: "📘", example: "This is my book.", translation: "這是我的書。", level: "Level 1" },
      { word: "pencil", meaning: "鉛筆", part: "noun", image: "✏️", example: "I have a pencil.", translation: "我有一支鉛筆。", level: "Level 1" },
      { word: "write", meaning: "寫", part: "verb", image: "📝", example: "I write my name.", translation: "我寫我的名字。", level: "Level 1" },
      { word: "teacher", meaning: "老師", part: "noun", image: "👩‍🏫", example: "My teacher is kind.", translation: "我的老師很親切。", level: "Level 1" },
      { word: "smile", meaning: "微笑", part: "verb", image: "🙂", example: "Please smile.", translation: "請微笑。", level: "Level 2" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  },
  {
    id: "family",
    title: "My Family Day",
    topic: "Family",
    level: 2,
    cover: "👨‍👩‍👧",
    pattern: "My ____ likes ____.",
    sentences: [
      { en: "Leo has a family day.", zh: "Leo 有一個家庭日。", image: "👨‍👩‍👧" },
      { en: "Mom cooks dinner.", zh: "媽媽煮晚餐。", image: "🍲" },
      { en: "Dad reads a story.", zh: "爸爸讀故事。", image: "📖" },
      { en: "Grandma sings a song.", zh: "奶奶唱歌。", image: "🎵" }
    ],
    words: [
      { word: "family", meaning: "家庭", part: "noun", image: "👨‍👩‍👧", example: "I love my family.", translation: "我愛我的家庭。", level: "Level 1" },
      { word: "mom", meaning: "媽媽", part: "noun", image: "👩", example: "Mom cooks dinner.", translation: "媽媽煮晚餐。", level: "Level 1" },
      { word: "dad", meaning: "爸爸", part: "noun", image: "👨", example: "Dad reads a story.", translation: "爸爸讀故事。", level: "Level 1" },
      { word: "grandma", meaning: "奶奶 / 外婆", part: "noun", image: "👵", example: "Grandma sings.", translation: "奶奶唱歌。", level: "Level 2" },
      { word: "cook", meaning: "煮", part: "verb", image: "🍳", example: "I cook rice.", translation: "我煮飯。", level: "Level 2" },
      { word: "sing", meaning: "唱歌", part: "verb", image: "🎤", example: "I sing a song.", translation: "我唱一首歌。", level: "Level 2" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  },
  {
    id: "rain",
    title: "A Rainy Day",
    topic: "Weather",
    level: 2,
    cover: "🌧️",
    pattern: "It is ____.",
    sentences: [
      { en: "It is a rainy day.", zh: "今天是下雨天。", image: "🌧️" },
      { en: "Nina has an umbrella.", zh: "Nina 有一把傘。", image: "☂️" },
      { en: "She jumps in a puddle.", zh: "她跳進水坑。", image: "💧" },
      { en: "Her boots are yellow.", zh: "她的雨靴是黃色的。", image: "🥾" }
    ],
    words: [
      { word: "rainy", meaning: "下雨的", part: "adjective", image: "🌧️", example: "It is rainy.", translation: "下雨了。", level: "Level 1" },
      { word: "umbrella", meaning: "雨傘", part: "noun", image: "☂️", example: "I have an umbrella.", translation: "我有一把雨傘。", level: "Level 2" },
      { word: "puddle", meaning: "水坑", part: "noun", image: "💧", example: "The puddle is small.", translation: "水坑很小。", level: "Level 3" },
      { word: "boots", meaning: "靴子", part: "noun", image: "🥾", example: "My boots are yellow.", translation: "我的靴子是黃色的。", level: "Level 2" },
      { word: "yellow", meaning: "黃色的", part: "adjective", image: "🟡", example: "It is yellow.", translation: "它是黃色的。", level: "Level 1" },
      { word: "day", meaning: "日子", part: "noun", image: "📅", example: "Today is a good day.", translation: "今天是好日子。", level: "Level 1" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  },
  {
    id: "bag",
    title: "The Lost Bag",
    topic: "Daily Life",
    level: 2,
    cover: "🎒",
    pattern: "Where is my ____?",
    sentences: [
      { en: "Sam cannot find his bag.", zh: "Sam 找不到他的書包。", image: "🎒" },
      { en: "He looks under the desk.", zh: "他看書桌下面。", image: "🪑" },
      { en: "He looks by the door.", zh: "他看門旁邊。", image: "🚪" },
      { en: "The bag is on the chair.", zh: "書包在椅子上。", image: "🪑" }
    ],
    words: [
      { word: "lost", meaning: "遺失的", part: "adjective", image: "❓", example: "My bag is lost.", translation: "我的書包不見了。", level: "Level 2" },
      { word: "bag", meaning: "書包", part: "noun", image: "🎒", example: "This is my bag.", translation: "這是我的書包。", level: "Level 1" },
      { word: "under", meaning: "在下面", part: "preposition", image: "⬇️", example: "It is under the desk.", translation: "它在書桌下面。", level: "Level 2" },
      { word: "door", meaning: "門", part: "noun", image: "🚪", example: "Open the door.", translation: "打開門。", level: "Level 1" },
      { word: "chair", meaning: "椅子", part: "noun", image: "🪑", example: "Sit on the chair.", translation: "坐在椅子上。", level: "Level 1" },
      { word: "find", meaning: "找到", part: "verb", image: "🔎", example: "I find my bag.", translation: "我找到我的書包。", level: "Level 2" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  },
  {
    id: "birthday",
    title: "A Birthday Party",
    topic: "Celebration",
    level: 2,
    cover: "🎂",
    pattern: "I want ____.",
    sentences: [
      { en: "It is Lily's birthday.", zh: "今天是 Lily 的生日。", image: "🎂" },
      { en: "Her friends bring gifts.", zh: "她的朋友帶來禮物。", image: "🎁" },
      { en: "They sing a birthday song.", zh: "他們唱生日歌。", image: "🎵" },
      { en: "Lily makes a wish.", zh: "Lily 許願。", image: "✨" }
    ],
    words: [
      { word: "birthday", meaning: "生日", part: "noun", image: "🎂", example: "Happy birthday!", translation: "生日快樂！", level: "Level 1" },
      { word: "party", meaning: "派對", part: "noun", image: "🎉", example: "I go to a party.", translation: "我去派對。", level: "Level 1" },
      { word: "gift", meaning: "禮物", part: "noun", image: "🎁", example: "This gift is for you.", translation: "這個禮物是給你的。", level: "Level 2" },
      { word: "song", meaning: "歌", part: "noun", image: "🎵", example: "I sing a song.", translation: "我唱一首歌。", level: "Level 1" },
      { word: "wish", meaning: "願望", part: "noun", image: "✨", example: "Make a wish.", translation: "許一個願望。", level: "Level 2" },
      { word: "friend", meaning: "朋友", part: "noun", image: "🧑‍🤝‍🧑", example: "You are my friend.", translation: "你是我的朋友。", level: "Level 1" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  },
  {
    id: "garden",
    title: "My Little Garden",
    topic: "Nature",
    level: 2,
    cover: "🌱",
    pattern: "The ____ is growing.",
    sentences: [
      { en: "Kai has a little garden.", zh: "Kai 有一個小花園。", image: "🌱" },
      { en: "He plants a seed.", zh: "他種下一顆種子。", image: "🌰" },
      { en: "He gives it water.", zh: "他給它水。", image: "💧" },
      { en: "A small flower grows.", zh: "一朵小花長出來。", image: "🌼" }
    ],
    words: [
      { word: "garden", meaning: "花園", part: "noun", image: "🌱", example: "This is my garden.", translation: "這是我的花園。", level: "Level 1" },
      { word: "plant", meaning: "種植", part: "verb", image: "🪴", example: "I plant a seed.", translation: "我種下一顆種子。", level: "Level 2" },
      { word: "seed", meaning: "種子", part: "noun", image: "🌰", example: "The seed is small.", translation: "種子很小。", level: "Level 2" },
      { word: "water", meaning: "水", part: "noun", image: "💧", example: "I need water.", translation: "我需要水。", level: "Level 1" },
      { word: "flower", meaning: "花", part: "noun", image: "🌼", example: "The flower is pretty.", translation: "花很漂亮。", level: "Level 1" },
      { word: "grow", meaning: "生長", part: "verb", image: "📈", example: "Plants grow.", translation: "植物會生長。", level: "Level 2" }
    ],
    listen: [],
    read: [],
    speak: [],
    write: []
  }
];

type LessonSeed = {
  id: string;
  title: string;
  topic: string;
  level: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  cover: string;
  pattern: string;
  sentences: [string, string, string][];
  words: [string, string, string, string, string, string][];
  comprehension?: {
    mainIdea: string;
    detailQuestion: string;
    detailAnswer: string;
    inferenceQuestion?: string;
    inferenceAnswer?: string;
    writingPrompt?: string;
  };
};

const extraLessonSeeds: LessonSeed[] = [
  {
    id: "school-bag",
    title: "In My Bag",
    topic: "School",
    level: 1,
    difficulty: "beginner",
    cover: "🎒",
    pattern: "I have a ____.",
    sentences: [
      ["I open my school bag.", "我打開我的書包。", "🎒"],
      ["I have a book and a pencil.", "我有一本書和一支鉛筆。", "📘"],
      ["My ruler is in the bag.", "我的尺在書包裡。", "📏"],
      ["I put my eraser on the desk.", "我把橡皮擦放在桌上。", "🧽"]
    ],
    words: [
      ["bag", "書包", "noun", "🎒", "I have a bag.", "我有一個書包。"],
      ["book", "書", "noun", "📘", "This is my book.", "這是我的書。"],
      ["pencil", "鉛筆", "noun", "✏️", "I write with a pencil.", "我用鉛筆寫字。"],
      ["ruler", "尺", "noun", "📏", "The ruler is long.", "尺很長。"],
      ["eraser", "橡皮擦", "noun", "🧽", "I use an eraser.", "我使用橡皮擦。"],
      ["desk", "桌子", "noun", "🪑", "The book is on the desk.", "書在桌上。"]
    ]
  },
  {
    id: "feelings",
    title: "My Feelings",
    topic: "Feelings",
    level: 1,
    difficulty: "beginner",
    cover: "😊",
    pattern: "I feel ____.",
    sentences: [
      ["I feel happy today.", "我今天覺得開心。", "😊"],
      ["My friend feels sad.", "我的朋友覺得難過。", "😢"],
      ["We talk and smile.", "我們聊天並微笑。", "🙂"],
      ["Now we feel better.", "現在我們感覺好多了。", "🌈"]
    ],
    words: [
      ["happy", "開心的", "adjective", "😊", "I am happy.", "我很開心。"],
      ["sad", "難過的", "adjective", "😢", "She is sad.", "她很難過。"],
      ["angry", "生氣的", "adjective", "😠", "He feels angry.", "他覺得生氣。"],
      ["tired", "疲倦的", "adjective", "🥱", "I am tired.", "我很累。"],
      ["scared", "害怕的", "adjective", "😨", "The child is scared.", "孩子很害怕。"],
      ["excited", "興奮的", "adjective", "🤩", "I feel excited.", "我覺得興奮。"]
    ]
  },
  {
    id: "body",
    title: "My Body",
    topic: "Body",
    level: 1,
    difficulty: "beginner",
    cover: "👋",
    pattern: "This is my ____.",
    sentences: [
      ["This is my head.", "這是我的頭。", "🙂"],
      ["I can clap my hands.", "我可以拍手。", "👏"],
      ["I can kick with my foot.", "我可以用腳踢。", "🦶"],
      ["I can see and hear.", "我可以看和聽。", "👀"]
    ],
    words: [
      ["head", "頭", "noun", "🙂", "This is my head.", "這是我的頭。"],
      ["hand", "手", "noun", "✋", "I raise my hand.", "我舉手。"],
      ["foot", "腳", "noun", "🦶", "This is my foot.", "這是我的腳。"],
      ["eye", "眼睛", "noun", "👁️", "I see with my eyes.", "我用眼睛看。"],
      ["ear", "耳朵", "noun", "👂", "I hear with my ears.", "我用耳朵聽。"],
      ["mouth", "嘴巴", "noun", "👄", "I speak with my mouth.", "我用嘴巴說話。"]
    ]
  },
  {
    id: "colors",
    title: "Colors Around Me",
    topic: "Colors",
    level: 1,
    difficulty: "beginner",
    cover: "🌈",
    pattern: "It is ____.",
    sentences: [
      ["I see a red apple.", "我看到一顆紅蘋果。", "🍎"],
      ["I see a blue bag.", "我看到一個藍色書包。", "🎒"],
      ["The sun is yellow.", "太陽是黃色的。", "☀️"],
      ["The tree is green.", "樹是綠色的。", "🌳"]
    ],
    words: [
      ["red", "紅色", "adjective", "🔴", "The apple is red.", "蘋果是紅色的。"],
      ["blue", "藍色", "adjective", "🔵", "The bag is blue.", "書包是藍色的。"],
      ["yellow", "黃色", "adjective", "🟡", "The sun is yellow.", "太陽是黃色的。"],
      ["green", "綠色", "adjective", "🟢", "The tree is green.", "樹是綠色的。"],
      ["black", "黑色", "adjective", "⚫", "The cat is black.", "貓是黑色的。"],
      ["white", "白色", "adjective", "⚪", "The cloud is white.", "雲是白色的。"]
    ]
  },
  {
    id: "my-day",
    title: "My Day",
    topic: "Daily Routine",
    level: 1,
    difficulty: "beginner",
    cover: "☀️",
    pattern: "I ____ in the morning.",
    sentences: [
      ["I wake up in the morning.", "我早上起床。", "⏰"],
      ["I wash my face.", "我洗臉。", "🧼"],
      ["I eat breakfast.", "我吃早餐。", "🍞"],
      ["At night, I sleep.", "晚上，我睡覺。", "🌙"]
    ],
    words: [
      ["wake", "醒來", "verb", "⏰", "I wake up early.", "我很早醒來。"],
      ["wash", "洗", "verb", "🧼", "I wash my hands.", "我洗手。"],
      ["eat", "吃", "verb", "🍽️", "I eat breakfast.", "我吃早餐。"],
      ["go", "去", "verb", "➡️", "I go to school.", "我去學校。"],
      ["play", "玩", "verb", "⚽", "I play with friends.", "我和朋友玩。"],
      ["sleep", "睡覺", "verb", "🌙", "I sleep at night.", "我晚上睡覺。"]
    ]
  },
  {
    id: "park-trip",
    title: "A Trip to the Park",
    topic: "Places",
    level: 2,
    difficulty: "intermediate",
    cover: "🌳",
    pattern: "We play at the ____.",
    sentences: [
      ["On Saturday, Leo goes to the park.", "星期六，Leo 去公園。", "🌳"],
      ["He plays on the swing with his sister.", "他和妹妹玩盪鞦韆。", "🛝"],
      ["They have a small picnic under a tree.", "他們在樹下野餐。", "🧺"],
      ["Leo runs on the grass and laughs.", "Leo 在草地上跑並大笑。", "🏃"]
    ],
    words: [
      ["park", "公園", "noun", "🌳", "We go to the park.", "我們去公園。"],
      ["swing", "盪鞦韆", "noun", "🛝", "I play on the swing.", "我玩盪鞦韆。"],
      ["slide", "溜滑梯", "noun", "🛝", "The slide is fun.", "溜滑梯很好玩。"],
      ["picnic", "野餐", "noun", "🧺", "We have a picnic.", "我們野餐。"],
      ["tree", "樹", "noun", "🌳", "The tree is tall.", "樹很高。"],
      ["grass", "草地", "noun", "🌿", "I run on the grass.", "我在草地上跑。"],
      ["run", "跑", "verb", "🏃", "Leo can run fast.", "Leo 跑得很快。"],
      ["laugh", "笑", "verb", "😄", "They laugh together.", "他們一起笑。"]
    ]
  },
  {
    id: "helping-home",
    title: "Helping at Home",
    topic: "Home",
    level: 2,
    difficulty: "intermediate",
    cover: "🧹",
    pattern: "I help ____.",
    sentences: [
      ["Emma helps at home after school.", "Emma 放學後在家幫忙。", "🏠"],
      ["She cleans the table and sweeps the floor.", "她清理桌子並掃地。", "🧹"],
      ["Her brother washes the dishes.", "她的弟弟洗碗。", "🍽️"],
      ["Their family feels happy and thankful.", "他們的家人感到開心和感謝。", "😊"]
    ],
    words: [
      ["clean", "清潔", "verb", "🧽", "I clean the table.", "我清理桌子。"],
      ["sweep", "掃", "verb", "🧹", "I sweep the floor.", "我掃地。"],
      ["table", "桌子", "noun", "🍽️", "The table is clean.", "桌子很乾淨。"],
      ["dishes", "碗盤", "noun", "🍽️", "I wash the dishes.", "我洗碗盤。"],
      ["room", "房間", "noun", "🛏️", "My room is tidy.", "我的房間很整齊。"],
      ["help", "幫忙", "verb", "🤝", "I help my family.", "我幫助我的家人。"],
      ["busy", "忙碌的", "adjective", "⏳", "Mom is busy.", "媽媽很忙。"],
      ["thankful", "感謝的", "adjective", "🙏", "We are thankful.", "我們很感謝。"]
    ]
  },
  {
    id: "shopping-day",
    title: "Shopping Day",
    topic: "Shopping",
    level: 2,
    difficulty: "intermediate",
    cover: "🛒",
    pattern: "I want to buy ____.",
    sentences: [
      ["Dad and Nina go to the shop.", "爸爸和 Nina 去商店。", "🏪"],
      ["Nina puts fruit in the basket.", "Nina 把水果放進籃子。", "🧺"],
      ["She checks the price carefully.", "她仔細看價格。", "🏷️"],
      ["They buy apples because they are cheap.", "他們買蘋果，因為蘋果便宜。", "🍎"]
    ],
    words: [
      ["shop", "商店", "noun", "🏪", "We go to the shop.", "我們去商店。"],
      ["money", "錢", "noun", "💰", "I have money.", "我有錢。"],
      ["buy", "買", "verb", "🛍️", "I buy fruit.", "我買水果。"],
      ["fruit", "水果", "noun", "🍎", "Fruit is healthy.", "水果很健康。"],
      ["price", "價格", "noun", "🏷️", "The price is low.", "價格很低。"],
      ["basket", "籃子", "noun", "🧺", "Put it in the basket.", "把它放進籃子。"],
      ["cheap", "便宜的", "adjective", "✅", "The apples are cheap.", "蘋果很便宜。"],
      ["expensive", "昂貴的", "adjective", "💎", "The toy is expensive.", "玩具很貴。"]
    ]
  },
  {
    id: "pet-friend",
    title: "My Pet Friend",
    topic: "Animals",
    level: 2,
    difficulty: "intermediate",
    cover: "🐶",
    pattern: "My pet can ____.",
    sentences: [
      ["Tina has a little dog.", "Tina 有一隻小狗。", "🐶"],
      ["The dog has a soft tail.", "小狗有柔軟的尾巴。", "🐕"],
      ["Tina feeds it every morning.", "Tina 每天早上餵牠。", "🥣"],
      ["At night, the dog sleeps near her bed.", "晚上，小狗睡在她床邊。", "🛏️"]
    ],
    words: [
      ["pet", "寵物", "noun", "🐾", "My pet is cute.", "我的寵物很可愛。"],
      ["dog", "狗", "noun", "🐶", "The dog can run.", "狗會跑。"],
      ["cat", "貓", "noun", "🐱", "The cat is soft.", "貓很柔軟。"],
      ["feed", "餵食", "verb", "🥣", "I feed my pet.", "我餵我的寵物。"],
      ["tail", "尾巴", "noun", "🐕", "The dog has a tail.", "狗有尾巴。"],
      ["soft", "柔軟的", "adjective", "☁️", "The cat is soft.", "貓很柔軟。"],
      ["play", "玩", "verb", "🎾", "I play with my pet.", "我和寵物玩。"],
      ["sleep", "睡覺", "verb", "💤", "My pet sleeps.", "我的寵物睡覺。"]
    ]
  },
  {
    id: "school-garden",
    title: "The School Garden",
    topic: "Nature",
    level: 3,
    difficulty: "advanced",
    cover: "🌿",
    pattern: "Plants need ____.",
    sentences: [
      ["Our class has a small garden behind the school.", "我們班在學校後面有一個小花園。", "🏫"],
      ["Every morning, Lily and Tom water the plants.", "每天早上，Lily 和 Tom 給植物澆水。", "💧"],
      ["Some plants grow quickly, but some need more sunlight.", "有些植物長得很快，但有些需要更多陽光。", "☀️"],
      ["Their teacher says plants need care every day.", "老師說植物每天都需要照顧。", "🧑‍🏫"],
      ["Lily smiles because she sees a small flower.", "Lily 微笑，因為她看見一朵小花。", "🌼"]
    ],
    words: [
      ["garden", "花園", "noun", "🌿", "The garden is behind the school.", "花園在學校後面。"],
      ["plant", "植物", "noun", "🪴", "A plant needs water.", "植物需要水。"],
      ["grow", "生長", "verb", "📈", "Plants grow in sunlight.", "植物在陽光下生長。"],
      ["water", "澆水", "verb", "💧", "We water the plants.", "我們給植物澆水。"],
      ["sunlight", "陽光", "noun", "☀️", "Plants need sunlight.", "植物需要陽光。"],
      ["careful", "小心的", "adjective", "👀", "Be careful with the flower.", "小心照顧花。"],
      ["healthy", "健康的", "adjective", "💚", "The plant is healthy.", "植物很健康。"],
      ["beautiful", "美麗的", "adjective", "🌼", "The flower is beautiful.", "花很美麗。"]
    ],
    comprehension: {
      mainIdea: "students taking care of a school garden",
      detailQuestion: "What do Lily and Tom do every morning?",
      detailAnswer: "water the plants",
      inferenceQuestion: "Why does Lily smile?",
      inferenceAnswer: "because she sees the flower grow",
      writingPrompt: "Write 3 sentences about how to take care of a plant."
    }
  },
  {
    id: "helpful-friend",
    title: "A Helpful Friend",
    topic: "Character",
    level: 3,
    difficulty: "advanced",
    cover: "🤝",
    pattern: "Can I help you ____?",
    sentences: [
      ["Jason sees Emma carrying many books.", "Jason 看見 Emma 拿著很多書。", "📚"],
      ["The books are heavy, and Emma walks slowly.", "書很重，Emma 走得很慢。", "😟"],
      ["Jason offers to carry some books for her.", "Jason 主動幫她拿一些書。", "🤝"],
      ["They walk to the classroom together.", "他們一起走到教室。", "🏫"],
      ["Jason feels happy because helping others makes the day better.", "Jason 很開心，因為幫助別人讓一天更好。", "😊"]
    ],
    words: [
      ["helpful", "樂於助人的", "adjective", "🤝", "Jason is helpful.", "Jason 樂於助人。"],
      ["difficult", "困難的", "adjective", "🧩", "The work is difficult.", "工作很困難。"],
      ["carry", "拿著", "verb", "📚", "I carry books.", "我拿著書。"],
      ["share", "分享", "verb", "🤲", "We share ideas.", "我們分享想法。"],
      ["problem", "問題", "noun", "❓", "We solve the problem.", "我們解決問題。"],
      ["together", "一起", "adverb", "👫", "We walk together.", "我們一起走。"],
      ["kind", "親切的", "adjective", "💛", "My friend is kind.", "我的朋友很親切。"],
      ["solve", "解決", "verb", "✅", "We solve it together.", "我們一起解決它。"]
    ],
    comprehension: {
      mainIdea: "helping a classmate",
      detailQuestion: "Why does Emma walk slowly?",
      detailAnswer: "because the books are heavy",
      inferenceQuestion: "What kind of person is Jason?",
      inferenceAnswer: "helpful and kind",
      writingPrompt: "Write about one time you helped a friend."
    }
  },
  {
    id: "science-fair",
    title: "The Science Fair",
    topic: "Science",
    level: 3,
    difficulty: "advanced",
    cover: "🔬",
    pattern: "Our project is about ____.",
    sentences: [
      ["The students are preparing for the science fair.", "學生們正在準備科學展。", "🔬"],
      ["Nina's team makes a project about clean water.", "Nina 的小組做一個關於乾淨水的專題。", "💧"],
      ["At first, their experiment does not work.", "一開始，他們的實驗沒有成功。", "⚗️"],
      ["They ask questions, try again, and improve the project.", "他們提問、再試一次，並改進專題。", "🛠️"],
      ["On Friday, Nina explains the result clearly.", "星期五，Nina 清楚地解釋結果。", "🗣️"]
    ],
    words: [
      ["science", "科學", "noun", "🔬", "Science is interesting.", "科學很有趣。"],
      ["experiment", "實驗", "noun", "⚗️", "The experiment works.", "實驗成功了。"],
      ["idea", "想法", "noun", "💡", "We have an idea.", "我們有一個想法。"],
      ["prepare", "準備", "verb", "📝", "We prepare for the fair.", "我們準備展覽。"],
      ["explain", "解釋", "verb", "🗣️", "Nina explains the result.", "Nina 解釋結果。"],
      ["result", "結果", "noun", "📊", "The result is clear.", "結果很清楚。"],
      ["project", "專題", "noun", "📌", "Our project is about water.", "我們的專題關於水。"],
      ["improve", "改進", "verb", "🛠️", "They improve the project.", "他們改進專題。"]
    ],
    comprehension: {
      mainIdea: "students improving a science project",
      detailQuestion: "What is Nina's project about?",
      detailAnswer: "clean water",
      inferenceQuestion: "What do the students do when the experiment fails?",
      inferenceAnswer: "they try again and improve it",
      writingPrompt: "Write 4 sentences about a school project."
    }
  },
  {
    id: "library-mystery",
    title: "The Library Mystery",
    topic: "Reading",
    level: 3,
    difficulty: "advanced",
    cover: "📚",
    pattern: "The clue is near the ____.",
    sentences: [
      ["Maya visits the library after lunch.", "Maya 午餐後去圖書館。", "📚"],
      ["She wants to return a book, but the return box is empty.", "她想還書，但還書箱是空的。", "📭"],
      ["She finds a small clue on the quiet shelf.", "她在安靜的書架上找到一個小線索。", "🔎"],
      ["The librarian helps her discover the missing book.", "圖書館員幫她找到不見的書。", "👩‍💼"],
      ["Maya learns to check carefully before leaving.", "Maya 學會離開前要仔細檢查。", "✅"]
    ],
    words: [
      ["library", "圖書館", "noun", "📚", "I read in the library.", "我在圖書館閱讀。"],
      ["mystery", "謎團", "noun", "🕵️", "The mystery is interesting.", "謎團很有趣。"],
      ["clue", "線索", "noun", "🔎", "The clue is on the shelf.", "線索在書架上。"],
      ["shelf", "書架", "noun", "📚", "The book is on the shelf.", "書在書架上。"],
      ["quiet", "安靜的", "adjective", "🤫", "The library is quiet.", "圖書館很安靜。"],
      ["borrow", "借", "verb", "📖", "I borrow a book.", "我借一本書。"],
      ["return", "歸還", "verb", "↩️", "I return the book.", "我還書。"],
      ["discover", "發現", "verb", "✨", "Maya discovers a clue.", "Maya 發現線索。"]
    ],
    comprehension: {
      mainIdea: "solving a small library problem",
      detailQuestion: "Where does Maya find the clue?",
      detailAnswer: "on the quiet shelf",
      inferenceQuestion: "What lesson does Maya learn?",
      inferenceAnswer: "to check carefully",
      writingPrompt: "Write 3 sentences about a book you like."
    }
  },
  {
    id: "saving-water",
    title: "Saving Water",
    topic: "Environment",
    level: 3,
    difficulty: "advanced",
    cover: "💧",
    pattern: "We should save ____.",
    sentences: [
      ["Kevin learns that clean water is important for every family.", "Kevin 學到乾淨的水對每個家庭都很重要。", "💧"],
      ["At home, he sees water running while he brushes his teeth.", "在家裡，他刷牙時看見水一直流。", "🚰"],
      ["He turns off the tap and tells his sister why.", "他關掉水龍頭並告訴妹妹原因。", "✅"],
      ["Small habits can help protect the earth.", "小習慣可以幫助保護地球。", "🌍"],
      ["Kevin's family starts saving water together.", "Kevin 的家人開始一起節約用水。", "👨‍👩‍👧"]
    ],
    words: [
      ["water", "水", "noun", "💧", "Water is important.", "水很重要。"],
      ["save", "節省", "verb", "✅", "We save water.", "我們節約用水。"],
      ["waste", "浪費", "verb", "🚫", "Do not waste water.", "不要浪費水。"],
      ["clean", "乾淨的", "adjective", "✨", "Clean water is important.", "乾淨的水很重要。"],
      ["earth", "地球", "noun", "🌍", "We protect the earth.", "我們保護地球。"],
      ["habit", "習慣", "noun", "🔁", "This is a good habit.", "這是好習慣。"],
      ["turn off", "關掉", "verb", "🚰", "Turn off the tap.", "關掉水龍頭。"],
      ["protect", "保護", "verb", "🛡️", "We protect nature.", "我們保護自然。"]
    ],
    comprehension: {
      mainIdea: "using small habits to save water",
      detailQuestion: "What does Kevin turn off?",
      detailAnswer: "the tap",
      inferenceQuestion: "Why does Kevin tell his sister?",
      inferenceAnswer: "he wants the family to save water together",
      writingPrompt: "Write 4 sentences about how to save water."
    }
  },
  {
    id: "new-student",
    title: "A New Student",
    topic: "School Life",
    level: 3,
    difficulty: "advanced",
    cover: "👋",
    pattern: "Welcome to our ____.",
    sentences: [
      ["A new student named Eric joins the class.", "一位叫 Eric 的新學生加入班級。", "👋"],
      ["He feels nervous because he does not know anyone.", "他感到緊張，因為他不認識任何人。", "😟"],
      ["Grace smiles and introduces him to her group.", "Grace 微笑並把他介紹給她的小組。", "😊"],
      ["Eric joins a game and starts to laugh.", "Eric 加入遊戲並開始笑。", "🎲"],
      ["By the end of the day, he feels brave and welcome.", "一天結束時，他感到勇敢且受歡迎。", "🌈"]
    ],
    words: [
      ["new", "新的", "adjective", "✨", "Eric is new.", "Eric 是新來的。"],
      ["nervous", "緊張的", "adjective", "😟", "He feels nervous.", "他感到緊張。"],
      ["welcome", "歡迎", "verb", "👋", "We welcome Eric.", "我們歡迎 Eric。"],
      ["introduce", "介紹", "verb", "🗣️", "Grace introduces Eric.", "Grace 介紹 Eric。"],
      ["classmate", "同學", "noun", "🧑‍🤝‍🧑", "He meets a classmate.", "他遇見一位同學。"],
      ["smile", "微笑", "verb", "😊", "Grace smiles.", "Grace 微笑。"],
      ["join", "加入", "verb", "➕", "Eric joins the game.", "Eric 加入遊戲。"],
      ["brave", "勇敢的", "adjective", "🦁", "He feels brave.", "他感到勇敢。"]
    ],
    comprehension: {
      mainIdea: "welcoming a new classmate",
      detailQuestion: "Why does Eric feel nervous?",
      detailAnswer: "he does not know anyone",
      inferenceQuestion: "How does Grace help Eric?",
      inferenceAnswer: "she welcomes him and introduces him",
      writingPrompt: "Write about how to welcome a new classmate."
    }
  },
  {
    id: "weekend-project",
    title: "The Weekend Project",
    topic: "Projects",
    level: 3,
    difficulty: "advanced",
    cover: "🛠️",
    pattern: "Our plan is to ____.",
    sentences: [
      ["Owen and his sister plan a weekend project.", "Owen 和妹妹計畫一個週末專案。", "📝"],
      ["They want to build a small bird house.", "他們想做一個小鳥屋。", "🐦"],
      ["First, they design the shape and find the tools.", "首先，他們設計形狀並找工具。", "📐"],
      ["The roof falls down, so they try a stronger idea.", "屋頂掉下來，所以他們嘗試更堅固的想法。", "🏠"],
      ["They finish because they use teamwork.", "他們完成了，因為他們合作。", "🤝"]
    ],
    words: [
      ["plan", "計畫", "verb", "📝", "We plan a project.", "我們計畫一個專案。"],
      ["weekend", "週末", "noun", "📅", "The weekend is fun.", "週末很好玩。"],
      ["project", "專案", "noun", "📌", "Our project is small.", "我們的專案很小。"],
      ["build", "建造", "verb", "🛠️", "They build a bird house.", "他們建造鳥屋。"],
      ["design", "設計", "verb", "📐", "They design the roof.", "他們設計屋頂。"],
      ["tool", "工具", "noun", "🔧", "We use a tool.", "我們使用工具。"],
      ["finish", "完成", "verb", "✅", "They finish the project.", "他們完成專案。"],
      ["teamwork", "團隊合作", "noun", "🤝", "Teamwork helps.", "團隊合作有幫助。"]
    ],
    comprehension: {
      mainIdea: "using teamwork to finish a project",
      detailQuestion: "What do Owen and his sister build?",
      detailAnswer: "a bird house",
      inferenceQuestion: "Why do they try a stronger idea?",
      inferenceAnswer: "because the roof falls down",
      writingPrompt: "Write 4 sentences about a project you want to build."
    }
  },
  {
    id: "talent-show",
    title: "The Talent Show",
    topic: "Performance",
    level: 3,
    difficulty: "advanced",
    cover: "🎤",
    pattern: "I feel ____ on stage.",
    sentences: [
      ["The school talent show is on Friday.", "學校才藝表演在星期五。", "🎤"],
      ["Sofia practices singing every day.", "Sofia 每天練習唱歌。", "🎵"],
      ["Before the show, she feels nervous on stage.", "表演前，她在舞台上感到緊張。", "😟"],
      ["Her friends cheer loudly from the audience.", "她的朋友在觀眾席大聲加油。", "👏"],
      ["Sofia performs well and gains confidence.", "Sofia 表現得很好，並獲得自信。", "🏆"]
    ],
    words: [
      ["talent", "才藝", "noun", "✨", "Everyone has a talent.", "每個人都有才藝。"],
      ["stage", "舞台", "noun", "🎭", "Sofia stands on stage.", "Sofia 站在舞台上。"],
      ["practice", "練習", "verb", "🎵", "She practices singing.", "她練習唱歌。"],
      ["nervous", "緊張的", "adjective", "😟", "She feels nervous.", "她感到緊張。"],
      ["perform", "表演", "verb", "🎤", "Sofia performs well.", "Sofia 表現很好。"],
      ["audience", "觀眾", "noun", "👥", "The audience cheers.", "觀眾加油。"],
      ["cheer", "加油", "verb", "👏", "Friends cheer loudly.", "朋友大聲加油。"],
      ["confidence", "自信", "noun", "🏆", "She gains confidence.", "她獲得自信。"]
    ],
    comprehension: {
      mainIdea: "practicing and gaining confidence",
      detailQuestion: "When is the talent show?",
      detailAnswer: "on Friday",
      inferenceQuestion: "Why does Sofia gain confidence?",
      inferenceAnswer: "because she practices and performs well",
      writingPrompt: "Write about a talent you want to show."
    }
  }
];

function makeLesson(seed: LessonSeed): Lesson {
  const words = seed.words.map(([word, meaning, part, image, example, translation]) => ({
    word,
    meaning,
    part,
    image,
    example,
    translation,
    level: `Level ${seed.level}`
  }));
  const sentences = seed.sentences.map(([en, zh, image]) => ({ en, zh, image }));
  const firstWord = words[0];
  const secondWord = words[1] || firstWord;
  const thirdWord = words[2] || firstWord;
  const firstSentence = sentences[0];
  const secondSentence = sentences[1] || firstSentence;
  const options = words.slice(0, 4).map((item) => item.word);
  const meaningOptions = words.slice(0, 4).map((item) => item.meaning);
  const read = [
    {
      id: `${seed.id}-read-word`,
      skill: "read" as const,
      type: "choice" as const,
      prompt: `Which word means「${firstWord.meaning}」?`,
      answer: firstWord.word,
      options
    },
    {
      id: `${seed.id}-read-detail`,
      skill: "read" as const,
      type: "choice" as const,
      prompt: seed.comprehension?.detailQuestion || `What is in the story?`,
      answer: seed.comprehension?.detailAnswer || firstWord.word,
      options: [seed.comprehension?.detailAnswer || firstWord.word, secondWord.word, thirdWord.word, seed.topic]
    },
    {
      id: `${seed.id}-read-main`,
      skill: "read" as const,
      type: "choice" as const,
      prompt: seed.difficulty === "advanced" ? "What is the story mainly about?" : "Choose the best story topic.",
      answer: seed.comprehension?.mainIdea || seed.topic,
      options: [seed.comprehension?.mainIdea || seed.topic, "a birthday song", "a lost toy", "a rainy morning"]
    }
  ];
  if (seed.comprehension?.inferenceQuestion && seed.comprehension.inferenceAnswer) {
    read.push({
      id: `${seed.id}-read-inference`,
      skill: "read",
      type: "choice",
      prompt: seed.comprehension.inferenceQuestion,
      answer: seed.comprehension.inferenceAnswer,
      options: [seed.comprehension.inferenceAnswer, "because it is raining", "because lunch is ready", "because there is no class"]
    });
  }
  return {
    id: seed.id,
    title: seed.title,
    topic: seed.topic,
    level: seed.level,
    difficulty: seed.difficulty,
    cover: seed.cover,
    pattern: seed.pattern,
    sentences,
    words,
    listen: [
      { id: `${seed.id}-listen-word`, skill: "listen", type: "choice", prompt: `聽單字，選出意思：${firstWord.word}`, audio: firstWord.word, answer: firstWord.meaning, options: meaningOptions },
      { id: `${seed.id}-listen-sentence`, skill: "listen", type: "choice", prompt: "聽句子，選出你聽到的句子", audio: secondSentence.en, answer: secondSentence.en, options: [secondSentence.en, firstWord.example, secondWord.example, thirdWord.example] },
      { id: `${seed.id}-listen-fill`, skill: "listen", type: "choice", prompt: `${firstSentence.en.replace(firstWord.word, "____")}`, audio: firstSentence.en, answer: firstWord.word, options }
    ],
    read,
    speak: [
      { id: `${seed.id}-speak-word-1`, prompt: "跟讀單字", target: firstWord.word },
      { id: `${seed.id}-speak-word-2`, prompt: "跟讀單字", target: secondWord.word },
      { id: `${seed.id}-speak-sentence`, prompt: "跟讀句子", target: firstSentence.en },
      { id: `${seed.id}-speak-own`, prompt: seed.difficulty === "advanced" ? "用本課單字說一句自己的想法" : "看圖說一句", target: seed.pattern.replace("____", firstWord.word) }
    ],
    write: [
      { id: `${seed.id}-write-pattern`, prompt: "完成句子", starter: seed.pattern, answerHint: `${firstWord.word} / ${secondWord.word}` },
      { id: `${seed.id}-write-story`, prompt: seed.difficulty === "advanced" ? "寫出故事中的重要細節" : "替換單字造句", starter: firstSentence.en.replace(firstWord.word, "____"), answerHint: firstWord.word },
      { id: `${seed.id}-write-own`, prompt: seed.comprehension?.writingPrompt || "寫一句自己的句子", starter: "I can write about ____.", answerHint: seed.topic.toLowerCase() }
    ],
    sortOrder: seed.difficulty === "beginner" ? 1000 + seed.level * 10 : seed.difficulty === "intermediate" ? 9000 + seed.level * 10 : 17000 + seed.level * 10,
    unlockMode: "previous"
  };
}

export const lessons: Lesson[] = [...coreLessons, ...extraLessonSeeds.map(makeLesson)];

export function normalizedLesson(lesson: Lesson): Lesson {
  const first = lessons[0];
  return {
    ...lesson,
    difficulty: lessonDifficulty(lesson),
    listen: lesson.listen.length ? lesson.listen : first.listen.map((q, index) => ({ ...q, id: `${lesson.id}-l${index}`, prompt: q.prompt.replace("Mia", lesson.title), audio: q.audio })),
    read: lesson.read.length ? lesson.read : first.read.map((q, index) => ({ ...q, id: `${lesson.id}-r${index}` })),
    speak: lesson.speak.length ? lesson.speak : lesson.words.slice(0, 5).map((word, index) => ({ id: `${lesson.id}-s${index}`, prompt: index < 2 ? "跟讀單字" : "跟讀句子", target: index < 2 ? word.word : word.example })),
    write: lesson.write.length ? lesson.write : [
      { id: `${lesson.id}-w1`, prompt: "完成句子", starter: lesson.pattern, answerHint: lesson.words[0]?.word || "word" },
      { id: `${lesson.id}-w2`, prompt: "改寫故事句型", starter: lesson.sentences[0]?.en.replace(".", " ____."), answerHint: "use a story word" },
      { id: `${lesson.id}-w3`, prompt: "寫一句自己的小故事", starter: "I like ____.", answerHint: "your idea" }
    ]
  };
}

const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };

export const appLessons = lessons
  .map((lesson, index) => ({ ...normalizedLesson(lesson), sortOrder: lesson.sortOrder ?? (index + 1) * 1000 }))
  .sort((a, b) => {
    const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (sortDiff) return sortDiff;
    const difficultyDiff = difficultyOrder[lessonDifficulty(a)] - difficultyOrder[lessonDifficulty(b)];
    if (difficultyDiff) return difficultyDiff;
    return a.title.localeCompare(b.title);
  });
