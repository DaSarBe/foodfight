// 所有可調整的數值都集中在這裡
window.FF = window.FF || {};

FF.CONFIG = {
  W: 540,
  H: 960,
  pot: { x: 270, y: 500, r: 205 },
  gf: { x: 270, y: 150, r: 58, hand: { x: 380, y: 230 } },
  bowl: { x: 270, y: 812 },
  playerRest: { x: 410, y: 770 },
  playerAnchor: { x: 560, y: 1060 },
  gfAnchor: { x: 430, y: 140 },
  chopLen: 200,
  maxFoods: 10,
  startSatRatio: 0.75,
  baseSatMax: 100,
  baseHitRadius: 38,
  basePlayerSpeed: 1500,   // 出筷速度 px/s
  carryTime: 0.8,          // 從鍋子到碗所需秒數
  itemCooldown: 0.8,
};

// raw: 幾秒後變剛好；perfect: 剛好維持幾秒；over: 過熟幾秒後消失
FF.FOODS = [
  { id: 'pork',     name: '豬肉片', emoji: '🥓', raw: 2.2, perfect: 2.6, over: 4, score: 10, sat: 11, weight: 5 },
  { id: 'shrimp',   name: '鮮蝦',   emoji: '🦐', raw: 3.2, perfect: 3.0, over: 4, score: 14, sat: 10, weight: 4 },
  { id: 'cabbage',  name: '高麗菜', emoji: '🥬', raw: 1.6, perfect: 3.2, over: 4, score: 6,  sat: 7,  weight: 4 },
  { id: 'ball',     name: '貢丸',   emoji: '🧆', raw: 4.5, perfect: 4.0, over: 5, score: 12, sat: 12, weight: 4 },
  { id: 'fishcake', name: '魚板',   emoji: '🍥', raw: 3.0, perfect: 3.5, over: 5, score: 9,  sat: 9,  weight: 3 },
  { id: 'dumpling', name: '蛋餃',   emoji: '🥟', raw: 3.8, perfect: 3.2, over: 4, score: 13, sat: 13, weight: 3 },
  { id: 'corn',     name: '玉米',   emoji: '🌽', raw: 5.0, perfect: 4.5, over: 5, score: 11, sat: 10, weight: 2 },
  { id: 'mushroom', name: '香菇',   emoji: '🍄', raw: 2.6, perfect: 3.0, over: 4, score: 7,  sat: 6,  weight: 3 },
];

FF.RARE_FOODS = [
  { id: 'wagyu',   name: '和牛',   emoji: '🥩', raw: 2.4, perfect: 2.4, over: 3, score: 60, sat: 25, rare: true },
  { id: 'lobster', name: '龍蝦',   emoji: '🦞', raw: 4.0, perfect: 2.8, over: 3, score: 80, sat: 28, rare: true },
  { id: 'crab',    name: '帝王蟹', emoji: '🦀', raw: 4.5, perfect: 3.0, over: 3, score: 70, sat: 26, rare: true },
  { id: 'oyster',  name: '生蠔',   emoji: '🦪', raw: 2.0, perfect: 2.2, over: 3, score: 55, sat: 18, rare: true },
];

// 難度曲線（w = 第幾波，每 30 秒一波）
FF.DIFF = {
  waveLength: 30,
  wave: t => Math.floor(t / 30) + 1,
  spawnInterval: w => Math.max(0.5, 1.25 - 0.08 * (w - 1)),
  gfThink: w => (w === 1 ? 1.9 : Math.max(0.2, 1.45 - 0.13 * (w - 2))),
  gfReach: w => Math.min(1600, 480 + 90 * (w - 1)),
  strikeChance: w => Math.min(0.8, 0.12 + 0.06 * (w - 1)),
  warnTime: w => Math.max(0.2, 0.6 - 0.04 * (w - 1)),
  fakeChance: w => (w < 3 ? 0 : Math.min(0.5, 0.15 + 0.05 * (w - 3))),
  // 後期不封頂：肚子越餓越快、她越來越小氣、越來越難消氣
  satDrain: w => 2.0 + 0.4 * (w - 1),
  angerPerGrab: w => 2 + 0.25 * (w - 1),
  angerDecay: w => Math.max(0.3, 1.2 - 0.08 * (w - 1)),
  eventInterval: w => Math.max(6, 14 - (w - 3)),
};

FF.UPGRADES = [
  { id: 'speed',    name: '筷子速度', icon: '⚡', base: 30, max: 6, desc: lv => `出筷速度 +${lv * 12}%` },
  { id: 'reach',    name: '夾取範圍', icon: '🎯', base: 25, max: 6, desc: lv => `點擊判定 +${lv * 7}px` },
  { id: 'stomach',  name: '大胃王',   icon: '🍚', base: 40, max: 6, desc: lv => `飽足感上限 +${lv * 15}` },
  { id: 'patience', name: '好脾氣',   icon: '😇', base: 40, max: 6, desc: lv => `女友怒氣上升 -${lv * 8}%` },
  { id: 'grip',     name: '握力',     icon: '✊', base: 35, max: 6, desc: lv => `閃避時間 +${(lv * 0.05).toFixed(2)}秒、被打機率 -${lv * 3}%` },
  { id: 'greedy',   name: '飯票加成', icon: '🎫', base: 60, max: 6, desc: lv => `結算飯票 +${lv * 10}%` },
];
FF.upgradeCost = (u, lv) => Math.round(u.base * Math.pow(1.55, lv));

FF.ITEMS = [
  { id: 'chopsticks', name: '公筷',     icon: '🥢', price: 40, dur: 5, desc: '5 秒內出筷加倍快、必搶贏、不會被打掉' },
  { id: 'cute',       name: '撒嬌',     icon: '🥺', price: 50, dur: 0, desc: '女友怒氣立刻 -35' },
  { id: 'soup',       name: '加湯',     icon: '🍲', price: 35, dur: 8, desc: '過熟的食物變回剛好，8 秒內熟得比較慢' },
  { id: 'phone',      name: '手機訊息', icon: '📱', price: 45, dur: 5, desc: '女友分心滑手機 5 秒，不搶也不打' },
];

FF.TICKETS = {
  perSecond: 0.3,
  perScore: 0.03,
  perWave: 6,
  min: 5,
};

FF.LINES = {
  start: ['今天我請客，但你別想贏我～', '先說好，蝦子都是我的', '開動！手腳快一點喔'],
  steal: ['欸！那是我先看到的！', '你很故意欸', '我筷子都伸過去了耶！', '蛤？你搶我的？'],
  claim: ['這塊是我的喔！不准動！', '這個我要～誰都不准搶', '那塊留給我喔❤️'],
  claimStolen: ['我不是說那是我的嗎！？', '好，你完了', '你今天很敢喔'],
  eat: ['好好吃～', '嗯～讚', '這家真的不錯', '燙燙燙…但好吃'],
  eatFav: ['我最愛這個了！❤️', '嗚嗚好幸福', '還是你懂我～'],
  strike: ['想得美～', '給我放下！', '嘿嘿打到了', '你的筷子太慢了啦'],
  dodged: ['蛤！你閃什麼啦', '可惡…', '下次一定打到你'],
  raw: ['生的你也吃喔？笑死', '肚子痛不要找我', '還沒熟啦笨蛋'],
  angry: ['我真的要生氣了喔', '你今天是來吃火鍋還是來氣我的？', '再搶一個試試看'],
  hungry: ['你怎麼都不吃？減肥喔？', '你都讓我吃，好貼心～', '多吃一點啦'],
  phone: ['等等，我回一下訊息…', '我閨蜜傳限動給我耶', '欸你看這隻貓好可愛'],
  cute: ['哼…好啦原諒你一次', '討厭啦～', '好啦好啦不氣了'],
  spicy: ['哇這鍋好辣！', '辣辣辣！東西熟好快！'],
  steam: ['好多蒸氣都看不到啦', '眼鏡起霧了啦！'],
  rare: ['那個我的！！', '哇！今天有好料！', '這個絕對要搶到'],
  fake: ['騙你的～', '嘿嘿，假動作'],
  soup: ['加湯囉～', '湯快乾了，好險'],
};

FF.ENDINGS = {
  anger: {
    title: '她生氣了…',
    lines: ['「你自己吃個夠吧！」（她轉頭不理你）', '「下次你自己來吃！」', '「我要回家了，帳你付。」'],
  },
  hunger: {
    title: '你餓昏了…',
    lines: ['「誰叫你都讓我吃～」（她滿足地摸肚子）', '「欸你還好嗎？要不要再點一盤？」', '「你也太紳士了吧，吃都沒吃」'],
  },
  quit: {
    title: '提早結帳',
    lines: ['「這麼快就不吃了？」', '「那剩下的都我的囉～」'],
  },
};

// 結算評分：依存活秒數分級（由高到低比對），評語依結束原因不同
FF.GRADES = [
  {
    grade: 'S', minTime: 300, title: '金筷男友', stars: 5, color: '#e0a800',
    anger: ['你這樣跟我搶，到底是想吃火鍋還是想分手？…好啦，其實有點帥。', '我承認你是火鍋戰神，但今晚的碗你洗。'],
    hunger: ['你根本是火鍋界的紳士，我宣布今天的帳單我付！', '讓我吃這麼多還撐這麼久，你是不是偷偷在桌下吃零食？'],
    quit: ['打得這麼好還提早結帳，是要留點面子給我嗎？'],
  },
  {
    grade: 'A', minTime: 200, title: '銀筷男友', stars: 4, color: '#8fa3b8',
    anger: ['跟你吃火鍋好刺激，生氣歸生氣，下次還要來。', '你的手速我給過，你的良心我還在考慮。'],
    hunger: ['你都讓我吃這麼多，好啦…今天男友分數加十分。', '你是用愛在餵我吧？可是你自己快昏倒了欸。'],
    quit: ['表現不錯，結帳的時候帥一點就更好了。'],
  },
  {
    grade: 'B', minTime: 120, title: '木筷男友', stars: 3, color: '#b07a45',
    anger: ['有點本事喔，不過最後那塊你真的不該搶。', '及格啦，但我的蝦子你要還我。'],
    hunger: ['差一點就能吃飽了，下次記得多夾幾塊給自己。', '你很懂得讓，但也要懂得吃好嗎？'],
    quit: ['普普通通，下次再加油囉～'],
  },
  {
    grade: 'C', minTime: 60, title: '塑膠筷男友', stars: 2, color: '#7aa6c2',
    anger: ['還行啦，但搶我的肉這件事我會記到下次吵架。', '你搶東西的樣子，讓我重新思考了我們的未來。'],
    hunger: ['你很貼心一直讓我，但我不想跟一個餓昏的人約會欸。', '你是來看我吃的嗎？我又不是吃播。'],
    quit: ['這麼快就不吃了？我才剛熱身欸。'],
  },
  {
    grade: 'D', minTime: 0, title: '免洗筷男友', stars: 1, color: '#9a9a9a',
    anger: ['才剛開動就把我惹毛，你是不是不想約會了？', '湯都還沒滾你就把我氣死了，紀錄喔。'],
    hunger: ['你筷子都沒拿穩就餓昏了…我先叫救護車還是再點一盤？', '你是第一次用筷子嗎？要不要幫你拿叉子？'],
    quit: ['這麼快就結帳？是不是偷偷約了別人吃宵夜？'],
  },
];

// 依本局數據產生幽默短評，依序檢查，最多取兩則
FF.QUIPS = [
  r => r.newRecord && '🏆 新紀錄！她說這是你們交往以來你最認真的一次。',
  r => r.stats.perfect === 0 && r.time > 20 && '🫗 一塊完美的都沒夾到，你是來喝湯的嗎？',
  r => r.stats.raw >= 3 && `🤢 生的吃了 ${r.stats.raw} 次，她已經幫你查好腸胃科門診時間。`,
  r => r.stats.dodges >= 8 && `🥋 閃過 ${r.stats.dodges} 次筷子攻擊，她懷疑你偷偷練過詠春。`,
  r => r.stats.knocked >= 5 && `💥 被打掉 ${r.stats.knocked} 次，她說你的筷子是裝飾用的。`,
  r => r.stats.bestCombo >= 10 && `🔥 最高 ${r.stats.bestCombo} 連擊，老闆想挖你去當夾肉師傅。`,
  r => r.stats.steals >= 5 && `😈 搶了她 ${r.stats.steals} 次，你們的感情正在小火慢燉。`,
  r => r.stats.gfAte >= 15 && `🐷 她吃了 ${r.stats.gfAte} 口，今天的熱量都算你的。`,
  r => r.reason === 'hunger' && '📸 你餓到昏倒，她邊吃邊幫你拍了限動。',
  r => r.reason === 'anger' && r.time < 40 && '🧊 開局不到 40 秒就翻臉，冷戰紀錄刷新中。',
  r => r.stats.gfAte <= 2 && r.time > 30 && `🍗 她只吃到 ${r.stats.gfAte} 口，回家路上記得請她吃雞排。`,
  r => r.stats.dodges >= 3 && `💨 閃了 ${r.stats.dodges} 次，她的筷子已經在考慮轉職。`,
  r => r.stats.eaten >= 30 && `🍚 你吃了 ${r.stats.eaten} 口，褲頭應該已經解開了。`,
  r => '🍲 火鍋還在滾，你們的愛情也是。（大概）',
];
