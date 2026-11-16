// 新內容的數值與文案：她的模式（女友個性）、鍋底、每日任務、成就、紀念日挑戰
// 規則邏輯在 variants.js / challenge.js / progress.js，這裡只放資料
window.FF = window.FF || {};

// ---------- 她今天的模式（女友個性） ----------
// mul 都是倍率（1 = 跟預設一樣）：
//   think 想下一步的時間（越小越快）、reach 出筷速度、strike 打你筷子的機率、fake 假動作機率
//   angerGain 怒氣上升、decay 怒氣自然消退、calm 她自己吃到東西消的氣、chew 嚼的時間
//   feed 餵她消的氣、cute 撒嬌消的氣、ult 大絕招發動機率、ultCd 大絕招冷卻、sat 你肚子餓的速度
// ultAngerMin 怒氣多少以上會放大招；sweepBias 放大招時選「全鍋掃蕩」的機率（其餘是筷子連打）
// look 外觀：hair 髮色、style 髮型（long 長髮 / buns 丸子頭 / twin 雙馬尾 / short 短髮綁馬尾）、shirt 衣服、acc 配件
// unlock：price 飯票價格；cond 條件（達成就免費解鎖），stat 對應終身統計
// ticketBonus：一般模式結算飯票加成（比較難搞的模式給多一點）
FF.PERSONAS = [
  {
    id: 'default', name: '日常模式', icon: '😊',
    desc: '平常的她：會搶、會打、會生氣，也很好哄。',
    tip: '最平衡，第一次玩選這個',
    mul: {},
    look: { hair: '#4a2c22', style: 'long', shirt: '#ff8fb1', acc: 'clip', accColor: '#ff6fa5' },
    lines: {},
  },
  {
    id: 'foodie', name: '吃貨模式', icon: '🤤',
    desc: '餓了一整天的她：手超快、搶超兇，不太生氣；但看她吃得那麼香，你也會餓得特別快。',
    tip: '小心被她吃光，你會先餓昏',
    unlock: { price: 300 },
    mul: { think: 0.5, reach: 1.45, strike: 0.7, angerGain: 0.95, decay: 1, calm: 0.3, chew: 0.6, ult: 0.7, feed: 0.85, sat: 1.5 },
    ultAngerMin: 85, sweepBias: 0.9,
    look: { hair: '#7a4426', style: 'buns', shirt: '#ffc94a', acc: 'bib', accColor: '#ffffff' },
    lines: {
      start: ['我今天中午沒吃，全部都是我的', '先說好，我今天是來吃到飽的', '老闆！肉先上三盤！'],
      steal: ['那塊我盯很久了欸！', '你搶我的食物＝搶我的命', '我的胃在哭你知道嗎'],
      eat: ['嗯～～再來！', '好吃到想哭', '這口值得', '下一塊在哪'],
      eatFav: ['我可以為了這個再活一百年', '天啊是我的最愛！！'],
      angry: ['我餓的時候脾氣很差你知道吧', '再搶我就要吃你了喔'],
      hungry: ['你不吃喔？那我幫你吃～', '你飽了？那剩下都給我囉'],
      ultSweep: ['開吃！！全部都是我的！', '吃到飽模式，啟動！', '我要把這鍋喝乾！'],
      fedLove: ['啊～嗯！再一口！', '你餵的特別好吃欸', '還有嗎還有嗎'],
      fedFull: ['…我居然吃不下了？', '等等，讓我消化一下'],
    },
  },
  {
    id: 'tsundere', name: '傲嬌模式', icon: '😤',
    desc: '嘴上說不要的她：一點小事就爆氣，但撒嬌跟餵她的效果加倍。',
    tip: '別硬搶，多餵她、多撒嬌',
    unlock: { price: 500, cond: { stat: 'fed', n: 40, text: '累計餵她 40 口' } },
    ticketBonus: 0.15,
    mul: { angerGain: 1.25, decay: 0.9, calm: 0.85, feed: 2, cute: 2, strike: 1.05, ult: 1.1 },
    look: { hair: '#c98a3a', style: 'twin', shirt: '#b89cff', acc: 'ribbon', accColor: '#e8414f' },
    lines: {
      start: ['我、我才不是想跟你吃火鍋咧', '哼，今天就勉強陪你吃', '不准搶喔…我是說，隨便你啦'],
      steal: ['你、你很過分欸！', '哼！我才不在乎那塊咧！…還我！', '笨蛋！那是我的！'],
      eat: ['…還、還可以啦', '普通好吃而已', '哼，不錯'],
      eatFav: ['我才沒有很開心咧！（超開心）', '才、才不是因為你點的'],
      angry: ['哼！不理你了！', '你是笨蛋嗎？', '我真的生氣了喔！…真的喔！'],
      cute: ['…哼，這次就原諒你', '誰、誰要你撒嬌啦…好啦', '笨蛋…（臉紅）'],
      dodged: ['哼，算你運氣好', '我是故意打歪的！'],
      fedLove: ['我、我自己會吃啦…啊～', '…還算有點良心', '哼，下不為例喔❤️'],
      fedFav: ['你怎麼知道…我才沒有很感動！', '笨蛋…你居然記得'],
      fedFull: ['夠了啦笨蛋，你自己也要吃', '我又不是豬！'],
      claimStolen: ['我說那是我的！笨蛋！', '絕交！三分鐘！'],
    },
  },
  {
    id: 'fighter', name: '戰鬥模式', icon: '🥋',
    desc: '剛下課的跆拳道黑帶：超愛打你筷子、大絕招放不停，但搶食比較慢。',
    tip: '練好閃避，看到 ❗ 就點',
    unlock: { price: 800, cond: { stat: 'dodges', n: 60, text: '累計閃避 60 次' } },
    ticketBonus: 0.15,
    mul: { think: 1.3, reach: 0.8, strike: 1.45, fake: 1.3, ult: 2.6, ultCd: 0.55 },
    ultAngerMin: 62, sweepBias: 0.2,
    look: { hair: '#1f1a1a', style: 'short', shirt: '#e8414f', acc: 'headband', accColor: '#ffffff' },
    lines: {
      start: ['今天的火鍋，是一場修行', '筷子拿好，我不會手下留情', '先熱身一下…喝！'],
      strike: ['喝！！', '看招！', '筷子道，一本！', '太慢了！'],
      dodged: ['不錯嘛，有練過喔？', '再來！', '哼，下一招你閃不掉'],
      angry: ['你準備好挨打了嗎', '我手已經熱好了喔'],
      ultCombo: ['奧義・筷影連擊！', '接得住就算你贏', '來吧，夾起來！'],
      ultComboWin: ['可惡…你是不是偷偷去道館', '好，我認可你是對手'],
      ultComboLose: ['一本！勝負已分！', '回去再練一百年吧'],
      fedLove: ['…補充體力，謝啦', '嗯，蛋白質到位'],
    },
  },
];

// ---------- 鍋底 ----------
// cook 熟的速度倍率；score 分數倍率；satDrain 肚子餓的速度倍率；angerDecay 她怒氣自然消退倍率；anger 她怒氣上升倍率（沒寫＝1）
// spicyMul 「辣鍋」干擾事件發生時再乘的倍率
// split：鴛鴦鍋左右兩半各自的熟度倍率（食物不會越過中間的隔板）
// soup：湯的顏色 [亮, 中, 暗, 泡泡]；spicySoup：辣鍋事件時的顏色
FF.BROTHS = [
  {
    id: 'classic', name: '昆布原味鍋', icon: '🍲', short: '原味',
    desc: '清甜昆布湯底，熟度正常，什麼都不加成。',
    cook: 1, score: 1, satDrain: 1, spicyMul: 1.8,
    soup: ['#ffd27d', '#e9a23b', '#b8691b', '#fff6dc'],
    spicySoup: ['#ff7a45', '#d7301f', '#8f1a0e', '#ffd0b0'],
    spicyText: '🌶️ 辣鍋！熟得更快',
  },
  {
    id: 'milk', name: '牛奶鍋', icon: '🥛', short: '牛奶',
    desc: '溫和香濃：食物熟得慢、剛好的時間比較長，奶香讓她心情好一點、你也比較不容易餓，但分數 -15%。新手友善。',
    cook: 0.75, score: 0.85, satDrain: 0.92, angerDecay: 1.15, spicyMul: 1.6,
    soup: ['#fffaf0', '#f3e6cf', '#d9c3a0', '#ffffff'],
    spicySoup: ['#ffd1c4', '#f59a83', '#c86a55', '#fff0ea'],
    spicyText: '🌶️ 她偷加辣油！牛奶鍋變粉紅色',
  },
  {
    id: 'mala', name: '麻辣鍋', icon: '🌶️', short: '麻辣',
    desc: '紅通通的大辣鍋：食物熟得快、剛好的時間短，分數 +25%；但吃辣火氣大，她的怒氣上升 +7%。',
    unlock: { price: 200 },
    cook: 1.35, score: 1.25, satDrain: 1, anger: 1.07, spicyMul: 1.4,
    soup: ['#ff8a4c', '#d23a1f', '#7e140a', '#ffc2a0'],
    spicySoup: ['#ff5a2a', '#b3140a', '#5a0804', '#ffb08a'],
    spicyText: '🔥 麻辣鍋再加辣！熟到飛起來',
  },
  {
    id: 'yuanyang', name: '鴛鴦鍋', icon: '☯️', short: '鴛鴦',
    desc: '左邊麻辣熟得快、右邊清湯熟得慢，食物不會越過中間隔板。分數 +8%。',
    unlock: { price: 400 },
    cook: 1, score: 1.08, satDrain: 1, spicyMul: 1.6,
    split: { left: 1.4, right: 0.75 },
    soup: ['#ffe7b0', '#f0c77a', '#c79a4a', '#fffbe8'],            // 右半邊（清湯）
    soupLeft: ['#ff8a4c', '#d23a1f', '#7e140a', '#ffc2a0'],        // 左半邊（麻辣）
    spicySoup: ['#ffb27a', '#e8743a', '#b04a18', '#ffe0c8'],
    spicySoupLeft: ['#ff5a2a', '#b3140a', '#5a0804', '#ffb08a'],
    spicyText: '🌶️ 兩邊都加辣！熟得更快',
  },
];

// ---------- 每日任務 ----------
// stat 對應本局統計；single＝單局型（取本局最好的一次，不累計）；normalOnly＝只算一般模式
FF.MISSIONS = [
  { id: 'dodge',    icon: '💨', stat: 'dodges',     targets: [6, 10], reward: 40, text: n => `閃過她的筷子 ${n} 次` },
  { id: 'save',     icon: '🦸', stat: 'saves',      targets: [1],     reward: 60, text: n => `英雄救美 ${n} 次（車子撞進來時帶她換桌）` },
  { id: 'rare',     icon: '🦞', stat: 'rareEaten',  targets: [2, 3],  reward: 45, text: n => `自己吃到 ${n} 塊稀有食材` },
  { id: 'feed',     icon: '🥄', stat: 'fed',        targets: [5, 8],  reward: 35, text: n => `餵她吃 ${n} 口` },
  { id: 'wave',     icon: '🌊', stat: 'wave',       targets: [3, 4],  reward: 45, single: true, normalOnly: true, text: n => `單局撐到第 ${n} 波（一般模式）` },
  { id: 'goodDeal', icon: '🤑', stat: 'goodDeals',  targets: [1],     reward: 45, text: n => `買到 ${n} 次真的划算的推銷` },
  { id: 'perfect',  icon: '✨', stat: 'perfect',    targets: [12, 15], reward: 40, single: true, text: n => `單局完美夾取 ${n} 次` },
  { id: 'combo',    icon: '🔥', stat: 'bestCombo',  targets: [6, 8],  reward: 40, single: true, text: n => `單局打出 ${n} 連擊` },
  { id: 'ultClear', icon: '🥷', stat: 'ultCleared', targets: [1, 2],  reward: 50, text: n => `破解她的大絕招 ${n} 次` },
  { id: 'eat',      icon: '🍚', stat: 'eaten',      targets: [30, 50], reward: 35, text: n => `自己吃 ${n} 口` },
  { id: 'runs',     icon: '📅', stat: 'runs',       targets: [3],     reward: 30, text: n => `跟她吃 ${n} 次火鍋（玩 ${n} 局）` },
  { id: 'score',    icon: '🏅', stat: 'score',      targets: [800, 1200], reward: 45, single: true, text: n => `單局拿到 ${n} 分` },
  { id: 'steal',    icon: '😈', stat: 'steals',     targets: [4, 6],  reward: 35, text: n => `搶走她瞄準的食物 ${n} 次` },
  { id: 'decline',  icon: '🙅', stat: 'declines',   targets: [2, 3],  reward: 30, text: n => `拒絕服務員推銷 ${n} 次` },
  { id: 'feedFav',  icon: '💗', stat: 'fedFav',     targets: [2],     reward: 40, text: n => `餵她吃她最愛的食物 ${n} 次（要剛好熟）` },
  { id: 'challenge', icon: '💝', stat: 'challengeRuns', targets: [1], reward: 30, text: n => `挑戰任一紀念日關卡 ${n} 次` },
];
FF.MISSION_BONUS = 100; // 三個都完成的額外獎勵

// ---------- 成就 ----------
// test(L)：L 是終身統計（含本局），回傳是否達成；reward 一次性飯票（0＝只給稱號）
FF.ACHIEVEMENTS = [
  { id: 'first',     icon: '🍲', name: '第一次約會',         desc: '完成第 1 局',                         title: '火鍋新手',       reward: 20,  test: L => L.runs >= 1 },
  { id: 'wingchun',  icon: '🥋', name: '詠春傳人',           desc: '累計閃避她的筷子 100 次',             title: '葉問的筷子',     reward: 80,  test: L => L.dodges >= 100 },
  { id: 'sucker',    icon: '🛍️', name: '好騙王',             desc: '累計買 20 次亂推銷',                  title: '店員的提款機',   reward: 0,   test: L => L.badBuys >= 20 },
  { id: 'seafood',   icon: '🦞', name: '海王…不是，是海鮮王', desc: '累計自己吃到 30 塊稀有食材',          title: '海鮮王',         reward: 60,  test: L => L.rareEaten >= 30 },
  { id: 'sanbao',    icon: '🚗', name: '馬路三寶剋星',       desc: '累計英雄救美 10 次',                  title: '三寶剋星',       reward: 80,  test: L => L.saves >= 10 },
  { id: 'spoon',     icon: '🥄', name: '人肉湯匙',           desc: '累計餵她 50 口',                      title: '人肉湯匙',       reward: 0,   test: L => L.fed >= 50 },
  { id: 'simp',      icon: '🍼', name: '寵妻魔人',           desc: '單局餵她 15 口',                      title: '寵妻魔人',       reward: 40,  test: L => L.maxFedRun >= 15 },
  { id: 'butter',    icon: '🫠', name: '筷子是裝飾用的',     desc: '累計被她打掉 50 次',                  title: '手殘男友',       reward: 0,   test: L => L.knocked >= 50 },
  { id: 'master',    icon: '🔥', name: '夾肉師傅',           desc: '單局打出 15 連擊',                    title: '夾肉師傅',       reward: 60,  test: L => L.bestCombo >= 15 },
  { id: 'bottomless', icon: '🕳️', name: '無底洞',            desc: '累計自己吃 500 口',                   title: '無底洞',         reward: 0,   test: L => L.eaten >= 500 },
  { id: 'gastro',    icon: '🤢', name: '腸胃科 VIP',         desc: '累計吃到生的 20 次',                  title: '腸胃科常客',     reward: 0,   test: L => L.raw >= 20 },
  { id: 'coldwar',   icon: '🧊', name: '冷戰專家',           desc: '累計把她氣到翻臉 20 次',              title: '冷戰專家',       reward: 0,   test: L => L.angerEnds >= 20 },
  { id: 'gentleman', icon: '🎩', name: '紳士到昏倒',         desc: '累計餓昏 10 次',                      title: '餓死紳士',       reward: 0,   test: L => L.hungerEnds >= 10 },
  { id: 'counter',   icon: '🥷', name: '破招大師',           desc: '累計破解她的大絕招 10 次',            title: '破招大師',       reward: 60,  test: L => L.ultCleared >= 10 },
  { id: 'bargain',   icon: '🤑', name: '精打細算',           desc: '累計買到 10 次真的划算的推銷',        title: '省錢男友',       reward: 40,  test: L => L.goodDeals >= 10 },
  { id: 'timemgmt',  icon: '⏳', name: '時間管理大師',       desc: '一般模式單局撐過 5 分鐘',             title: '時間管理大師',   reward: 120, test: L => L.bestTime >= 300 },
  { id: 'surfer',    icon: '🏄', name: '衝浪高手',           desc: '一般模式撐到第 8 波',                 title: '浪裡白條',       reward: 100, test: L => L.bestWave >= 8 },
  { id: 'bandit',    icon: '😈', name: '火鍋土匪',           desc: '累計搶走她瞄準的食物 100 次',         title: '火鍋土匪',       reward: 0,   test: L => L.steals >= 100 },
  { id: 'manual',    icon: '📖', name: '她的使用說明書',     desc: '解鎖她的全部模式',                    title: '女友翻譯機',     reward: 80,  test: L => L.gfUnlocked >= FF.PERSONAS.length },
  { id: 'sommelier', icon: '🥢', name: '鍋底品鑑師',         desc: '四種鍋底都吃過一局',                  title: '鍋底品鑑師',     reward: 40,  test: L => L.broths.length >= FF.BROTHS.length },
  { id: 'anniv',     icon: '💝', name: '紀念日從來不會忘',   desc: '通過全部紀念日挑戰',                  title: '紀念日小幫手',   reward: 150, test: L => L.challengesCleared >= FF.CHALLENGES.length },
  { id: 'checkin',   icon: '📅', name: '打卡魔人',           desc: '累計完成 10 個每日任務',              title: '打卡魔人',       reward: 50,  test: L => L.missionsDone >= 10 },
  { id: 'roadtrip',  icon: '🗺️', name: '火鍋環島',           desc: '四個場地都吃過一局',                  title: '火鍋環島王',     reward: 50,  test: L => L.venues.length >= FF.VENUES.length },
  { id: 'tycoon',    icon: '💰', name: '飯票大亨',           desc: '累計賺到 3000 張飯票',                title: '飯票大亨',       reward: 0,   test: L => L.ticketsEarned >= 3000 },
  { id: 'nosurvive', icon: '☠️', name: '求生慾為零',         desc: '累計餵她吃生的 5 次',                 title: '求生慾為零',     reward: 0,   test: L => L.fedRaw >= 5 },
  { id: 'lifer',     icon: '🫕', name: '火鍋就是人生',       desc: '累計吃火鍋 60 分鐘',                  title: '火鍋就是人生',   reward: 60,  test: L => L.playTime >= 3600 },
];
FF.DEFAULT_TITLE = '火鍋菜鳥';

// ---------- 紀念日挑戰 ----------
// setup：開局設定（場地、鍋底、她的模式固定，不能用道具）
//   waveBase 從第幾波的難度開始（0＝第 1 波）、anger 開局怒氣、time 限時秒數（0＝不限時）
// rules：特殊規則（noDecay 怒氣不消退、anger 怒氣上升倍率、feed 餵食消氣倍率、calm 她自己吃東西消氣的倍率、satMul 肚子餓速度、rareOnly 只有稀有食材、think/reach/strike 她的出手倍率）
// goal：過關條件（由 challenge.js 判定）
FF.CHALLENGES = [
  {
    id: 'anniv', icon: '💑', name: '交往紀念日',
    story: '今天是你們交往紀念日，她特別敏感，記仇模式全開。',
    rule: '她的怒氣不會自然消退，而且一點小事就生氣（怒氣上升 +25%）',
    goal: { type: 'survive', time: 120 },
    goalText: '撐過 2 分鐘',
    setup: { venue: 'city', broth: 'classic', waveBase: 0, anger: 10, time: 0 },
    rules: { noDecay: true, anger: 1.25 },
    reward: 120,
    win: { title: '紀念日快樂！🎉', lines: ['她說：「今年的你，有比去年進步一點點。」', '她偷偷把這頓火鍋 PO 上限動，還標記你。'] },
    lose: {
      anger: { title: '紀念日變忌日…', lines: ['「你連紀念日都要跟我搶？」她已經在打給閨蜜了。', '「我記住了。明年的今天我也會記住。」'] },
      hunger: { title: '紀念日餓昏了…', lines: ['「紀念日讓你餓昏，我是不是很失敗…算了，是你很失敗。」'] },
    },
  },
  {
    id: 'birthday', icon: '🎂', name: '她的生日',
    story: '壽星最大！今天你是專屬餵食員，自己偷吃太多口會被記一輩子。',
    rule: '自己最多只能吃 6 口（肚子餓得比較慢）；她吃飽時餵的不算，要抓節奏',
    goal: { type: 'feed', count: 13, eatLimit: 6 },
    goalText: '90 秒內餵她 13 口她覺得好吃的（剛好熟、她還沒吃飽）',
    setup: { venue: 'market', broth: 'classic', waveBase: 0, anger: 20, time: 90 },
    rules: { satMul: 0.55 },
    reward: 160,
    win: { title: '生日快樂！🎂', lines: ['她說：「這是我吃過最好吃的生日火鍋。」（蠟燭插在貢丸上）', '她許的願望是：「明年也要你餵。」'] },
    lose: {
      eat: { title: '壽星翻臉了…', lines: ['「今天是誰生日？你吃那麼多是你生日喔？」', '你偷吃的那口，她會在每一年的生日提起。'] },
      time: { title: '壽星等不及了…', lines: ['「生日都快過完了，我才吃幾口？」', '她決定自己切蛋糕，不分你。'] },
      anger: { title: '生日變吵架…', lines: ['「我生日欸！你還敢惹我？」'] },
      hunger: { title: '你餓昏在她生日…', lines: ['「誰生日昏倒的是男朋友啦！」她邊吹蠟燭邊叫救護車。'] },
    },
  },
  {
    id: 'valentine', icon: '💝', name: '情人節',
    story: '情人節套餐只有和牛、龍蝦、帝王蟹跟生蠔，但她今天手超快、超兇。',
    rule: '鍋裡只有稀有食材；她出手更快、更愛打你',
    goal: { type: 'rare', count: 25 },
    goalText: '60 秒內自己吃到 25 塊熟的稀有食材',
    setup: { venue: 'beach', broth: 'classic', waveBase: 1, anger: 15, time: 60 },
    rules: { rareOnly: true, think: 0.75, reach: 1.25, strike: 1.3 },
    reward: 200,
    win: { title: '情人節大勝利！💘', lines: ['她說：「好啦，今天的龍蝦算你贏，玫瑰花我收下了。」', '情人節吃到這麼多好料，你的錢包在哭，但你很開心。'] },
    lose: {
      time: { title: '好料都被她吃光了…', lines: ['「情人節快樂～」她摸著肚子說，你只吃到一碗湯。'] },
      anger: { title: '情人節變分手節…', lines: ['「你搶我的龍蝦？今天是情人節欸！」', '她把玫瑰花插進了你的貢丸裡。'] },
      hunger: { title: '情人節餓昏…', lines: ['滿鍋和牛你卻餓昏，這就是傳說中的「看得到吃不到」。'] },
    },
  },
  {
    id: 'countdown', icon: '🎆', name: '跨年倒數',
    story: '跨年夜，倒數 60 秒！在煙火放完之前，吃出今年最高分。',
    rule: '從第 3 波的難度開始，限時 60 秒',
    goal: { type: 'score', score: 1300 },
    goalText: '倒數 60 秒內拿到 1300 分',
    setup: { venue: 'countdown', broth: 'mala', waveBase: 2, anger: 15, time: 60 },
    rules: {},
    reward: 250,
    win: { title: '新年快樂！🎆', lines: ['「3、2、1——新年快樂！」她在煙火下親了你一下，然後偷夾你碗裡的肉。', '新的一年，你的筷子跟你的愛一樣快。'] },
    lose: {
      time: { title: '倒數結束，分數不夠…', lines: ['「新年快樂…欸你分數怎麼這麼低？」', '煙火都放完了，你的分數還在熱身。'] },
      anger: { title: '跨年夜吵架…', lines: ['「新年新希望：換一個不會搶肉的男友。」'] },
      hunger: { title: '跨年夜餓昏…', lines: ['你在倒數 10 秒的時候昏倒了，她自己跟煙火合照。'] },
    },
  },
  {
    id: 'makeup', icon: '🧊', name: '冷戰和好日',
    story: '昨天吵架了，她今天臉超臭。用你的筷子把她哄回來！',
    rule: '開局怒氣 90；冷戰中她不會自己消氣、自己吃東西也不會，你餵的她也只領四成的情',
    goal: { type: 'calm', anger: 20 },
    goalText: '75 秒內把她的怒氣降到 20 以下',
    setup: { venue: 'city', broth: 'milk', waveBase: 0, anger: 90, time: 75 },
    rules: { noDecay: true, calm: 0, feed: 0.4 },
    reward: 300,
    win: { title: '和好了！💕', lines: ['她說：「…好啦，原諒你。但下次吵架還是我贏。」', '你們和好了，隔壁桌默默給你鼓掌。'] },
    lose: {
      time: { title: '冷戰延長賽…', lines: ['「我還在生氣喔。」她吃完最後一塊肉，自己去結帳了。'] },
      anger: { title: '冷戰升級成熱戰…', lines: ['「你是來和好的還是來宣戰的？」'] },
      hunger: { title: '和好前先餓昏了…', lines: ['你為了哄她，餓到昏倒。她邊哭邊笑：「笨蛋喔。」'] },
    },
  },
];
FF.CHALLENGE_TICKET_MUL = 0.5; // 挑戰模式一般結算飯票打五折（首次過關另有大獎）
