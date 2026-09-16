import { extractSupportPreferences, getSupportAdvice } from "./support-advice.mjs";

const MAX_LINEUP_NOTE = 300;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const paragraph = (value) => escapeHTML(value).replace(/\n/g, "<br>");
const options = {
  frontline: [["unknown", "还不清楚"], ["present", "已有可靠前排"], ["missing", "缺少前排"]],
  preference: [["balanced", "综合考虑"], ["sustain", "续航与拉扯"], ["protection", "保护与抗突进"], ["economy", "发育与容错"]],
  selectedSupport: [["", "还没确定／不在候选中"], ["shaosiyuan", "少司缘"], ["zhangfei", "张飞"], ["taiyi", "太乙真人"]],
};
const sourceLabels = { "version-update": "版本调整", "official-skill": "官方技能", "pro-example": "职业案例" };

function sourceLink(source) {
  let url;
  try {
    const parsed = new URL(source.url);
    if (["https:", "http:"].includes(parsed.protocol)) url = parsed.href;
  } catch { /* Invalid source addresses remain plain text. */ }
  return `<li><span class="sp-source-type">${escapeHTML(sourceLabels[source.kind] || source.kind || "资料")}</span>${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} <span aria-hidden="true">↗</span><span class="visually-hidden">（在新标签页打开）</span></a>` : `<span>${escapeHTML(source.title)}</span>`}<small>${source.date ? `资料日期：${escapeHTML(source.date)}` : "未标注版本日期"}</small></li>`;
}

export function mountSupportCoach(container, { initialText = "", onExit, onDiagnosis, exitLabel = "返回首页" } = {}) {
  let alive = true;
  let confirmed = { frontline: "unknown", preference: "balanced", selectedSupport: "", ...extractSupportPreferences(initialText), lineupNote: "" };
  const manualFields = new Set();
  let advice = getSupportAdvice(confirmed);

  function renderOptions(name) {
    return options[name].map(([value, label]) => `<option value="${value}"${value === confirmed[name] ? " selected" : ""}>${label}</option>`).join("");
  }

  function renderRecommendations() {
    return `<div class="sp-result-heading"><p class="ai-section-kicker">按已确认条件整理</p><h2 id="sp-results-title" tabindex="-1">${escapeHTML(advice.title)}</h2><p>${paragraph(advice.summary)}</p></div>
      ${advice.known?.length ? `<ul class="sp-known" aria-label="用于本次建议的条件">${advice.known.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : ""}
      <div class="sp-card-grid">${advice.recommendations.map((item) => `<article class="sp-card${confirmed.selectedSupport === item.id ? " sp-card-matched" : ""}" aria-labelledby="sp-hero-${escapeHTML(item.id)}"><header><p class="sp-fit">${escapeHTML(item.fit)}</p><h3 id="sp-hero-${escapeHTML(item.id)}">${escapeHTML(item.name)}</h3>${confirmed.selectedSupport === item.id ? '<span class="sp-match-label">你已匹配的辅助</span>' : ""}</header><dl><div><dt>为什么考虑</dt><dd>${paragraph(item.reason)}</dd></div><div class="sp-action"><dt>你可以这样配合</dt><dd>${paragraph(item.action)}</dd></div><div><dt>适用限制</dt><dd>${paragraph(item.limitation)}</dd></div></dl><details class="sp-sources"><summary>查看依据与日期（${item.sources.length} 条）</summary><ul>${item.sources.map(sourceLink).join("")}</ul><p>赛事日期不等于当前版本。职业案例说明曾有这种组合，不证明它适合每套阵容或胜率最高。</p></details></article>`).join("")}</div>
      <aside class="sp-boundary" aria-label="建议的适用范围"><h3>选人前再留意</h3>${advice.matchupNote ? `<p>${paragraph(advice.matchupNote)}</p>` : ""}<ul>${(advice.caveats || []).map((text) => `<li>${escapeHTML(text)}</li>`).join("")}</ul><p>具体阵容比较还未实现，暂不作确定的二对二强弱判断。此版只覆盖这三位候选；未覆盖大乔、瑶等英雄，不代表他们不适配。</p></aside>`;
  }

  function render() {
    container.innerHTML = `<section class="screen ai-screen sp-screen">
      <div class="ai-topbar sp-topbar"><button class="flow-back" type="button" data-sp-action="exit"${typeof onExit !== "function" ? " disabled" : ""}><span aria-hidden="true">←</span> ${escapeHTML(exitLabel)}</button><span class="ai-connection">资料核对：${escapeHTML(advice.updatedAt)}</span></div>
      <header class="ai-header sp-header"><p class="ai-section-kicker">公孙离 · 选人时有个参考</p><h1>公孙离辅助搭配</h1><p>先看候选与配合方式，再根据队伍需要调整。没有唯一适合所有阵容的搭档。</p><p class="sp-provenance">资料经人工核对 · 基于机制的条件建议 · 非实时强度榜单</p></header>
      ${String(initialText).trim() ? `<section class="sp-original-question" aria-label="你的原始问题"><span>你想了解的是</span><blockquote>${paragraph(initialText)}</blockquote></section>` : ""}
      <details class="sp-refine"><summary>补充选人情况，调整建议 <span>可选 · 不填也能看</span></summary><form aria-label="调整辅助搭配建议" data-sp-form><div class="sp-fields"><div class="sp-field"><label for="sp-frontline">我方前排</label><select id="sp-frontline" name="frontline">${renderOptions("frontline")}</select></div><div class="sp-field"><label for="sp-preference">更希望辅助提供</label><select id="sp-preference" name="preference">${renderOptions("preference")}</select></div><div class="sp-field"><label for="sp-selected-support">已匹配的辅助</label><select id="sp-selected-support" name="selectedSupport">${renderOptions("selectedSupport")}</select></div></div><div class="sp-field sp-lineup-field"><label for="sp-lineup-note">补充已知阵容 <span>（可选）</span></label><textarea id="sp-lineup-note" name="lineupNote" maxlength="${MAX_LINEUP_NOTE}" rows="2" placeholder="例如：我方缺少前排；辅助已经选了张飞。" aria-describedby="sp-note-help sp-note-count"></textarea><div class="sp-note-meta"><p id="sp-note-help">明确需求可补充未选项，手动选择优先；不会从英雄名单推断阵容强弱。</p><span id="sp-note-count">0 / ${MAX_LINEUP_NOTE}</span></div></div><div class="sp-form-footer"><p data-sp-form-status role="status">修改后点击更新，才会应用到建议。</p><button type="submit" class="ai-secondary-button sp-update">更新搭配建议</button></div></form></details>
      <p class="sp-update-status" data-sp-update-status role="status"></p><section class="sp-results" data-sp-results aria-labelledby="sp-results-title">${renderRecommendations()}</section>
      <footer class="sp-footer"><p>想分析某一局为什么打不过，可以带着当时的经过继续复盘。</p><button type="button" class="ai-text-button" data-sp-action="diagnosis"${typeof onDiagnosis !== "function" ? " disabled" : ""}>改为复盘对局 <span aria-hidden="true">→</span></button></footer>
    </section>`;
  }

  function handleClick(event) {
    if (!alive) return;
    const button = event.target.closest?.("[data-sp-action]");
    if (!button || !container.contains(button) || button.disabled) return;
    if (button.dataset.spAction === "exit" && typeof onExit === "function") onExit();
    if (button.dataset.spAction === "diagnosis" && typeof onDiagnosis === "function") onDiagnosis();
  }

  function handleInput(event) {
    if (!alive || !container.contains(event.target)) return;
    if (!Object.hasOwn(options, event.target.name) && event.target.name !== "lineupNote") return;
    if (Object.hasOwn(options, event.target.name)) manualFields.add(event.target.name);
    const status = container.querySelector("[data-sp-form-status]");
    if (status) status.textContent = "有尚未应用的修改，点击更新搭配建议后生效。";
    const updateStatus = container.querySelector("[data-sp-update-status]");
    if (updateStatus) updateStatus.textContent = "";
    if (event.target.name === "lineupNote") {
      const count = container.querySelector("#sp-note-count");
      if (count) count.textContent = `${event.target.value.length} / ${MAX_LINEUP_NOTE}`;
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!alive || !container.contains(form) || !form.matches?.("[data-sp-form]")) return;
    event.preventDefault();
    const next = {};
    for (const [name, values] of Object.entries(options)) {
      const value = form.elements.namedItem(name)?.value;
      next[name] = values.some(([candidate]) => candidate === value) ? value : values[0][0];
    }
    next.lineupNote = String(form.elements.namedItem("lineupNote")?.value || "");
    const formStatus = container.querySelector("[data-sp-form-status]");
    if (next.lineupNote.length > MAX_LINEUP_NOTE) {
      if (formStatus) formStatus.textContent = `阵容描述请控制在 ${MAX_LINEUP_NOTE} 字以内，当前建议尚未更新。`;
      form.elements.namedItem("lineupNote")?.focus();
      return;
    }
    const stated = extractSupportPreferences(next.lineupNote);
    for (const [name, values] of Object.entries(options)) {
      if (next[name] === values[0][0] && !manualFields.has(name) && stated[name]) {
        next[name] = stated[name];
        const field = form.elements.namedItem(name);
        if (field) field.value = next[name];
      }
    }
    confirmed = next;
    advice = getSupportAdvice(confirmed);
    const results = container.querySelector("[data-sp-results]");
    if (results) results.innerHTML = renderRecommendations();
    if (formStatus) formStatus.textContent = "已应用当前选项。";
    const status = container.querySelector("[data-sp-update-status]");
    if (status) status.textContent = "搭配建议已更新。";
    container.querySelector("#sp-results-title")?.focus();
  }

  render();
  container.addEventListener("click", handleClick);
  container.addEventListener("submit", handleSubmit);
  container.addEventListener("input", handleInput);
  container.addEventListener("change", handleInput);
  return () => {
    alive = false;
    container.removeEventListener("click", handleClick);
    container.removeEventListener("submit", handleSubmit);
    container.removeEventListener("input", handleInput);
    container.removeEventListener("change", handleInput);
  };
}
