import type { Lesson } from "@/lib/types";

export const lessons: Lesson[] = [
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

export function normalizedLesson(lesson: Lesson): Lesson {
  const first = lessons[0];
  return {
    ...lesson,
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

export const appLessons = lessons.map(normalizedLesson);
