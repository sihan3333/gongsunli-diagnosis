// Shared, deterministic judgment layer. AI extracts facts; this module owns decisions.
export const FACT_VALUES = Object.freeze({
  recognition: ["missing", "present"],
  understanding: ["missing", "present"],
  execution: ["fails", "stable"],
  last_hit: ["fails", "comfortable", "pressured"],
  economy: ["behind", "even"],
  numbers: ["outnumbered", "even"],
  network: ["unstable", "stable"],
  scope: ["broad", "specific"],
  recurrence: ["repeated", "single"],
  timeline: ["economy_first", "trade_first"],
  recall: ["unclear", "clear"],
});

const labels = {
  recognition: { missing: "尚不清楚对手的关键信息", present: "能识别对手的关键信息" },
  understanding: { missing: "尚不能解释出手条件", present: "能解释出手条件" },
  execution: { fails: "知道处理方式但执行失败", stable: "描述中能够稳定执行" },
  last_hit: { fails: "无人干扰时也会漏最后一下", comfortable: "无人干扰时补兵正常", pressured: "受到压力时放弃吃线" },
  economy: { behind: "出问题时已经经济落后", even: "出问题前双方经济接近" },
  numbers: { outnumbered: "当时处于人数劣势", even: "当时双方人数相当" },
  network: { unstable: "当时存在卡顿或延迟", stable: "当时网络与设备正常" },
  scope: { broad: "多种对手下都会出现", specific: "集中于某一个对手" },
  recurrence: { repeated: "类似行为多次出现", single: "目前只有一次经历" },
  timeline: { economy_first: "经济差先于换血失败", trade_first: "换血失败先于经济差" },
  recall: { unclear: "暂时记不清具体过程", clear: "能回忆具体过程" },
};

export function groundObservations(messages = [], observations = []) {
  const userMessages = new Map(messages.filter((m) => m.role === "user" && typeof m.content === "string").map((m) => [m.id, m.content]));
  const seen = new Set();
  return observations.filter((o) => {
    if (!o || !FACT_VALUES[o.key]?.includes(o.value) || typeof o.quote !== "string" || o.quote.trim().length < 2 || o.quote.length > 600) return false;
    const source = userMessages.get(o.messageId);
    if (!source || !source.includes(o.quote)) return false;
    const fingerprint = JSON.stringify([o.key, o.value, o.messageId, o.quote]);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  }).map(({ key, value, quote, messageId }) => ({ key, value, quote, messageId, label: labels[key][value] }));
}

const questions = {
  episode: {
    text: "回想最近一次前期打不过：最先发生的是被换血打掉很多血、漏兵，还是打起来之前就已经落后？记不清也可以直接说。",
    suggestions: ["换血先亏了，后来开始漏兵", "打起来前已经比对面穷", "我记不清具体过程"],
  },
  recognition: {
    text: "就刚才那次对线，你能说出对手哪个技能最需要留意，以及它会怎样影响你靠近兵线吗？说不出来也没关系。",
    suggestions: ["我不知道对手哪个技能最危险", "知道技能，但不知道该怎样调整打法", "我知道要注意什么，也能解释当时该怎么做"],
  },
  understanding: {
    text: "你已经认得那个技能了。当时你认为应该靠近、等待还是后退？依据是什么？我们先分清看懂机会和实际做出来。",
    suggestions: ["认得技能，但不知道对我的打法意味着什么", "我能说明正确处理方式，但实战没做到", "我当时知道怎么处理，也做到了"],
  },
  execution: {
    text: "你能说明处理方式。那一次实际做出的动作和你原本的判断一致吗？具体在哪一步没跟上？",
    suggestions: ["知道该怎么做，但一打起来就按乱了", "判断和操作都做到了，仍然打不过", "记不清当时按了什么"],
  },
  last_hit: {
    text: "把对手的压力先拿开：最近能安心补兵、没有人干扰的时候，你也经常漏最后一下吗？",
    suggestions: ["无人干扰也经常漏最后一下", "没人干扰时补兵正常，被压才不敢吃线", "没有留意过，记不清"],
  },
  recurrence: {
    text: "这种情况在最近几局里反复出现吗？是遇到不同对手都这样，还是只在某一局或面对某个英雄时发生？",
    suggestions: ["最近几局反复出现，遇到不同对手也这样", "只有面对一个特定英雄时这样", "我目前只记得这一次"],
  },
  economy_order: {
    text: "经济落后这条线索很关键。你记得是先漏线或离开兵线、经济掉下去后才打不过，还是先换血失败、之后才开始丢经济？",
    suggestions: ["先漏线，经济落后以后才打不过", "先换血失败，后来回城漏线才落后", "记不清谁先谁后"],
  },
  other_cause: {
    text: "目前的描述暂时不支持对位知识或执行是主要问题。那一波之前，你有没有漏整波兵、离线支援，或者发现经济与装备已经不同？",
    suggestions: ["我在交手前已经漏了兵线", "当时经济差不多，操作也做到了", "我需要回看那一段才知道"],
  },
};

const conditionQuestions = {
  economy: {
    text: "开始觉得打不过之前，双方经济大致相当，还是你已经明显落后？记不清也可以直接说。",
    suggestions: ["当时双方经济差不多", "出问题前我已经明显经济落后", "我记不清当时的经济"],
  },
  numbers: {
    text: "那次对线时，双方参与的人数一样多，还是你这边更少？记不清也可以直接说。",
    suggestions: ["当时双方参与对线的人数一样多", "当时我这边的人数更少", "我记不清当时的人数"],
  },
  network: {
    text: "出现这个情况时，网络和设备是否正常，有没有明显卡顿或延迟？记不清也可以直接说。",
    suggestions: ["当时网络和设备都正常", "当时有明显卡顿或延迟", "我记不清当时有没有卡顿"],
  },
};

const actions = {
  knowledge: {
    title: "当前先练：把对手信息转成一个判断",
    reason: "你的描述中，对手的关键信息或它对应的出手条件还不清楚，而且类似情况反复出现。这支持先做一次对位理解练习；它仍是基于自述的初步判断。",
    action: "下一局只选对面一个关键技能，记录一次它交掉后你选择靠近、等待还是后退，以及当时的理由。拿不准时先记录，不要求主动换血。",
    measure: "复盘时检查：能否说明自己的选择及依据。带回这一个片段再判断，不用一局输赢评价练习。",
  },
  execution: {
    title: "当前先练：让一个判断落成一个动作",
    reason: "你能识别关键信息并解释处理方式，但在条件接近、设备正常时仍多次执行失败。当前更值得观察判断到动作的衔接，而不是直接认定知识不足。",
    action: "下一局只观察一个你已经能解释的应对动作；出现相同信号后，记录一次自己是否按原计划完成，以及卡在了哪一步。",
    measure: "回来对照“原本想做什么”和“实际做了什么”。这能检验执行是否是优先问题，暂不以击杀或胜负衡量。",
  },
  last_hit: {
    title: "当前先练：无人干扰时的最后一下",
    reason: "你描述了网络正常、没有对手干扰时仍反复漏最后一下的情况。它比“经济低”更直接地支持先检查基础补兵稳定性。",
    action: "在训练环境里，只记录连续三波兵中自己漏掉的最后一下，不加入换血或位移练习。",
    measure: "记下三波各漏几次，下次在相同条件下再观察。单次减少不等于已证明训练有效。",
  },
};

const collections = {
  unclear: {
    title: "先带回一个具体片段",
    reason: "你暂时记不清具体过程。现在给能力贴标签，依据还不够。",
    action: "下一局只记录第一次明显打不过的时刻：交手前双方人数、经济是否接近，以及自己原本想做的动作。",
    measure: "回来带上这一段描述或回放时间点，再区分知识、执行和局面因素。",
  },
  numbers: {
    title: "先看人数相当时的一次对线",
    reason: "当时存在人数劣势，这会影响吃线和出手空间。它不能直接证明你的对位认知或操作有问题。",
    action: "下一局只记录一次双方人数相当时仍感到打不过的片段，以及交手前的经济和技能情况。",
    measure: "比较问题在人数相当时是否仍出现；如果没有，这次先不归因为个人能力不足。",
  },
  network: {
    title: "先排除卡顿对这次表现的影响",
    reason: "你报告了设备或网络异常，暂时无法把动作失败归因为执行能力。",
    action: "等网络与设备正常时，只观察一次同类应对是否仍失败，并记下当时打算做和实际做的动作。",
    measure: "用正常条件下的表现再判断，卡顿时的失败不作为执行不足的直接证据。",
  },
  economy: {
    title: "先找到经济差开始出现的地方",
    reason: "已确认的经济差会干扰对线判断，但经济落后本身也可能是更早行为的结果；目前还不能把它当作根因。",
    action: "回看这局，只找双方经济第一次明显拉开的片段，记录此前发生的是漏线、回城、支援还是其他事件。",
    measure: "带回最早变化的时间点和事件，下一次再判断先调查哪项行为。",
  },
  specific: {
    title: "先把这个特定对手看清楚",
    reason: "你描述的困难集中在某一个对手。这不足以推出你面对所有对手都缺少对位知识。",
    action: "下一次面对这个英雄，只记录一次让你不知如何应对的技能或场景，以及当时双方的条件。",
    measure: "先判断这一个对位需要补什么信息，再考虑是否存在更广泛的问题。",
  },
  insufficient: {
    title: "目前先收集证据，不急着定卡点",
    reason: "已有线索还不足以稳定区分几个可能原因。继续凭印象回答，可能只会增加猜测。",
    action: "下一局只记录第一次对线不顺的片段：交手前的局面、自己判断应该做什么，以及实际发生了什么。",
    measure: "带回这个片段，再检查支持和反对各个判断的证据。",
  },
  conflict: {
    title: "先核对前后不同的描述",
    reason: "同一项情况出现了相互冲突的描述，可能是不同对局，也可能是修正。澄清前不据此给训练结论。",
    action: "只选同一局的同一个片段，重新记下其中不确定的事实，确认哪些描述适用于它。",
    measure: "下一次从这个统一片段重新开始，避免混用不同局面的证据。",
  },
};

export function evaluateTurn({ messages = [], observations = [], finish = false } = {}) {
  const evidence = groundObservations(messages, observations);
  const turnCount = messages.filter((m) => m.role === "user").length;
  const has = (key, value) => evidence.some((o) => o.key === key && o.value === value);
  const known = (key) => evidence.some((o) => o.key === key);
  const conflicts = Object.keys(FACT_VALUES).filter((key) => new Set(evidence.filter((o) => o.key === key).map((o) => o.value)).size > 1);
  const knowledgeSupport = has("recognition", "missing") || has("understanding", "missing");
  const understands = has("recognition", "present") && has("understanding", "present");
  const fair = has("economy", "even") && has("numbers", "even") && has("network", "stable");
  const repeated = has("recurrence", "repeated") || has("scope", "broad");
  const hypotheses = [
    { id: "knowledge", label: "对位理解", level: knowledgeSupport ? "初步迹象" : understands ? "有反向证据" : "证据不足" },
    { id: "execution", label: "判断后的执行", level: has("execution", "fails") ? "初步迹象" : has("execution", "stable") ? "有反向证据" : "证据不足" },
    { id: "last_hit", label: "补兵稳定性", level: has("last_hit", "fails") ? "初步迹象" : has("last_hit", "comfortable") ? "有反向证据" : "证据不足" },
  ];
  let interpretation = evidence.length ? `你提到的“${evidence.at(-1).quote}”提供了一个具体线索。我们还需要把行为与当时的局面分开看。` : "我听到了你对前期对线的困扰。单凭“打不过”，还不能确定是知识、执行还是局面造成的。";
  const output = (status, question = null, result = null) => ({ status, interpretation, question, evidence, hypotheses, result, turnCount });
  const collect = (id) => {
    interpretation = collections[id].reason;
    return output("collect", null, { ...collections[id] });
  };
  const ask = (id, question = questions[id]) => finish || turnCount >= 6 ? collect("insufficient") : output("question", { id, ...question });
  const askConditions = (requiredFields) => {
    const field = requiredFields.find((key) => !known(key));
    return field ? ask("conditions", { field, ...conditionQuestions[field] }) : collect("insufficient");
  };
  const train = (id) => {
    hypotheses.find((h) => h.id === id).level = "较强证据（自述）";
    interpretation = actions[id].reason;
    return output("training", null, { ...actions[id] });
  };

  if (conflicts.length) {
    if (finish || turnCount >= 6) return collect("conflict");
    const key = conflicts[0];
    const quotes = evidence.filter((o) => o.key === key).map((o) => `“${o.quote}”`);
    interpretation = "前后有不同的描述，可能来自不同场景。我先核对这一点，暂时不下结论。";
    return output("question", { id: `clarify_${key}`, text: `你提到了${[...new Set(quotes)].slice(0, 2).join("，也提到")}。它们是同一片段中的情况吗？如果记错了，可以重新开始，只描述修正后的这个片段。`, suggestions: ["这是两个不同片段，我需要先回看", "我记不清了，先带走观察任务"] });
  }
  if (has("recall", "unclear")) return collect("unclear");
  if (has("network", "unstable")) return collect("network");
  if (has("numbers", "outnumbered")) return collect("numbers");
  if (has("economy", "behind")) {
    interpretation = "现在知道当时已经经济落后。这可能影响交手结果，但还需要查清它发生在换血失败之前还是之后。";
    return known("timeline") ? collect("economy") : ask("economy_order");
  }
  if (has("scope", "specific") && knowledgeSupport) return collect("specific");
  if (has("last_hit", "fails") && has("network", "stable") && repeated) return train("last_hit");
  // No score or answer position can override an unresolved context check.
  if (knowledgeSupport && fair && repeated) return train("knowledge");
  if (understands && has("execution", "fails") && fair && repeated) return train("execution");
  if (finish || turnCount >= 6) return collect("insufficient");
  if (knowledgeSupport || has("execution", "fails") || has("last_hit", "fails")) {
    if (!fair && !has("last_hit", "fails")) {
      interpretation = understands && has("execution", "fails")
        ? "你能说清处理方式，却没有按计划做出来。这给了我们一个执行方面的线索，也让“不了解对手”暂时不那么像主要原因。先确认当时有没有局面或设备干扰。"
        : knowledgeSupport
          ? "你提到对手的关键信息或出手条件还不清楚，这支持继续调查对位理解。先核对当时的局面，避免把人数或经济劣势误判成个人能力问题。"
          : "这条回答支持继续调查，但还不能排除当时经济、人数或设备条件的影响。";
      // Check one unknown at a time. An economy gap can require an earlier-event
      // review, so resolve it before the remaining context questions.
      return askConditions(["economy", "numbers", "network"]);
    }
    // Uncontested last-hit failures only require a device/network context check.
    if (has("last_hit", "fails") && !known("network")) return askConditions(["network"]);
    if (!repeated) {
      interpretation = "现在有了具体行为和当时条件的线索。还需要确认这是反复出现的模式，还是某一次、某个对手带来的困难，再决定下一局优先练什么。";
      return ask("recurrence");
    }
  }
  if (has("last_hit", "pressured") || has("last_hit", "comfortable")) {
    interpretation = "你提到无人干扰时能补兵，或主要在受压时丢线。我们先继续调查压力从哪里来，不直接认定补兵基本功不足。";
  }
  if (has("execution", "fails") && !known("recognition")) return ask("recognition");
  if (has("recognition", "present") && !known("understanding")) return ask("understanding");
  if (understands && !known("execution")) {
    interpretation = "你能识别并解释出手条件，这提供了反对“不了解对手”的线索。下一步看判断是否落到了动作上。";
    return ask("execution");
  }
  if (understands && has("execution", "stable")) return ask("other_cause");
  if (known("last_hit") && !known("recognition")) return ask("recognition");
  if (fair && !known("recognition")) return ask("recognition");
  if (!known("last_hit") && messages.some((m) => m.role === "user" && /漏兵|补兵|补刀|吃线/.test(m.content))) return ask("last_hit");
  return ask("episode");
}

function demoTurn(text, pairs, number) {
  return { text, observations: pairs.map(([key, value, quote]) => ({ key, value, quote, messageId: `u${number}` })) };
}

export function getDemoCases() {
  return [
    {
      id: "knowledge", title: "不知道该留意什么", description: "区分不了对手的关键信息，先排除局面影响。",
      turns: [
        demoTurn("我前期总打不过。我不知道对面哪个技能最危险，也不知道技能交掉后该怎么调整打法。", [["recognition", "missing", "不知道对面哪个技能最危险"], ["understanding", "missing", "不知道技能交掉后该怎么调整打法"]], 1),
        demoTurn("说的是刚才那次对线：当时一对一，经济差不多，网络正常。", [["numbers", "even", "当时一对一"], ["economy", "even", "经济差不多"], ["network", "stable", "网络正常"]], 2),
        demoTurn("最近几局反复这样，面对不同对手时也说不出要注意什么。", [["recurrence", "repeated", "最近几局反复这样"], ["scope", "broad", "面对不同对手时也说不出要注意什么"]], 3),
      ],
    },
    {
      id: "execution", title: "知道，但实战做不出来", description: "已有判断依据，继续查看动作是否跟上。",
      turns: [
        demoTurn("我能指出对手的关键技能，也能解释当时应该等技能交掉再靠近，但实战手忙脚乱，没按原本的计划做。", [["recognition", "present", "能指出对手的关键技能"], ["understanding", "present", "能解释当时应该等技能交掉再靠近"], ["execution", "fails", "实战手忙脚乱，没按原本的计划做"]], 1),
        demoTurn("当时双方人数一样，经济接近，网络和设备也正常。", [["numbers", "even", "双方人数一样"], ["economy", "even", "经济接近"], ["network", "stable", "网络和设备也正常"]], 2),
        demoTurn("最近三局都出现了，知道要做哪个动作，但还是反复按乱。", [["recurrence", "repeated", "最近三局都出现了"]], 3),
      ],
    },
    {
      id: "economy", title: "交手前就已经落后", description: "经济差是线索，还要确认先后关系。",
      turns: [
        demoTurn("我觉得前期打不过，不过那次交手前，我已经比对面少了一千多经济。", [["economy", "behind", "交手前，我已经比对面少了一千多经济"]], 1),
        demoTurn("我是先离开兵线支援，回来漏了整波线，经济落后之后才去换血，结果打不过。", [["timeline", "economy_first", "经济落后之后才去换血"]], 2),
      ],
    },
    {
      id: "numbers", title: "对面两个人，我一个人", description: "人数劣势不能直接当作个人能力不足。",
      turns: [demoTurn("那次对面射手和辅助一直在一起，我这边辅助走了，我一个人对他们两个人，根本不敢吃线。", [["numbers", "outnumbered", "我一个人对他们两个人"], ["last_hit", "pressured", "根本不敢吃线"]], 1)],
    },
    {
      id: "unclear", title: "只记得难受，说不清过程", description: "证据不足时，带走一项具体观察任务。",
      turns: [demoTurn("我只觉得自己前期很弱，具体哪次打不过、当时有没有辅助、谁先掉经济，我都记不清了。", [["recall", "unclear", "我都记不清了"]], 1)],
    },
  ];
}
