import type { Lesson } from "@/lib/types";

export const bossTravelLesson: Lesson = {
  id: "boss-modern-travel",
  title: "The Evolution of Modern Travel",
  topic: "Responsible Travel",
  level: 4,
  difficulty: "advanced",
  cover: "🌍",
  pattern: "Travel smart. Travel responsibly.",
  unlockMode: "open",
  sentences: [
    {
      en: "Travel has changed a lot in recent years. In the past, many people booked package tours at travel agencies. Today, travelers can use a smartphone to plan their own trips. They can compare flights, choose hotels, and arrange local transport by themselves.",
      zh: "近年來，旅行有很大的改變。以前許多人會在旅行社預訂套裝行程。現在，旅客可以用手機規劃自己的旅程，比較航班、選擇飯店，並自行安排當地交通。",
      image: "📱"
    },
    {
      en: "Budget airlines and online booking websites have made international travel cheaper and easier. People can read reviews before they book. They can also stay in local apartments instead of traditional hotels. This may save money and help them experience local life.",
      zh: "廉價航空與線上訂房網站讓國際旅行變得更便宜、更方便。人們能在預訂前閱讀評論，也可以住在當地公寓而非傳統飯店，既可能省錢，也能體驗當地生活。",
      image: "✈️"
    },
    {
      en: "However, too many visitors can cause problems. Popular cities, islands, and natural areas may become crowded. This is called overtourism. It can damage the environment and make life difficult for local people.",
      zh: "然而，過多旅客也會造成問題。熱門城市、島嶼和自然景區可能變得十分擁擠，這稱為過度旅遊。它可能破壞環境，也讓當地居民生活更困難。",
      image: "🏙️"
    },
    {
      en: "Because of this, sustainable tourism is becoming more important. Responsible travelers try to reduce their negative impact. They may stay at eco-friendly hotels, travel during the off-peak season, support local businesses, and take trains instead of short flights.",
      zh: "因此，永續旅遊變得越來越重要。負責任的旅客會努力減少負面影響，例如入住環保飯店、淡季旅行、支持當地商家，以及用火車取代短程航班。",
      image: "🚆"
    },
    {
      en: "Modern travel is not only about visiting famous places. It is also about making smart and responsible choices. If travelers care for the places they visit, beautiful destinations can remain safe for future generations.",
      zh: "現代旅行不只是參觀著名景點，也包括做出聰明且負責任的選擇。如果旅客愛護到訪的地方，美麗的景點就能留給未來世代。",
      image: "🌱"
    }
  ],
  words: [
    { word: "flexibility", meaning: "彈性", part: "noun", image: "🔄", example: "Modern travelers enjoy flexibility.", translation: "現代旅客享受彈性。", level: "Boss B1" },
    { word: "package tour", meaning: "套裝行程", part: "noun", image: "🧳", example: "My family booked a package tour.", translation: "我的家人預訂了套裝行程。", level: "Boss B1" },
    { word: "budget airline", meaning: "廉價航空", part: "noun", image: "✈️", example: "A budget airline can make travel cheaper.", translation: "廉價航空能讓旅行更便宜。", level: "Boss B1" },
    { word: "accommodation", meaning: "住宿", part: "noun", image: "🏨", example: "We found clean accommodation online.", translation: "我們在網路上找到乾淨的住宿。", level: "Boss B1" },
    { word: "review", meaning: "評論", part: "noun", image: "⭐", example: "Read the reviews before booking.", translation: "預訂前先閱讀評論。", level: "Boss B1" },
    { word: "overtourism", meaning: "過度旅遊", part: "noun", image: "🚶", example: "Overtourism can harm popular cities.", translation: "過度旅遊可能傷害熱門城市。", level: "Boss B1" },
    { word: "sustainable", meaning: "永續的", part: "adjective", image: "🌱", example: "We need sustainable travel choices.", translation: "我們需要永續的旅行選擇。", level: "Boss B1" },
    { word: "environmental footprint", meaning: "環境足跡", part: "noun", image: "👣", example: "Train travel can reduce your environmental footprint.", translation: "搭火車旅行能減少環境足跡。", level: "Boss B1" },
    { word: "off-peak", meaning: "非旺季的", part: "adjective", image: "📅", example: "We travel during the off-peak season.", translation: "我們在淡季旅行。", level: "Boss B1" },
    { word: "carbon emissions", meaning: "碳排放", part: "noun", image: "🌫️", example: "Trains often produce fewer carbon emissions.", translation: "火車通常產生較少碳排放。", level: "Boss B1" },
    { word: "conservation", meaning: "保育", part: "noun", image: "🌳", example: "Tourism should support conservation.", translation: "旅遊應該支持保育。", level: "Boss B1" },
    { word: "responsible", meaning: "負責任的", part: "adjective", image: "🤝", example: "A responsible traveler respects local people.", translation: "負責任的旅客尊重當地居民。", level: "Boss B1" }
  ],
  listen: [
    { id: "boss-l1", skill: "listen", type: "choice", prompt: "暖身：聽單字，選出意思：flexibility", audio: "flexibility", answer: "彈性", options: ["彈性", "污染", "住宿", "評論"] },
    { id: "boss-l2", skill: "listen", type: "choice", prompt: "暖身：聽單字，選出意思：overtourism", audio: "overtourism", answer: "過度旅遊", options: ["永續旅遊", "過度旅遊", "套裝行程", "淡季旅行"] },
    { id: "boss-l3", skill: "listen", type: "trueFalse", prompt: "理解：Modern travelers can plan trips with smartphones.", audio: "Modern travelers can plan trips with smartphones.", answer: "True", options: ["True", "False"] },
    { id: "boss-l4", skill: "listen", type: "choice", prompt: "理解：Why do people read reviews?", audio: "Travelers read reviews before they book flights or accommodation.", answer: "To make better choices before booking.", options: ["To make better choices before booking.", "To learn how to fly a plane.", "To avoid all local businesses.", "To make hotels more expensive."] },
    { id: "boss-l5", skill: "listen", type: "choice", prompt: "理解：What problem can too many visitors cause?", audio: "Too many visitors can damage the environment and frustrate local people.", answer: "Environmental damage and local frustration.", options: ["Environmental damage and local frustration.", "Cheaper train tickets.", "More renewable energy.", "Less crowded streets."] },
    { id: "boss-l6", skill: "listen", type: "choice", prompt: "應用：Which traveler is making a sustainable choice?", audio: "Mina takes a train instead of a short flight and stays at an eco-friendly hotel.", answer: "Mina", options: ["Mina", "A traveler who wastes water", "A traveler who leaves rubbish", "A traveler who ignores local rules"] },
    { id: "boss-l7", skill: "listen", type: "trueFalse", prompt: "應用：Off-peak travel can support local businesses during more months of the year.", audio: "Off-peak travel can support local businesses during more months of the year.", answer: "True", options: ["True", "False"] },
    { id: "boss-l8", skill: "listen", type: "choice", prompt: "Boss 題：What is the speaker's main message?", audio: "Travel is easier than before, but travelers should use technology wisely and protect the places they visit.", answer: "Travelers should enjoy travel and protect destinations.", options: ["Travelers should enjoy travel and protect destinations.", "All flights should stop immediately.", "Technology has made travel impossible.", "Package tours are the only good choice."] }
  ],
  read: [
    { id: "boss-r1", skill: "read", type: "choice", prompt: "暖身：What can travelers use to plan their own trips?", answer: "A smartphone", options: ["A smartphone", "Only a paper map", "A travel agency building", "A school computer room"] },
    { id: "boss-r2", skill: "read", type: "choice", prompt: "暖身：What does accommodation mean?", answer: "A place to stay", options: ["A place to stay", "A type of plane", "A local meal", "A travel review"] },
    { id: "boss-r3", skill: "read", type: "trueFalse", prompt: "理解：Online platforms allow travelers to compare prices.", answer: "True", options: ["True", "False"] },
    { id: "boss-r4", skill: "read", type: "choice", prompt: "理解：Why may travelers choose local apartments?", answer: "To save money and experience local life.", options: ["To save money and experience local life.", "To avoid meeting local people.", "To increase carbon emissions.", "To make cities more crowded."] },
    { id: "boss-r5", skill: "read", type: "choice", prompt: "理解：What is overtourism?", answer: "When too many visitors create problems for a place.", options: ["When too many visitors create problems for a place.", "When nobody visits a city.", "When trains are cheaper than planes.", "When hotels use renewable energy."] },
    { id: "boss-r6", skill: "read", type: "choice", prompt: "應用：Which action best supports local people?", answer: "Buying from local businesses during the off-peak season.", options: ["Buying from local businesses during the off-peak season.", "Leaving rubbish on a beach.", "Using extra water at a hotel.", "Ignoring local customs."] },
    { id: "boss-r7", skill: "read", type: "choice", prompt: "應用：Why does the writer mention train journeys?", answer: "They can reduce carbon emissions and offer good views.", options: ["They can reduce carbon emissions and offer good views.", "They are always faster than flying.", "They make overtourism worse.", "They do not need any energy."] },
    { id: "boss-r8", skill: "read", type: "choice", prompt: "Boss 題：Which title best matches the article?", answer: "Travel Smart, Travel Responsibly", options: ["Travel Smart, Travel Responsibly", "Why Nobody Should Travel", "The World's Most Expensive Hotels", "How to Become a Pilot"] },
    { id: "boss-r9", skill: "read", type: "choice", prompt: "Boss 題：What can we infer about future travel?", answer: "Travelers will need to balance convenience with responsibility.", options: ["Travelers will need to balance convenience with responsibility.", "Technology will completely disappear.", "All tourists will use package tours.", "Environmental problems will solve themselves."] }
  ],
  speak: [
    { id: "boss-s1", prompt: "暖身：清楚朗讀關鍵字", target: "sustainable tourism" },
    { id: "boss-s2", prompt: "暖身：清楚朗讀關鍵字", target: "environmental footprint" },
    { id: "boss-s3", prompt: "理解：朗讀完整句子", target: "Modern travelers can plan their own trips with a smartphone." },
    { id: "boss-s4", prompt: "理解：朗讀完整句子", target: "Overtourism can damage the environment and frustrate local people." },
    { id: "boss-s5", prompt: "應用：提出一個建議", target: "Travelers should support local businesses." },
    { id: "boss-s6", prompt: "應用：比較兩種交通方式", target: "Taking a train can be greener than taking a short flight." },
    { id: "boss-s7", prompt: "Boss 題：表達自己的旅行原則", target: "I want to travel responsibly because I care about local people and nature." }
  ],
  write: [
    { id: "boss-w1", prompt: "暖身：完成永續旅行建議", starter: "Travelers should ____ local businesses.", answerHint: "support" },
    { id: "boss-w2", prompt: "暖身：完成原因句", starter: "Taking a train is greener because it can reduce ____.", answerHint: "carbon emissions" },
    { id: "boss-w3", prompt: "理解：用自己的話解釋過度旅遊", starter: "Overtourism happens when ____.", answerHint: "too many visitors create problems / too many tourists visit one place" },
    { id: "boss-w4", prompt: "應用：提出一個負責任的旅行選擇", starter: "On my next trip, I will ____ because ____.", answerHint: "use a train / stay at an eco-friendly hotel / travel off-peak" },
    { id: "boss-w5", prompt: "Boss 題：寫出兩句旅行承諾", starter: "I will travel responsibly by ____. I will also ____.", answerHint: "support local businesses / reduce waste / respect local people / protect nature" }
  ]
};

