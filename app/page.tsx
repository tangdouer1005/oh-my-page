"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";

type EngineKey = "google" | "baidu" | "bing";
type CategoryKey = "work" | "daily";
type ThemeKey = "light" | "dark";

type Site = {
  id: string;
  title: string;
  url: string;
  note: string;
  icon?: string;
  category: CategoryKey;
};

type Draft = Omit<Site, "id">;

const STORAGE_KEY = "oh-my-page:sites:v1";
const ENGINE_KEY = "oh-my-page:engine:v1";
const COLLAPSE_KEY = "oh-my-page:collapsed-groups:v1";
const THEME_KEY = "oh-my-page:theme:v1";
const ALPHAXIV_MIGRATION_KEY = "oh-my-page:migrations:alphaxiv:v1";
const POPULAR_SITES_MIGRATION_KEY = "oh-my-page:migrations:popular-sites:v1";
const X_SITE_MIGRATION_KEY = "oh-my-page:migrations:x-site:v1";
const MAX_SITES = 20;

const engines: Record<EngineKey, { label: string; short: string; searchUrl: string }> = {
  google: { label: "Google", short: "G", searchUrl: "https://www.google.com/search?q=" },
  baidu: { label: "百度", short: "百", searchUrl: "https://www.baidu.com/s?wd=" },
  bing: { label: "Bing", short: "B", searchUrl: "https://www.bing.com/search?q=" },
};

const categories: Array<{ key: CategoryKey; label: string; hint: string }> = [
  { key: "work", label: "工作", hint: "研究、协作与效率" },
  { key: "daily", label: "日常", hint: "内容、生活与休息" },
];

const defaultSites: Site[] = [
  { id: "github", title: "GitHub", url: "https://github.com", note: "代码、项目与协作", category: "work" },
  { id: "feishu", title: "飞书", url: "https://www.feishu.cn", note: "文档、消息与工作台", category: "work" },
  { id: "scholar", title: "Google Scholar", url: "https://scholar.google.com", note: "检索论文与引用", category: "work" },
  { id: "arxiv", title: "arXiv", url: "https://arxiv.org", note: "浏览最新研究预印本", category: "work" },
  { id: "alphaxiv", title: "alphaXiv", url: "https://www.alphaxiv.org", note: "AI 辅助阅读、批注与讨论论文", category: "work" },
  { id: "chatgpt", title: "ChatGPT", url: "https://chatgpt.com", note: "对话、写作与研究", category: "work" },
  { id: "linuxdo", title: "LINUX DO", url: "https://linux.do", note: "技术交流与社区讨论", category: "work" },
  { id: "gmail", title: "Gmail", url: "https://mail.google.com", note: "邮件与通知", category: "work" },
  { id: "douyin", title: "抖音", url: "https://www.douyin.com", note: "短视频与关注内容", category: "daily" },
  { id: "xiaohongshu", title: "小红书", url: "https://www.xiaohongshu.com", note: "生活灵感与经验分享", category: "daily" },
  { id: "x", title: "X", url: "https://x.com", note: "动态、观点与关注话题", category: "daily" },
  { id: "youtube", title: "YouTube", url: "https://www.youtube.com", note: "视频、课程与订阅", category: "daily" },
  { id: "bilibili", title: "哔哩哔哩", url: "https://www.bilibili.com", note: "视频与稍后再看", category: "daily" },
];

const emptyDraft: Draft = { title: "", url: "", note: "", icon: "", category: "work" };

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getFavicon(site: Site) {
  if (site.icon) return site.icon;
  try {
    return `${new URL(normalizeUrl(site.url)).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function openInNewTab(url: string) {
  const nextTab = window.open(url, "_blank");
  if (nextTab) {
    nextTab.opener = null;
    nextTab.focus();
  }
}

function SiteIcon({ site }: { site: Site }) {
  const [failed, setFailed] = useState(false);
  const source = getFavicon(site);

  useEffect(() => setFailed(false), [source]);

  return (
    <span className="site-icon" aria-hidden="true">
      {source && !failed ? (
        <img src={source} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="site-initial">{site.title.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

function normalizeStoredSite(value: unknown): Site | null {
  if (!value || typeof value !== "object") return null;
  const site = value as Partial<Site>;
  const valid = Boolean(
    typeof site.id === "string" &&
      typeof site.title === "string" &&
      typeof site.url === "string" &&
      typeof site.note === "string" &&
      (site.icon === undefined || typeof site.icon === "string"),
  );
  if (!valid) return null;
  return {
    id: site.id!,
    title: site.title!,
    url: site.url!,
    note: site.note!,
    icon: site.icon,
    category:
      site.category === "daily" ||
      (site.category === undefined && (site.id === "youtube" || site.id === "bilibili"))
        ? "daily"
        : "work",
  };
}

export default function Home() {
  const [sites, setSites] = useState<Site[]>(defaultSites);
  const [engine, setEngine] = useState<EngineKey>("google");
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<CategoryKey, boolean>>({ work: false, daily: true });
  const [hydrated, setHydrated] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedSites = localStorage.getItem(STORAGE_KEY);
      const storedEngine = localStorage.getItem(ENGINE_KEY) as EngineKey | null;
      const storedCollapse = localStorage.getItem(COLLAPSE_KEY);
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedSites) {
        const parsed = JSON.parse(storedSites);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(normalizeStoredSite).filter((site): site is Site => Boolean(site));
          if (normalized.length === parsed.length) {
            const nextSites = normalized.slice(0, MAX_SITES);
            const alphaXiv = defaultSites.find((site) => site.id === "alphaxiv")!;
            const needsAlphaXiv =
              !localStorage.getItem(ALPHAXIV_MIGRATION_KEY) &&
              !nextSites.some((site) => site.id === "alphaxiv");
            if (needsAlphaXiv && nextSites.length < MAX_SITES) {
              const arXivIndex = nextSites.findIndex((site) => site.id === "arxiv");
              const firstDailyIndex = nextSites.findIndex((site) => site.category === "daily");
              const insertAt = arXivIndex >= 0 ? arXivIndex + 1 : firstDailyIndex >= 0 ? firstDailyIndex : nextSites.length;
              nextSites.splice(insertAt, 0, alphaXiv);
            }
            if (!needsAlphaXiv || nextSites.some((site) => site.id === "alphaxiv")) {
              localStorage.setItem(ALPHAXIV_MIGRATION_KEY, "done");
            }

            const popularSites = defaultSites.filter((site) => ["linuxdo", "douyin", "xiaohongshu"].includes(site.id));
            if (!localStorage.getItem(POPULAR_SITES_MIGRATION_KEY)) {
              popularSites.forEach((site) => {
                if (nextSites.length >= MAX_SITES || nextSites.some((existing) => existing.id === site.id)) return;
                const firstDailyIndex = nextSites.findIndex((existing) => existing.category === "daily");
                const insertAt = site.category === "work" && firstDailyIndex >= 0 ? firstDailyIndex : nextSites.length;
                nextSites.splice(insertAt, 0, site);
              });
              if (popularSites.every((site) => nextSites.some((existing) => existing.id === site.id))) {
                localStorage.setItem(POPULAR_SITES_MIGRATION_KEY, "done");
              }
            }

            const xSite = defaultSites.find((site) => site.id === "x")!;
            if (!localStorage.getItem(X_SITE_MIGRATION_KEY)) {
              if (nextSites.length < MAX_SITES && !nextSites.some((site) => site.id === xSite.id)) nextSites.push(xSite);
              if (nextSites.some((site) => site.id === xSite.id)) localStorage.setItem(X_SITE_MIGRATION_KEY, "done");
            }
            setSites(nextSites);
          }
        }
      } else {
        localStorage.setItem(ALPHAXIV_MIGRATION_KEY, "done");
        localStorage.setItem(POPULAR_SITES_MIGRATION_KEY, "done");
        localStorage.setItem(X_SITE_MIGRATION_KEY, "done");
      }
      if (storedEngine && storedEngine in engines) setEngine(storedEngine);
      if (storedCollapse) {
        const parsed = JSON.parse(storedCollapse) as Partial<Record<CategoryKey, unknown>>;
        setCollapsed({ work: parsed.work === true, daily: parsed.daily === true });
      }
      const initialTheme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      setTheme(initialTheme);
      document.documentElement.dataset.theme = initialTheme;
      document.documentElement.dataset.style = "apple";
    } catch {
      // Keep the safe defaults if saved browser data is malformed.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    localStorage.setItem(ENGINE_KEY, engine);
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.style = "apple";
  }, [sites, engine, collapsed, theme, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    openInNewTab(`${engines[engine].searchUrl}${encodeURIComponent(value)}`);
  }

  function beginAdd(category: CategoryKey = "work") {
    setEditingId(null);
    setDraft({ ...emptyDraft, category });
    setFormError("");
    setModalOpen(true);
  }

  function beginEdit(site: Site) {
    setEditingId(site.id);
    setDraft({ title: site.title, url: site.url, note: site.note, icon: site.icon ?? "", category: site.category });
    setFormError("");
    setModalOpen(true);
  }

  function saveSite(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    const url = normalizeUrl(draft.url);

    if (!title || !url) {
      setFormError("请填写网站名称和网址。");
      return;
    }

    try {
      new URL(url);
    } catch {
      setFormError("请输入有效的网址，例如 example.com。");
      return;
    }

    if (editingId) {
      setSites((current) =>
        current.map((site) =>
          site.id === editingId ? { ...site, ...draft, title, url, note: draft.note.trim() } : site,
        ),
      );
      setToast("网站已更新");
    } else {
      if (sites.length >= MAX_SITES) {
        setFormError(`最多可添加 ${MAX_SITES} 个网站。`);
        return;
      }
      setSites((current) => [
        ...current,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...draft, title, url, note: draft.note.trim() },
      ]);
      setToast("网站已添加");
    }

    setModalOpen(false);
  }

  function deleteSite(id: string) {
    const site = sites.find((item) => item.id === id);
    if (!site || !window.confirm(`删除“${site.title}”？`)) return;
    setSites((current) => current.filter((item) => item.id !== id));
    setToast("网站已删除");
  }

  function dropSite(event: DragEvent, targetId: string, targetCategory: CategoryKey) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedId || draggedId === targetId) return;
    setSites((current) => {
      const from = current.findIndex((site) => site.id === draggedId);
      const to = current.findIndex((site) => site.id === targetId);
      if (from < 0 || to < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, { ...moved, category: targetCategory });
      return reordered;
    });
    setDraggedId(null);
  }

  function dropIntoGroup(event: DragEvent, category: CategoryKey) {
    event.preventDefault();
    if (!draggedId) return;
    setSites((current) => {
      const moved = current.find((site) => site.id === draggedId);
      if (!moved) return current;
      return [...current.filter((site) => site.id !== draggedId), { ...moved, category }];
    });
    setDraggedId(null);
  }

  async function exportConfig() {
    const payload = JSON.stringify({ version: 2, engine, sites }, null, 2);
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(payload);
          copied = true;
        } catch {
          // Fall back for browsers that expose the API but deny it in this context.
        }
      }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy failed");
      }
      setToast("配置已复制到剪贴板");
    } catch {
      setToast("导出失败：无法访问剪贴板");
    }
  }

  async function importConfig(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as { sites?: unknown; engine?: unknown } | unknown[];
      const importedSites = Array.isArray(parsed) ? parsed : parsed.sites;
      const importedEngine = Array.isArray(parsed) ? undefined : parsed.engine;
      if (!Array.isArray(importedSites)) throw new Error("invalid");
      const normalized = importedSites.map(normalizeStoredSite).filter((site): site is Site => Boolean(site));
      if (normalized.length !== importedSites.length) throw new Error("invalid");
      setSites(normalized.slice(0, MAX_SITES));
      if (typeof importedEngine === "string" && importedEngine in engines) setEngine(importedEngine as EngineKey);
      setToast("配置已导入");
    } catch {
      setToast("导入失败：请选择有效的配置文件");
    }
  }

  function loadIcon(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setFormError("请选择不超过 2 MB 的图片。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, icon: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          aria-label={`切换到${theme === "dark" ? "白天" : "黑夜"}模式`}
          title={`切换到${theme === "dark" ? "白天" : "黑夜"}模式`}
        >
          <span className="theme-mark" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          {theme === "dark" ? "白天" : "黑夜"}
        </button>
        <button
          className={`edit-toggle ${editing ? "active" : ""}`}
          onClick={() => {
            if (!editing) setCollapsed({ work: false, daily: false });
            setEditing((value) => !value);
          }}
        >
          <span className="edit-dot" />
          {editing ? "完成" : "编辑"}
        </button>
      </header>

      <section className="workspace" aria-label="浏览器起始页">
        <div className="search-overline" aria-hidden="true">
          <span>SEARCH</span>
          <i />
          <span>{engines[engine].label}</span>
        </div>
        <form className="search-panel" onSubmit={submitSearch}>
          <div className="engine-switcher" role="group" aria-label="搜索引擎">
            {(Object.keys(engines) as EngineKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={engine === key ? "selected" : ""}
                onClick={() => setEngine(key)}
                aria-pressed={engine === key}
                title={engines[key].label}
              >
                <span className="engine-mark">{engines[key].short}</span>
                <span className="engine-name">{engines[key].label}</span>
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">使用 {engines[engine].label} 搜索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`使用 ${engines[engine].label} 搜索`}
              spellCheck={false}
            />
          </label>
          <button className="search-submit" type="submit" aria-label="在新标签页搜索">
            <span className="sr-only">搜索</span>
            <b aria-hidden="true">↗</b>
          </button>
        </form>

        <div className="section-heading">
          <span>常用网站</span>
          <i />
          <span>{sites.length.toString().padStart(2, "0")} / {MAX_SITES}</span>
        </div>

        <div className="site-groups">
          {categories.map((category) => {
            const categorySites = sites.filter((site) => site.category === category.key);
            const isCollapsed = collapsed[category.key];
            return (
              <section className={`site-group ${isCollapsed ? "is-collapsed" : ""}`} key={category.key}>
                <button
                  className="group-header"
                  type="button"
                  onClick={() => setCollapsed((current) => ({ ...current, [category.key]: !current[category.key] }))}
                  aria-expanded={!isCollapsed}
                  aria-controls={`group-${category.key}`}
                >
                  <span className={`group-signal ${category.key}`} />
                  <span className="group-copy">
                    <b>{category.label}</b>
                    <small>{category.hint}</small>
                  </span>
                  <i />
                  <span className="group-count">{categorySites.length.toString().padStart(2, "0")}</span>
                  <span className="group-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="group-content" id={`group-${category.key}`}>
                  <div
                    className={`site-grid ${editing ? "is-editing" : ""}`}
                    onDragOver={(event) => editing && event.preventDefault()}
                    onDrop={(event) => dropIntoGroup(event, category.key)}
                  >
                    {categorySites.map((site) => (
                      <article
                        className={`site-card ${draggedId === site.id ? "is-dragging" : ""}`}
                        key={site.id}
                        draggable={editing}
                        onDragStart={() => setDraggedId(site.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onDragOver={(event) => editing && event.preventDefault()}
                        onDrop={(event) => dropSite(event, site.id, category.key)}
                      >
                        <button
                          className="site-launch"
                          onClick={() => !editing && openInNewTab(normalizeUrl(site.url))}
                          disabled={editing}
                          aria-label={`打开 ${site.title}`}
                        >
                          <SiteIcon site={site} />
                          <span className="site-title">{site.title}</span>
                          <span className="site-arrow" aria-hidden="true">↗</span>
                        </button>
                        {!editing && site.note && <div className="site-note">{site.note}</div>}
                        {editing && (
                          <div className="card-controls">
                            <span className="drag-label" title="拖动排序">拖动</span>
                            <button onClick={() => beginEdit(site)}>修改</button>
                            <button className="danger" onClick={() => deleteSite(site.id)}>删除</button>
                          </div>
                        )}
                      </article>
                    ))}
                    {editing && sites.length < MAX_SITES && (
                      <button className="add-card" onClick={() => beginAdd(category.key)}>
                        <span>＋</span>
                        添加到{category.label}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {editing && (
          <div className="edit-bar">
            <span>拖动卡片调整顺序</span>
            <div>
              <button onClick={() => importInput.current?.click()}>导入配置</button>
              <button onClick={exportConfig} aria-label="导出 JSON 到剪贴板">导出</button>
            </div>
          </div>
        )}
        <input ref={importInput} className="hidden-input" type="file" accept="application/json,.json" onChange={importConfig} />
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="site-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span>网站资料</span>
                <h2 id="modal-title">{editingId ? "修改网站" : "添加网站"}</h2>
              </div>
              <button className="close-button" onClick={() => setModalOpen(false)} aria-label="关闭">×</button>
            </div>
            <form onSubmit={saveSite}>
              <label>
                <span>名称</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如 GitHub" />
              </label>
              <label>
                <span>网址</span>
                <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="github.com" inputMode="url" />
              </label>
              <label>
                <span>悬停备注</span>
                <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="一句话说明这个网站的用途" maxLength={80} />
              </label>
              <div className="category-field">
                <span>分类</span>
                <div className="category-options" role="group" aria-label="网站分类">
                  {categories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      className={draft.category === category.key ? "selected" : ""}
                      onClick={() => setDraft({ ...draft, category: category.key })}
                      aria-pressed={draft.category === category.key}
                    >
                      <i className={category.key} />
                      <span>{category.label}</span>
                      <small>{category.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="icon-row">
                <div className="icon-preview">
                  <SiteIcon site={{ id: "preview", title: draft.title || "网站", url: draft.url, note: "", icon: draft.icon, category: draft.category }} />
                </div>
                <div>
                  <span>网站图标</span>
                  <p>默认读取网站图标，也可以上传图片。</p>
                </div>
                <label className="upload-button">
                  更换图标
                  <input type="file" accept="image/*" onChange={loadIcon} />
                </label>
              </div>
              {draft.icon && <button className="clear-icon" type="button" onClick={() => setDraft({ ...draft, icon: "" })}>恢复自动图标</button>}
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" onClick={() => setModalOpen(false)}>取消</button>
                <button className="primary" type="submit">保存网站</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
