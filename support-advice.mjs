// A dated, curated advice snapshot. This module does not search or call a model.
const UPDATED_AT = '2026-09-15';

const SOURCES = {
  shaosiyuanUpdate: {
    title: '王者荣耀官方：9 月 3 日少司缘提高回复、降低伤害',
    url: 'https://www.sina.cn/news/detail/5339116733728080.html',
    date: '2026-09-03', kind: 'version-update',
  },
  shaosiyuanExample: {
    title: 'RW 官方 BP：8 月 22 日 Hero 使用公孙离与少司缘（调整前案例）',
    url: 'https://www.sina.cn/news/detail/5334762629890932.html',
    date: '2026-08-22', kind: 'pro-example',
  },
  zhangfeiMechanics: {
    title: '张飞官方技能页（页面未标版本日期）',
    url: 'https://pvp.qq.com/web201605/herodetail/171.shtml',
    date: null, kind: 'official-skill',
  },
  zhangfeiExample: {
    title: 'KPL 官方战报：6 月 19 日公孙离与张飞保护配合（较早案例）',
    url: 'https://weibo.com/6074356560/R4QrpEh05?refer_flag=1001030103_',
    date: '2026-06-19', kind: 'pro-example',
  },
  taiyiMechanics: {
    title: '太乙真人官方技能页（页面未标版本日期）',
    url: 'https://pvp.qq.com/web201605/herodetail/186.shtml',
    date: null, kind: 'official-skill',
  },
};

const CANDIDATES = {
  shaosiyuan: {
    id: 'shaosiyuan', name: '少司缘',
    fit: '已有可靠前排，希望提高续航、持续换血时的候选。',
    reason: '9 月 3 日正式服调整提高回复、降低伤害，因此当前更适合从续航和持续配合的方向考察。控制配合仍需看辅助的实际操作和局面。',
    action: '准备换血前先确认少司缘在附近、能够支援；消耗后留出接受回复的机会，再决定是否继续追击。',
    limitation: '治疗不能替代前排。当前完整国服技能文本尚未全部核验，不承诺无条件跟随或固定控制效果；8 月职业案例发生在 9 月调整之前。',
    sources: [SOURCES.shaosiyuanUpdate, SOURCES.shaosiyuanExample],
  },
  zhangfei: {
    id: 'zhangfei', name: '张飞',
    fit: '队伍缺前排，或公孙离容易被突脸、需要保护时的优先候选。',
    reason: '官方技能页记载护盾、击退和大招控制。这些功能能帮助公孙离承受第一轮压力，并创造调整输出位置的机会。',
    action: '被突进时向张飞能够支援的位置移动；确认他能提供护盾或控制，再决定反打，避免位移追出保护范围。',
    limitation: '需要考虑张飞的技能状态和队友位置。6 月 KPL 配合实例较早，不能代表 9 月版本配对胜率。',
    sources: [SOURCES.zhangfeiMechanics, SOURCES.zhangfeiExample],
  },
  taiyi: {
    id: 'taiyi', name: '太乙真人',
    fit: '希望围绕射手发育，并提高关键战斗容错时的候选。',
    reason: '官方技能页记载额外金币、控制与复活，可以支持公孙离形成装备，并提供重新参与战斗的机会。',
    action: '发育期尽量在能互相支援的位置活动；准备冒险输出前确认复活技能可用、队友能够接应，再决定是否进场。',
    limitation: '复活不保证安全，仍受时机、位置和接应影响。没有足量近期高手样本支持将这套组合排成全服第一。',
    sources: [SOURCES.taiyiMechanics],
  },
};

const FRONTLINE_LABELS = {
  present: '你已确认队伍有可靠前排。',
  missing: '你已确认队伍缺少可靠前排。',
  unknown: '队伍是否有可靠前排尚不清楚。',
};
const PREFERENCE_LABELS = {
  balanced: '目标：兼顾搭配与配合。',
  sustain: '目标：提高续航、持续换血。',
  protection: '目标：优先保护、应对突进。',
  economy: '目标：围绕发育，提高经济与复活容错。',
};

/** Returns plain text and source metadata; consumers must render text safely. */
export function getSupportAdvice({
  frontline = 'unknown', preference = 'balanced', selectedSupport = '', lineupNote = '',
} = {}) {
  frontline = Object.hasOwn(FRONTLINE_LABELS, frontline) ? frontline : 'unknown';
  preference = Object.hasOwn(PREFERENCE_LABELS, preference) ? preference : 'balanced';
  const supportedSelection = Object.hasOwn(CANDIDATES, selectedSupport) ? selectedSupport : '';
  const note = typeof lineupNote === 'string' ? Array.from(lineupNote.trim()).slice(0, 300).join('') : '';
  const first = frontline === 'missing' || preference === 'protection'
    ? 'zhangfei' : preference === 'economy' ? 'taiyi' : 'shaosiyuan';
  const ids = supportedSelection ? [supportedSelection]
    : [first, ...Object.keys(CANDIDATES).filter(id => id !== first)];
  const known = ['英雄：公孙离。', FRONTLINE_LABELS[frontline], PREFERENCE_LABELS[preference]];
  if (supportedSelection) known.push(`你指定想了解：${CANDIDATES[supportedSelection].name}。`);
  if (note) known.push(`你提供的阵容信息（未核实）：${note}`);
  const caveats = [
    '这是截至 2026 年 9 月 15 日核对的固定资料快照；没有实时搜索或自动更新版本。',
    '排序是根据你提供的条件作出的建议，不是搭配胜率榜，也没有足够样本代表各大高手的一致选择。',
    '本页只核对了三个候选；未收录其他辅助，不代表它们不适配。',
    '赛事例子仅证明该组合曾被使用；比赛日期、整队阵容和赛事服差异限制了它对当前单排的参考价值。',
  ];
  if (selectedSupport && !supportedSelection) {
    caveats.push('你选择的辅助尚未纳入此资料快照，以下展示已核对的候选，不能据此判断其他辅助不适配。');
  }
  if (supportedSelection && frontline === 'missing' && supportedSelection !== 'zhangfei') {
    caveats.push('你指定的搭档不能据此视为已补齐前排，仍需队伍其他位置提供承伤与保护。');
  }
  const summary = supportedSelection
    ? `先看你指定的${CANDIDATES[supportedSelection].name}能提供什么帮助，以及哪些条件还没有满足。`
    : frontline === 'missing'
      ? '你已确认缺少可靠前排，先考虑张飞补充保护与承伤，再根据队伍其他位置调整。'
      : preference === 'economy'
        ? '你更看重发育与复活容错，先考虑太乙真人；仍要核对队伍的前排与保护。'
        : preference === 'protection'
          ? '你更看重应对突进和保护，先考虑张飞。'
          : frontline === 'unknown'
            ? '前排情况还不清楚：已有可靠前排时可先考察少司缘的续航；如果缺前排，则优先考察张飞。'
            : '已有可靠前排，可先考察少司缘的续航和持续配合，再按发育或保护需求比较其他候选。';
  return {
    updatedAt: UPDATED_AT,
    title: supportedSelection ? `公孙离与${CANDIDATES[supportedSelection].name}怎么配合` : '公孙离的辅助搭配建议',
    summary, known,
    recommendations: ids.map(id => ({ ...CANDIDATES[id], sources: CANDIDATES[id].sources.map(source => ({ ...source })) })),
    caveats,
    matchupNote: '仅凭这些信息还不能判断双方具体强弱。阵容备注只记录你的描述，不会自动把英雄名字推断成可靠前排、已就绪技能或对线优势。',
  };
}

// Conservative entry routing, not a substitute for semantic understanding.
const SUPPORT_REQUEST = /(?:配|搭配)(?:什么|哪(?:个|位|种|些)?)辅助|(?:公孙离|阿离).{0,10}(?:配谁|搭谁|跟谁|和谁|与谁)|(?:辅助|软辅|硬辅).{0,6}(?:怎么配合|如何配合|怎么搭配|选谁|选哪|推荐|最搭|更搭|更合适)|(?:推荐|想问|问的是|咨询|了解).{0,10}(?:辅助|软辅|硬辅|射辅搭配|阵容组合)|(?:帮我|请|想|该|应该|怎么|如何)(?:选择|选|挑选).{0,6}辅助|(?:搭配|组合).{0,5}(?:推荐|建议)|(?:什么|哪些|哪个|哪位|哪种).{0,4}辅助.{0,8}(?:适合|合适|最搭|搭配|配合)/;
// Naming a few known supports is an entry hint; it does not add advice coverage.
const SUPPORT_PAIR_QUESTION = /(?:公孙离|阿离).{0,4}(?:搭配|配|和|跟)(?:少司缘|张飞|太乙真人|瑶).{0,6}(?:怎么样|如何配合|好不好|合适吗|适合吗)/;
const SUPPORT_DENIAL = /(?:不是|并非|没有|没)(?:在|想|要)?(?:问|咨询|询问|讨论|了解)(?:的)?(?:是)?.{0,10}(?:辅助|搭配|阵容)|(?:不用|不要|无需|不需要|不想)(?:再|先)?(?:问|咨询|了解|讨论|推荐|聊|看)?.{0,6}(?:辅助|搭配|阵容)|(?:不是|并非)(?:辅助搭配|搭配咨询|阵容咨询)|(?:辅助搭配|阵容搭配|辅助选择).{0,3}(?:不问|不用问|没问题)/;
const DIAGNOSIS_REQUEST = /复盘|诊断|分析.{0,10}(?:失误|原因|对线|打不过)|(?:对线|操作)失误|对线.{0,4}(?:差点|没有思路|没思路)|(?:这局|上局|那次|当时).{0,15}(?:漏兵|打不过|换血亏|被击杀|被单杀|经济落后)|为什么.{0,10}(?:打不过|换血亏|漏兵|被杀|被单杀)/;
const DIAGNOSIS_DENIAL = /(?:不是|并非|不想|不要|不用|无需|不需要).{0,8}(?:复盘|诊断|分析失误)/;

export function detectSupportIntent(text) {
  if (typeof text !== 'string' || !text.trim()) return 'unknown';
  const clauses = text.slice(0, 4000).split(/[，,。？！?!；;\n]|(?:而是|但是|不过)/).filter(Boolean);
  let support = false;
  let diagnosis = false;
  for (const clause of clauses) {
    if ((SUPPORT_REQUEST.test(clause) || SUPPORT_PAIR_QUESTION.test(clause)) && !SUPPORT_DENIAL.test(clause)) support = true;
    if (DIAGNOSIS_REQUEST.test(clause) && !DIAGNOSIS_DENIAL.test(clause)) diagnosis = true;
  }
  return support && diagnosis ? 'mixed' : support ? 'support' : diagnosis ? 'diagnosis' : 'unknown';
}

/** Only explicit self reports may prefill visible, editable advice controls. */
export function extractSupportPreferences(text) {
  if (typeof text !== 'string' || !text.trim()) return {};
  const values = { frontline: new Set(), preference: new Set(), selectedSupport: new Set() };
  // Keep a question mark with its clause so an unqualified question is not a fact.
  const clauses = text.slice(0, 4000).split(/(?<=[？?])|[，,。！!；;\n]|(?:而是|但是|不过)/).filter(Boolean);
  const heroIds = { 少司缘: 'shaosiyuan', 张飞: 'zhangfei', 太乙真人: 'taiyi' };
  const preferenceIds = { 续航: 'sustain', 保护: 'protection', 发育: 'economy', 经济: 'economy' };
  for (const clause of clauses) {
    // These qualifiers prevent a fragment being promoted to a known condition.
    if (/[吗么呢？?]|算不算|如果|假设|假如|要是|比如|例如|倘若|万一|是否|是不是|有没有|可能|不确定|不知道|记不清|敌方|对面|对手/.test(clause)) continue;
    if (/(?:我方|我们(?:队)?|我这边|我家|队伍)(?:已经|现在|目前|这局|确实|明确)?(?:没有|没|缺|缺少|缺乏)(?:可靠的?)?前排/.test(clause)) values.frontline.add('missing');
    if (/(?:我方|我们(?:队)?|我这边|我家|队伍)(?:已经|现在|目前|这局|确实|明确)?(?:有|具备)(?:可靠的?)?前排/.test(clause)) values.frontline.add('present');
    if (!/不想|不需要|不要|不用|无需|并非|不是/.test(clause)) {
      for (const match of clause.matchAll(/(?:优先|更想|更看重|更需要)(?:要|提升|提高|加强)?(续航|保护|发育|经济)/g)) {
        values.preference.add(preferenceIds[match[1]]);
      }
      for (const match of clause.matchAll(/(?:我方|我家|我这边|我们(?:队)?|队友|辅助)(?:的?辅助)?(?:已经|刚刚|现在|这局|目前)?(?:选了|选的是|锁了|锁定了|是)(少司缘|张飞|太乙真人)/g)) {
        values.selectedSupport.add(heroIds[match[1]]);
      }
    }
  }
  return Object.fromEntries(Object.entries(values)
    .filter(([, candidates]) => candidates.size === 1)
    .map(([key, candidates]) => [key, [...candidates][0]]));
}
