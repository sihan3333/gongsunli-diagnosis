import { evaluateTurn, getDemoCases } from "./diagnosis-engine.mjs";
import { TRAINING_STORAGE_KEY, createTrainingTask, loadTrainingTask, saveTrainingTask, clearTrainingTask } from "./training-store.mjs";
import { detectSupportIntent } from "./support-advice.mjs";
import { mountSupportCoach } from "./support-coach.js";

const MAX_INPUT = 2000;
const MAX_TURNS = 6;
const opening = "先说说最近一次前期打不过的情况：当时是几个人对线，你是怎么开始吃亏的？记不清的部分也可以直接告诉我。";
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const paragraph = (value) => escapeHTML(value).replace(/\n/g, "<br>");

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

function readStoredTask() {
  try {
    const revision = browserStorage().getItem(TRAINING_STORAGE_KEY);
    return { ...loadTrainingTask({ getItem: () => revision }), revision };
  } catch {
    return { task: null, error: "unavailable", revision: null };
  }
}

export function mountAICoach(container, { context = {}, onExit, exitLabel = "返回首页", initialView = "diagnosis" } = {}) {
  const staticHosting = globalThis.document?.documentElement?.dataset?.hosting === "static";
  let alive = true;
  let requestVersion = 0;
  let controller;
  let status = "checking";
  let providerName = "AI";
  let mode = initialView === "training" ? "training" : "choose";
  let messages = [];
  let observations = [];
  let turns = [];
  let latest = null;
  let loading = false;
  let error = "";
  let pendingFinish = false;
  let draft = "";
  let selectedCase = null;
  let demoIndex = 0;
  let savedDiagnosis = null;
  let stored = readStoredTask();
  let pendingTask = null;
  let confirmingClear = false;
  let taskNotice = "";
  let intentChoice = false;
  let supportCleanup = null;
  const cases = getDemoCases();

  function cleanup() {
    alive = false;
    requestVersion += 1;
    controller?.abort();
    supportCleanup?.();
    supportCleanup = null;
    container.removeEventListener("click", handleClick);
    container.removeEventListener("submit", handleSubmit);
    container.removeEventListener("input", handleInput);
    container.removeEventListener("keydown", handleKeydown);
  }

  function reset(nextMode = status === "ready" ? "live" : "choose") {
    requestVersion += 1;
    controller?.abort();
    messages = [];
    observations = [];
    turns = [];
    latest = null;
    loading = false;
    error = "";
    pendingFinish = false;
    draft = "";
    pendingTask = null;
    confirmingClear = false;
    taskNotice = "";
    intentChoice = false;
    selectedCase = null;
    demoIndex = 0;
    mode = nextMode;
    render();
  }

  function modeLabel() {
    if (mode === "demo") return "预设案例 · 非 AI";
    if (staticHosting) return "公开体验版 · 预设案例";
    if (status === "checking") return "正在检查 AI 连接";
    return status === "ready" ? `${providerName} ${latest ? "对话中" : "已配置"}` : `${providerName} 尚未连接`;
  }

  function renderEvidence() {
    const evidence = Array.isArray(latest?.evidence) ? latest.evidence : [];
    return `<section class="ai-evidence"><p class="ai-section-kicker">${mode === "demo" ? "从案例中寻找依据" : "从你的回答中寻找依据"}</p><h3>已经知道什么</h3>${evidence.length ? `<ul>${evidence.map((item) => `<li><span>${escapeHTML(item.label || item.key)}</span><blockquote>“${paragraph(item.quote)}”</blockquote></li>`).join("")}</ul>` : '<p class="ai-empty-evidence">现在还没有足够的线索。我们先还原一小段真实经历。</p>'}</section>`;
  }

  function renderResult(result) {
    const collecting = result.status === "collect";
    return `<article class="ai-result ${collecting ? "is-collect" : ""}" aria-label="${collecting ? "观察任务" : "训练建议"}">
      <p class="ai-section-kicker">${collecting ? "还不能确定卡点 · 先补一条线索" : "当前优先尝试 · 一项行动"}</p>
      <h3>${escapeHTML(result.result.title)}</h3>
      <p>${paragraph(result.result.reason)}</p>
      <div class="ai-action"><span>${collecting ? "下一局这样观察" : "下一局只做这一件事"}</span><p>${paragraph(result.result.action)}</p></div>
      <div class="ai-measure"><span>怎么知道有没有用</span><p>${paragraph(result.result.measure)}</p></div>
      <p class="ai-result-note">${collecting ? "记录后带回来，我们再继续区分原因。" : "这是根据当前描述得到的待验证建议，可以用下一局的记录修正。"}</p>
    </article>`;
  }

  function renderConversation() {
    const rendered = turns.map((turn) => turn.role === "user"
      ? `<article class="ai-message ai-message-user"><span class="ai-message-author">${mode === "demo" ? "案例玩家" : "你"}</span><div>${paragraph(turn.content)}</div></article>`
      : `<article class="ai-message ai-message-coach"><span class="ai-message-author">${mode === "demo" ? "案例分析" : "AI 教练"}</span><div>${turn.result.interpretation !== turn.result.result?.reason ? `<p>${paragraph(turn.result.interpretation)}</p>` : ""}${turn.result.question ? `<p class="ai-question">${paragraph(turn.result.question.text)}</p>` : ""}${turn.result.result ? renderResult(turn.result) : ""}</div></article>`).join("");
    return `<div class="ai-conversation" role="log" aria-label="诊断对话" aria-live="polite">
      <article class="ai-message ai-message-coach"><span class="ai-message-author">${mode === "demo" ? "案例起点" : "AI 教练"}</span><div><p>${opening}</p></div></article>
      ${rendered}
      ${loading ? '<div class="ai-thinking" role="status"><span class="ai-pulse" aria-hidden="true">✧</span> 正在整理你的线索，判断下一步该问什么…</div>' : ""}
      ${error ? `<div class="ai-error" role="alert"><strong>这次回复没能完成</strong><p>${escapeHTML(error)}</p><p>你的回答还在，重试会接着这一步继续。</p><button type="button" data-ai-action="${mode === "demo" ? "show-cases" : "retry"}" class="ai-text-button">${mode === "demo" ? "返回案例选择" : "重新获取回复 →"}</button></div>` : ""}
    </div>`;
  }

  function renderChooser() {
    return `<div class="ai-case-chooser"><p class="ai-section-kicker">看看相似的困扰怎样被拆解</p><h2>诊断示例</h2><p>以下对话均为预设内容，选择后可以逐步查看追问和建议。</p><div class="ai-case-grid">${cases.map((item, index) => `<button type="button" class="ai-case-card" data-ai-case="${escapeHTML(item.id)}" ${status === "checking" ? "disabled" : ""}><span class="ai-case-number">${String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.description)}</small></span><i aria-hidden="true">↗</i></button>`).join("")}</div></div>`;
  }

  function renderComposer() {
    if (intentChoice) return `<div class="ai-intent-choice" role="group" aria-label="选择这次先解决的问题"><h3>这次先帮你解决哪一件事？</h3><p>你提到了辅助搭配，也说到了对线经历。先选一个方向，之后还可以回来继续。</p><blockquote>${paragraph(draft)}</blockquote><div class="ai-task-buttons"><button class="ai-secondary-button" type="button" data-ai-action="intent-support">先看辅助搭配</button><button class="ai-secondary-button" type="button" data-ai-action="intent-diagnosis">先复盘这次对线</button><button class="ai-text-button" type="button" data-ai-action="intent-edit">修改我的问题</button></div></div>`;
    if (latest && latest.status !== "question") {
      return `<div class="ai-completed ai-save-section"><p>${mode === "demo" ? "这项建议来自预设案例，可以保存为示例任务体验下次查看。" : "如果这项行动适合你，保存后下一次回来还可以查看。"}</p><p class="ai-storage-note">只在当前浏览器保存任务与引用依据，不保存完整对话。仅保留一项，可随时清除。</p>${taskNotice ? `<p role="status">${escapeHTML(taskNotice)}</p>` : ""}${pendingTask ? `<div class="ai-task-confirm" role="group" aria-label="确认替换任务"><p>将用${pendingTask.source === "demo" ? "此示例任务" : "这项任务"}替换「${escapeHTML(stored.task?.result.title || "无法读取的旧记录")}」。原记录不会保留。</p><button class="ai-secondary-button" type="button" data-ai-action="confirm-save">确认替换</button><button class="ai-text-button" type="button" data-ai-action="cancel-save">保留原记录</button></div>` : `<div class="ai-task-buttons"><button class="ai-secondary-button" type="button" data-ai-action="save-task">${mode === "demo" ? "保存为示例任务" : latest.status === "collect" ? "保存观察任务" : "设为当前训练"}</button>${stored.task ? '<button class="ai-text-button" type="button" data-ai-action="view-task">查看已保存任务 →</button>' : ""}</div>`}<button class="ai-text-button" type="button" data-ai-action="restart">${mode === "demo" ? "再看一个案例" : "开始新的诊断"} <span aria-hidden="true">↗</span></button></div>`;
    }
    if (mode === "demo") {
      const next = selectedCase?.turns[demoIndex];
      return `<div class="ai-demo-next"><span>案例回放 · 第 ${Math.min(demoIndex + 1, selectedCase.turns.length)} / ${selectedCase.turns.length} 条回答</span>${next ? `<button class="ai-demo-reply" type="button" data-ai-action="demo-next"><small>使用案例玩家的这条回答</small><strong>“${escapeHTML(next.text)}”</strong><span>继续分析 <i aria-hidden="true">→</i></span></button>` : '<button class="ai-secondary-button" type="button" data-ai-action="finish">根据现有线索，带走观察任务 →</button>'}${messages.some((item) => item.role === "user") && next ? '<button class="ai-text-button ai-finish" type="button" data-ai-action="finish">先带走观察任务</button>' : ""}</div>`;
    }
    if (messages.filter((item) => item.role === "user").length >= MAX_TURNS && !loading && !error) {
      return '<div class="ai-completed"><p>我们先整理这几条线索，带走一个可以验证的下一步。</p><button type="button" class="ai-secondary-button" data-ai-action="finish">带走观察任务 →</button></div>';
    }
    const suggestions = latest?.question?.suggestions || (!messages.length ? ["前期总被压出兵线，不知道哪里开始出问题", "知道可以打，但实战总慢半拍", "我记不清具体发生了什么"] : []);
    return `<form class="ai-composer" aria-label="回答 AI 教练">
      ${!loading && !error && suggestions.length ? `<div class="ai-suggestions" aria-label="回答参考">${suggestions.map((text, index) => `<button type="button" data-ai-suggestion="${index}">${escapeHTML(text)}</button>`).join("")}</div>` : ""}
      <label for="ai-message-input">${latest?.question ? "用你的话回答，记不清也没关系" : "回想最近一局，告诉我当时发生了什么"}</label>
      <textarea id="ai-message-input" name="message" maxlength="${MAX_INPUT}" rows="3" placeholder="例如：我一个人对两个人，他们一走近我就不敢补兵……" ${loading || error ? "disabled" : ""}>${escapeHTML(draft)}</textarea>
      <div class="ai-composer-footer"><span class="ai-input-note"><span data-ai-count>${draft.length}</span> / ${MAX_INPUT}<small>Enter 发送 · Shift + Enter 换行</small></span><button class="ai-send" type="submit" ${loading || error || !draft.trim() ? "disabled" : ""}>${loading ? "分析中…" : "发送"} <span aria-hidden="true">↑</span></button></div>
      ${messages.some((item) => item.role === "user") && !error ? `<button class="ai-text-button ai-finish" type="button" data-ai-action="finish" ${loading ? "disabled" : ""}>先带走观察任务</button>` : ""}
      <p class="ai-privacy-note">复盘会将本次对话和玩家背景交给 ${escapeHTML(providerName)} 分析；识别为搭配咨询时会先转入资料页。只描述游戏情况即可。</p>
    </form>`;
  }

  function renderTrainingView() {
    const task = stored.task;
    const title = task ? task.source === "demo" ? "已保存的示例任务" : task.status === "collect" ? "当前观察任务" : "当前训练" : "当前没有可查看的任务";
    container.innerHTML = `<section class="screen ai-screen ai-training-screen"><div class="ai-topbar"><button class="flow-back" type="button" data-ai-action="exit">← ${escapeHTML(exitLabel)}</button><span class="ai-connection">${task?.source === "demo" ? "预设案例 · 非个人训练" : "当前浏览器保存"}</span></div><header class="ai-header"><p class="ai-section-kicker">公孙离 · 下一次继续</p><h1 id="saved-training-title" tabindex="-1">${title}</h1><p>一次只带走一个重点，先记录实际发生了什么。</p></header>
      ${task ? `${task.source === "demo" ? `<p class="ai-demo-banner">示例来自「${escapeHTML(task.caseTitle)}」，不是根据你的经历得出的建议。</p>` : ""}${renderResult(task)}<details class="ai-saved-evidence"><summary>查看保存时的判断依据（${task.evidence.length} 条）</summary>${task.evidence.length ? `<ul>${task.evidence.map((item) => `<li><strong>${escapeHTML(item.label)}</strong><blockquote>“${paragraph(item.quote)}”</blockquote></li>`).join("")}</ul>` : "<p>当时没有足够的明确证据，因此先补充观察。</p>"}</details><p class="ai-storage-note">保存于 ${escapeHTML(new Date(task.createdAt).toLocaleString("zh-CN"))}。仅在当前浏览器、同一访问地址可见，清除浏览器数据也会移除这项记录。</p><p class="ai-storage-note">这版先支持保存与查看。赛后反馈和训练调整还在建设中。</p>` : `<div class="ai-connection-notice" role="status"><p>${stored.error === "unavailable" ? "浏览器暂时不允许读取保存的任务。可以检查浏览器设置后重试；当前诊断仍可使用。" : stored.error === "invalid" ? "已有记录无法读取。你可以清除这项记录，再重新保存任务。" : "完成一次诊断并主动保存后，就能在这里找到下一次的行动。也可以保存示例任务体验这个流程。"}</p></div>`}
      ${taskNotice ? `<p class="ai-task-notice" role="status">${escapeHTML(taskNotice)}</p>` : ""}
      ${confirmingClear ? `<div class="ai-task-confirm" role="group" aria-label="确认清除任务"><p>清除${task ? `「${escapeHTML(task.result.title)}」` : "这项无法读取的任务记录"}？之后需要重新保存。</p><button class="ai-secondary-button" type="button" data-ai-action="confirm-clear">确认清除</button><button class="ai-text-button" type="button" data-ai-action="cancel-clear">保留记录</button></div>` : `<div class="ai-task-buttons">${task || stored.error === "invalid" ? '<button class="ai-secondary-button" type="button" data-ai-action="clear-task">清除已保存任务</button>' : ""}${stored.error === "unavailable" ? '<button class="ai-secondary-button" type="button" data-ai-action="view-task">重新读取</button>' : ""}<button class="ai-text-button" type="button" data-ai-action="new-diagnosis">${task ? "开始新的诊断" : "去诊断或查看案例"} →</button></div>`}
    </section>`;
  }

  function persistTask(task) {
    const outcome = saveTrainingTask(browserStorage(), task);
    pendingTask = null;
    if (outcome.ok) {
      stored = readStoredTask();
      taskNotice = task.source === "demo" ? "示例任务已保存；下次从首页查看。" : "任务已保存；下次从首页继续查看。";
    } else {
      taskNotice = "保存未成功。当前结果还在，请检查浏览器是否允许保存数据后重试。";
    }
    render();
  }

  function storedTaskUnchanged() {
    const fresh = readStoredTask();
    if (fresh.error === "unavailable" || fresh.revision !== stored.revision) {
      stored = fresh;
      pendingTask = null;
      confirmingClear = false;
      taskNotice = fresh.error === "unavailable" ? "暂时无法读取记录，本次操作未执行。请检查浏览器设置后重试。" : "已保存任务发生变化，请查看最新记录后再操作。";
      render();
      return false;
    }
    return true;
  }

  function render() {
    if (!alive) return;
    if (mode === "support") return;
    if (mode === "training") { renderTrainingView(); return; }
    const choosing = mode === "choose";
    const profile = [context.rank, context.mainRole].filter(Boolean).join(" · ");
    const returnToDiagnosisLabel = savedDiagnosis && (savedDiagnosis.messages.length || savedDiagnosis.draft.trim()) ? "继续我的诊断" : "开始我的诊断";
    container.innerHTML = `<section class="screen ai-screen">
      <div class="ai-topbar"><button class="flow-back" type="button" data-ai-action="exit"><span aria-hidden="true">←</span>${escapeHTML(exitLabel)}</button><span class="ai-connection ${mode === "live" && status === "ready" ? "is-live" : ""}"><i aria-hidden="true"></i>${modeLabel()}</span></div>
      <header class="ai-header"><p class="ai-section-kicker">公孙离 · 前期对线诊断 · 测试版</p><h1>前期打不过，<em>先还原那一刻。</em></h1><p>把发生过的事说清楚，我们一起找一个值得先练的突破口。</p></header>
      ${staticHosting ? '<div class="ai-connection-notice" role="status"><span aria-hidden="true">◇</span><div><strong>公开体验版</strong><p>可以体验五个预设案例、查看辅助搭配资料，并在当前浏览器保存示例任务。真实 AI 对话需要后端服务，当前站点尚未连接。</p></div></div>' : status === "checking" ? '<div class="ai-connection-notice" role="status">正在检查 AI 配置…</div>' : status !== "ready" ? `<div class="ai-connection-notice"><span aria-hidden="true">◇</span><div><strong>${escapeHTML(providerName)} 尚未连接</strong><p>${status === "offline" ? "暂时无法连接本地服务。" : `完成 ${escapeHTML(providerName)} 配置并重启后，就可以输入自己的经历。`} 现在可以先体验下面的预设案例。</p><details><summary>如何连接 AI</summary><p>按 <a href="README.md" target="_blank" rel="noopener">项目使用说明</a>配置服务端并启动项目，然后点击重新检查。密钥只保存在服务端。</p></details></div><button type="button" class="ai-text-button" data-ai-action="check-status">重新检查</button></div>` : ""}
      <div class="ai-layout"><div class="ai-chat-panel">
        <div class="ai-panel-heading"><div><span class="ai-coach-symbol" aria-hidden="true">✧</span><span>${mode === "demo" ? escapeHTML(selectedCase.title) : choosing ? "诊断案例" : "一起拆开这个问题"}</span></div><nav class="ai-panel-controls" aria-label="诊断操作">${mode === "live" ? `${messages.length ? '<button type="button" class="ai-text-button" data-ai-action="restart">重新开始</button>' : ""}<button type="button" class="ai-text-button" data-ai-action="show-cases" ${loading ? "disabled" : ""}>看看案例 ↗</button>` : status === "ready" ? `<button type="button" class="ai-text-button" data-ai-action="go-live">${returnToDiagnosisLabel} ↗</button>` : mode === "demo" ? '<button type="button" class="ai-text-button" data-ai-action="show-cases">换个案例 ↗</button>' : ""}</nav></div>
        ${choosing ? renderChooser() : `${mode === "demo" ? '<p class="ai-demo-banner">这是预设案例回放，不会调用 AI，也不解析自由输入。</p>' : ""}${renderConversation()}${renderComposer()}`}
      </div><aside class="ai-sidebar">
        <section class="ai-focus-card"><div class="ai-portrait"><img src="assets/gongsunli-hero-reference.png" alt="公孙离"><span>公孙离 / 发育路</span></div><p class="ai-section-kicker">这一次，只解决一个问题</p><h2>一个卡点<br><em>一项行动</em></h2><p>先区分不知道、做不到，以及局面本身带来的压力。</p>${profile ? `<p class="ai-player-context">${escapeHTML(profile)}</p>` : ""}</section>
        ${renderEvidence()}
        <div class="ai-boundary"><span aria-hidden="true">◇</span><p>描述不够时，先给观察任务。<br>不凭一句话判断你的能力。</p></div>
        <details class="ai-reference-entry"><summary>需要时查阅配合资料</summary><p>复盘涉及辅助配合时，可以参考机制与适用条件，再回来继续分析这一局。</p><button class="ai-text-button" type="button" data-ai-action="open-support" ${loading ? "disabled" : ""}>查看辅助搭配 →</button></details>
      </aside></div>
    </section>`;
    requestAnimationFrame(() => {
      if (!alive) return;
      const log = container.querySelector(".ai-conversation");
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  async function checkStatus() {
    if (staticHosting) {
      status = "static";
      render();
      return;
    }
    const version = ++requestVersion;
    controller?.abort();
    controller = new AbortController();
    const statusController = controller;
    const timeout = setTimeout(() => statusController.abort(), 10000);
    status = "checking";
    render();
    try {
      const response = await fetch("/api/status", { signal: statusController.signal, cache: "no-store" });
      if (!response.ok) throw new Error("status unavailable");
      const data = await response.json();
      if (typeof data.configured !== "boolean") throw new Error("invalid status");
      if (!alive || version !== requestVersion) return;
      providerName = data.provider === "deepseek" ? "DeepSeek" : data.provider === "openai" ? "OpenAI" : "AI";
      status = data.configured ? "ready" : "unconfigured";
      if (data.configured && mode === "choose") mode = "live";
    } catch {
      if (!alive || version !== requestVersion) return;
      status = "offline";
    } finally {
      clearTimeout(timeout);
    }
    render();
  }

  function appendResult(result) {
    if (!result || !["question", "training", "collect"].includes(result.status) || typeof result.interpretation !== "string" || (result.status === "question" ? !result.question?.text : !result.result?.action)) {
      throw new Error("回复格式暂时不完整，请重试。");
    }
    latest = result;
    turns.push({ role: "assistant", result });
    const content = [result.interpretation, result.question?.text, result.result?.reason, result.result?.action, result.result?.measure].filter(Boolean).join("\n\n");
    messages.push({ id: `a${messages.filter((item) => item.role === "assistant").length + 1}`, role: "assistant", content });
  }

  async function requestReply(finish = false) {
    if (loading || !alive) return;
    loading = true;
    error = "";
    pendingFinish = finish;
    const version = ++requestVersion;
    controller?.abort();
    controller = new AbortController();
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), 90000);
    render();
    try {
      const response = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, context, finish }), signal: requestController.signal });
      const data = await response.json();
      if (!alive || version !== requestVersion) return;
      if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(message || "AI 服务暂时无法回复，请稍后重试。");
      }
      if (data.mode !== "live") throw new Error("没有收到真实 AI 的回复，请检查服务配置后重试。");
      appendResult(data.result);
    } catch (issue) {
      if (!alive || version !== requestVersion) return;
      error = issue.name === "AbortError" ? "这次等待时间较长。请检查连接后重试。" : issue instanceof SyntaxError ? "服务没有返回完整的诊断内容，请重试。" : issue.message === "Failed to fetch" ? "连接中断了，请确认本地服务仍在运行。" : issue.message || "连接暂时中断，请稍后重试。";
    } finally {
      clearTimeout(timeout);
      if (alive && version === requestVersion) { loading = false; render(); }
    }
  }

  function openSupport(text = "") {
    const previousMode = mode;
    requestVersion += 1;
    controller?.abort();
    mode = "support";
    intentChoice = false;
    const resume = () => {
      supportCleanup?.();
      supportCleanup = null;
      if (!alive) return;
      mode = previousMode;
      if (status === "checking") checkStatus();
      else render();
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    supportCleanup = mountSupportCoach(container, {
      initialText: text,
      exitLabel: "返回原对话",
      onExit: resume,
      onDiagnosis: resume,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function send({ forceDiagnosis = false } = {}) {
    const text = draft.trim();
    if (mode !== "live" || status !== "ready" || loading || error || !text || text.length > MAX_INPUT || messages.filter((item) => item.role === "user").length >= MAX_TURNS || (latest && latest.status !== "question")) return;
    if (!forceDiagnosis) {
      const intent = detectSupportIntent(text);
      if (intent === "support") { openSupport(text); return; }
      if (intent === "mixed") { intentChoice = true; render(); return; }
    }
    intentChoice = false;
    messages.push({ id: `u${messages.filter((item) => item.role === "user").length + 1}`, role: "user", content: text });
    turns.push({ role: "user", content: text });
    draft = "";
    requestReply(false);
  }

  function demoNext() {
    const turn = selectedCase?.turns[demoIndex];
    if (!turn || latest && latest.status !== "question") return;
    const id = `u${demoIndex + 1}`;
    messages.push({ id, role: "user", content: turn.text });
    turns.push({ role: "user", content: turn.text });
    observations.push(...turn.observations.map((item) => ({ ...item, messageId: item.messageId || id })));
    demoIndex += 1;
    try { appendResult(evaluateTurn({ messages, observations })); }
    catch { error = "这个预设案例暂时未能完成，请选择其他案例。"; }
    render();
  }

  function handleClick(event) {
    if (mode === "support") return;
    const button = event.target.closest("button");
    if (!button || !container.contains(button) || button.disabled) return;
    const action = button.dataset.aiAction;
    if (action === "open-support" && !loading) { openSupport(draft.trim()); return; }
    if (action === "intent-support" && intentChoice) { openSupport(draft.trim()); return; }
    if (action === "intent-diagnosis" && intentChoice) { intentChoice = false; send({ forceDiagnosis: true }); return; }
    if (action === "intent-edit" && intentChoice) { intentChoice = false; render(); container.querySelector("#ai-message-input")?.focus(); return; }
    if (action === "exit") { cleanup(); onExit?.(); return; }
    if (action === "view-task") {
      requestVersion += 1;
      controller?.abort();
      stored = readStoredTask();
      mode = "training";
      pendingTask = null;
      confirmingClear = false;
      taskNotice = "";
      render();
      container.querySelector("#saved-training-title")?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    if (action === "new-diagnosis") { savedDiagnosis = null; reset("choose"); checkStatus(); return; }
    if (action === "save-task") {
      const task = createTrainingTask(latest, { source: mode === "demo" ? "demo" : "live", caseTitle: selectedCase?.title || "" });
      if (!task) { taskNotice = "这项结果暂时无法保存，请重新获取完整结果。"; render(); return; }
      stored = readStoredTask();
      if (stored.error === "unavailable") {
        taskNotice = "暂时无法读取已有记录，为避免覆盖，本次未保存。请检查浏览器设置后重试。";
        render();
        return;
      }
      if (stored.task || stored.error === "invalid") { pendingTask = task; taskNotice = ""; render(); }
      else persistTask(task);
      return;
    }
    if (action === "confirm-save" && pendingTask) { if (storedTaskUnchanged()) persistTask(pendingTask); return; }
    if (action === "cancel-save") { pendingTask = null; taskNotice = "已保留原记录。"; render(); return; }
    if (action === "clear-task") { confirmingClear = true; taskNotice = ""; render(); return; }
    if (action === "cancel-clear") { confirmingClear = false; render(); return; }
    if (action === "confirm-clear" && confirmingClear) {
      if (!storedTaskUnchanged()) return;
      const outcome = clearTrainingTask(browserStorage());
      if (outcome.ok) stored = { task: null, error: null, revision: null };
      taskNotice = outcome.ok ? "已清除保存的任务。这不代表训练已完成。" : "清除未成功，请检查浏览器设置后重试。";
      confirmingClear = false;
      render();
      return;
    }
    if (action === "retry") { requestReply(pendingFinish); return; }
    if (action === "check-status") { checkStatus(); return; }
    if (action === "show-cases") {
      if (mode === "live") savedDiagnosis = { messages, observations, turns, latest, error, pendingFinish, draft };
      reset("choose");
      return;
    }
    if (action === "restart") {
      if (mode === "live") savedDiagnosis = null;
      reset(mode === "demo" ? "choose" : "live");
      return;
    }
    if (action === "go-live") {
      reset("live");
      if (savedDiagnosis) {
        ({ messages, observations, turns, latest, error, pendingFinish, draft } = savedDiagnosis);
        savedDiagnosis = null;
        render();
      }
      return;
    }
    if (action === "demo-next") { demoNext(); return; }
    if (action === "finish" && !loading && messages.some((item) => item.role === "user")) {
      if (mode === "demo") { appendResult(evaluateTurn({ messages, observations, finish: true })); render(); }
      else requestReply(true);
      return;
    }
    if (button.dataset.aiCase) {
      const item = cases.find((candidate) => candidate.id === button.dataset.aiCase);
      if (!item) return;
      reset("choose");
      mode = "demo";
      selectedCase = item;
      render();
      return;
    }
    if (button.dataset.aiSuggestion !== undefined) {
      const suggestions = latest?.question?.suggestions || ["前期总被压出兵线，不知道哪里开始出问题", "知道可以打，但实战总慢半拍", "我记不清具体发生了什么"];
      draft = String(suggestions[Number(button.dataset.aiSuggestion)] || "").slice(0, MAX_INPUT);
      render();
      const input = container.querySelector("#ai-message-input");
      input?.focus();
      input?.setSelectionRange(draft.length, draft.length);
    }
  }

  function handleSubmit(event) { if (event.target.matches(".ai-composer")) { event.preventDefault(); send(); } }
  function handleInput(event) {
    if (event.target.id !== "ai-message-input") return;
    draft = event.target.value;
    const count = container.querySelector("[data-ai-count]");
    if (count) count.textContent = String(draft.length);
    const sendButton = container.querySelector(".ai-send");
    if (sendButton) sendButton.disabled = loading || Boolean(error) || !draft.trim();
  }
  function handleKeydown(event) {
    if (event.target.id === "ai-message-input" && event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); send(); }
  }

  container.addEventListener("click", handleClick);
  container.addEventListener("submit", handleSubmit);
  container.addEventListener("input", handleInput);
  container.addEventListener("keydown", handleKeydown);
  if (mode === "training") render();
  else checkStatus();
  return cleanup;
}
