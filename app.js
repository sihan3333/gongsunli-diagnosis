const app = document.querySelector("#app");
const staticHosting = document.documentElement.dataset.hosting === "static";
let aiCoachCleanup = null;
let aiOpenVersion = 0;
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleIcon = themeToggle?.querySelector(".theme-toggle-icon");
const themeToggleLabel = themeToggle?.querySelector(".theme-toggle-label");

function getSavedTheme() {
  try {
    return localStorage.getItem("hero-breakthrough-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute("aria-label", isLight ? "切换到深色模式" : "切换到浅色模式");
  }
  if (themeToggleIcon) themeToggleIcon.textContent = isLight ? "◐" : "☼";
  if (themeToggleLabel) themeToggleLabel.textContent = isLight ? "深色" : "浅色";
}

applyTheme(getSavedTheme());

themeToggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  try {
    localStorage.setItem("hero-breakthrough-theme", nextTheme);
  } catch {
    // 浏览器禁用本地存储时，当前页面内的主题切换仍然可用。
  }
});

function renderHome() {
  aiOpenVersion += 1;
  aiCoachCleanup?.();
  aiCoachCleanup = null;
  app.innerHTML = `
    <section class="screen home-screen">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span></span>当前开放 · 公孙离</p>
          <h1 id="hero-title">找到你现在，<br /><em>最值得突破的一件事。</em></h1>
          <p class="subtitle">不用给自己打分，也不用先知道问题在哪。从最近一次‘打得不舒服’的经历开始，和 AI 一起找到下一局最值得练的一个点。</p>
          <button class="primary-button" data-action="start">开始找突破口 <span aria-hidden="true">→</span></button>
          ${staticHosting ? '<p class="static-preview-note">公开体验版目前使用预设玩家案例。</p>' : ""}
          <p class="trust-note"><span>◇</span> 不评分 <i></i><span>◇</span> 不上传战绩 <i></i><span>◇</span> 一次只练一个重点</p>
          <div class="saved-task-entry" data-saved-task-entry></div>
        </div>

        <div class="hero-visual has-reference" aria-label="公孙离英雄视觉区域">
          <img class="hero-reference-image" src="assets/hero2.0.png" alt="公孙离英雄视觉" />
          <div class="visual-shade"></div>
          <div class="hero-vertical-meta">
            <strong>公孙离</strong>
            <span>红叶最多情</span>
            <span>一舞寄相思</span>
          </div>
          <p class="hero-quote">每一次练习<br />都是靠近更强的自己。</p>
        </div>

        <div class="hero-foreground-leaves" aria-hidden="true">
          <img class="leaf leaf-a" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-b" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-c" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-d" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-e" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-f" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-g" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-h" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-i" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-j" src="assets/hero-maple-leaf.png" alt="" />
          <img class="leaf leaf-k" src="assets/hero-maple-leaf.png" alt="" />
        </div>

        <section class="process-section" id="about" aria-labelledby="process-title">
          <h2 class="visually-hidden" id="process-title">英雄突破如何帮助玩家</h2>
          <div class="process-grid">
            <article class="process-card"><b>01</b><span class="process-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3.5 25 7v7.2c0 6-3.7 10.7-9 14.3-5.3-3.6-9-8.3-9-14.3V7z"/><path d="m17.5 7.5-4 7 4 2.5-3 7.5"/><path d="M10.5 10.5 7 9M21.5 10.5 25 9"/></svg></span><div><h3>说出困扰</h3><p>告诉我最近哪里打得最不舒服</p></div></article>
            <article class="process-card"><b>02</b><span class="process-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8.5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5"/><path d="m16 12 4 4-4 4-4-4z"/><circle class="icon-dot" cx="16" cy="16" r="1.35"/></svg></span><div><h3>一起拆开</h3><p>通过几个真实场景，慢慢找到原因</p></div></article>
            <article class="process-card"><b>03</b><span class="process-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m16 3 3.2 5.5L17.4 21h-2.8L12.8 8.5z"/><path d="M11 21h10M13.5 24h5M16 21v7"/><path d="M13 14 8 9 4 10.5l6 7M19 14l5-5 4 1.5-6 7"/></svg></span><div><h3>带走一件事</h3><p>下一局只练一个值得优先突破的点</p></div></article>
          </div>
        </section>
      </section>

      <section class="heroes-section" id="heroes" aria-labelledby="heroes-title">
        <div class="module-title"><span></span><h2 id="heroes-title">当前支持英雄</h2><small>未来将支持更多英雄，敬请期待</small></div>
        <div class="heroes-grid">
          <article class="supported-hero">
            <span class="hero-emblem"><img src="assets/gongsunli-hero-reference.png" alt="公孙离" /></span>
            <div class="supported-hero-copy"><div class="hero-name-row"><strong>公孙离</strong><small>测试中</small></div><span>发育路 / 高机动射手</span><p>找到下一个突破口 · 一次只练一个重点</p></div>
            <button class="small-gold-button" data-action="start">开始找突破口 <span>→</span></button>
          </article>
          <article class="coming-hero"><span>＋</span><div><strong>更多英雄</strong><small>敬请期待</small></div></article>
        </div>
      </section>
    </section>
  `;
  loadSavedTaskEntry(aiOpenVersion);
}

async function loadSavedTaskEntry(version) {
  try {
    const { loadTrainingTask } = await import("./training-store.mjs");
    let storage;
    try { storage = window.localStorage; } catch { storage = null; }
    const { task, error } = loadTrainingTask(storage);
    if (version !== aiOpenVersion) return;
    const entry = app.querySelector("[data-saved-task-entry]");
    if (!entry || (!task && !error)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "view-training";
    button.textContent = task ? task.source === "demo" ? "查看已保存的示例任务 →" : task.status === "collect" ? "继续本轮观察任务 →" : "继续本轮训练 →" : "查看任务记录问题 →";
    entry.append(button);
    if (task) {
      const note = document.createElement("p");
      note.textContent = `${task.source === "demo" ? "预设案例 · 非个人训练：" : "已保存："}${task.result.title}`;
      entry.append(note);
    }
  } catch {
    // Direct file preview still shows the home page without module loading.
  }
}

async function openDiagnosis(initialView = "diagnosis") {
  aiCoachCleanup?.();
  aiCoachCleanup = null;
  const version = ++aiOpenVersion;
  app.innerHTML = '<section class="screen diagnosis-shell"><button class="flow-back" data-action="back-home">← 返回首页</button><p role="status">正在准备诊断…</p></section>';
  try {
    const { mountAICoach } = await import("./ai-coach.js");
    if (version !== aiOpenVersion) return;
    aiCoachCleanup = mountAICoach(app, {
      onExit: () => { aiCoachCleanup = null; renderHome(); window.scrollTo({ top: 0, behavior: "instant" }); },
      exitLabel: "返回首页",
      initialView,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch {
    if (version !== aiOpenVersion) return;
    app.innerHTML = '<section class="screen diagnosis-shell"><button class="flow-back" data-action="back-home">← 返回首页</button><h1>诊断页面暂时未能加载</h1><p>请通过本地服务打开网页，再重试。</p><button class="primary-button" data-action="start">重新加载</button></section>';
  }
}

async function openSupportAdvice() {
  aiCoachCleanup?.();
  aiCoachCleanup = null;
  const version = ++aiOpenVersion;
  app.innerHTML = '<section class="screen diagnosis-shell"><button class="flow-back" data-action="back-home">← 返回首页</button><p role="status">正在准备搭配建议…</p></section>';
  try {
    const { mountSupportCoach } = await import("./support-coach.js");
    if (version !== aiOpenVersion) return;
    aiCoachCleanup = mountSupportCoach(app, {
      onExit: () => { renderHome(); window.scrollTo({ top: 0, behavior: "instant" }); },
      onDiagnosis: () => openDiagnosis(),
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch {
    if (version !== aiOpenVersion) return;
    app.innerHTML = '<section class="screen diagnosis-shell"><button class="flow-back" data-action="back-home">← 返回首页</button><h1>搭配页面暂时未能加载</h1><p>请确认本地服务仍在运行，再重试。</p><button class="primary-button" data-action="support-advice">重新加载</button></section>';
  }
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !app.contains(button) || button.disabled) return;
  if (button.dataset.action === "start") openDiagnosis();
  if (button.dataset.action === "support-advice") openSupportAdvice();
  if (button.dataset.action === "view-training") openDiagnosis("training");
  if (button.dataset.action === "back-home") { renderHome(); window.scrollTo({ top: 0, behavior: "instant" }); }
});

renderHome();
