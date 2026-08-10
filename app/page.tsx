"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";

const navItems = [
  ["product", "产品"],
  ["thinking", "创作思路"],
  ["showcase", "设计展示"],
  ["preorder", "预购计划"],
  ["status", "工程进度"],
] as const;

const features = [
  {
    no: "壹",
    title: "方言，应该被听见",
    text: "以离线潮汕话语音为候选方向，让家的控制方式更接近日常说话，而不是要求家人学习机器的语言。",
    note: "潮汕话模型仍在验证",
  },
  {
    no: "贰",
    title: "一次开口，照顾四处灯光",
    text: "四路共板的产品构想，把客厅、餐厅、卧室与走廊收进一块 86 型面板；当前先验证第一路。",
    note: "第一路工程验证",
  },
  {
    no: "叁",
    title: "智能退后，生活向前",
    text: "保留实体按键作为第一秩序。语音、按键与后续无线能力服务于同一件事：少一次寻找，多一分从容。",
    note: "按键始终可达",
  },
] as const;

const thoughts = [
  {
    index: "01",
    title: "从一个真实瞬间开始",
    text: "抱着东西进门、夜里起身、长辈不习惯手机——开灯本不该成为一件需要腾出双手的事。",
  },
  {
    index: "02",
    title: "把复杂藏进墙里",
    text: "不是把更多界面搬上墙，而是让技术退到背后：看得见的是克制的四键面板，听得见的是自然的回应。",
  },
  {
    index: "03",
    title: "为变化留下余地",
    text: "同一块板预留四路能力，首版只实装第一路。先把最小闭环做实，再让产品在验证中生长。",
  },
  {
    index: "04",
    title: "以证据换取信任",
    text: "不把概念当成成品，不把动效当成能力。每一步都要经过器件、布线、安规、机械与真实环境验证。",
  },
] as const;

const progressItems = [
  ["已完成", "86 × 86 毫米单板全网布线与双层铺铜"],
  ["已完成", "ERC 0 / PCB DRC 0 / 50 个网络全连通"],
  ["已完成", "单路首验受控制造资料候选包与独立回读"],
  ["待验证", "外部 DFM、实物装配、方言模型、温升、浪涌与电磁兼容"],
] as const;

const roomNames = ["客厅", "餐厅", "卧室", "走廊"] as const;
const cadLedPositions = [34.53, 45.58, 56.63, 67.67] as const;
const cadButtonPositions = [52.33, 60.47, 68.6, 76.74] as const;
const preorderApiUrl = "https://fangyan-voice-switch.xiaoyilei77.chatgpt.site/api/preorder";

export default function Home() {
  const [lights, setLights] = useState([false, false, false, false]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const registrationDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(height > 0 ? window.scrollY / height : 0);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.14 },
    );

    document.querySelectorAll("[data-reveal]").forEach((node) => observer.observe(node));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!registrationOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRegistrationOpen(false);
    };

    document.body.style.overflow = "hidden";
    registrationDialogRef.current?.focus();
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [registrationOpen]);

  const moveSpotlight = (event: PointerEvent<HTMLDivElement>) => {
    const target = stageRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
  };

  const toggleLight = (index: number) => {
    setLights((current) =>
      current.map((state, stateIndex) => (stateIndex === index ? !state : state)),
    );
  };

  const openRegistration = () => {
    setFormState("idle");
    setFormMessage("");
    setRegistrationOpen(true);
  };

  const submitPreorder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const phone = String(data.get("phone") ?? "").replace(/\s+/g, "");

    setFormState("submitting");
    setFormMessage("正在提交，请稍候……");

    try {
      const endpoint = window.location.hostname === "xiaoyilei77-design.github.io"
        ? preorderApiUrl
        : "/api/preorder";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? "").trim(),
          phone,
          address: String(data.get("address") ?? "").trim(),
          company: String(data.get("company") ?? ""),
          consent: data.get("consent") === "on",
        }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };

      if (!response.ok) throw new Error(result.message || "提交失败，请稍后再试。");

      form.reset();
      setFormState("success");
      setFormMessage("登记成功。我们会在首批体验开放后联系你。");
    } catch (error) {
      setFormState("error");
      setFormMessage(error instanceof Error ? error.message : "提交失败，请稍后再试。");
    }
  };

  return (
    <main>
      <div className="scroll-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${scrollProgress})` }} />
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回首页">
          <span className="brand-mark">声</span>
          <span>方言语音控制开关</span>
        </a>
        <nav aria-label="主导航">
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>
        <a className="header-cta" href="#preorder">预购意向</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><span /> 独立研发 · 方言语音控制开关</p>
          <h1>让一句乡音，<br />点亮一整个家。</h1>
          <p className="hero-lead">
            一块为中国家庭语境而做的 AI 语音四路灯控开关。让技术藏进墙里，
            把更自然的控制方式还给日常。
          </p>
          <div className="hero-actions">
            <a className="button button-solid" href="#product">向下了解 <span>↓</span></a>
            <a className="button button-ghost" href="#thinking">我的创建思路</a>
          </div>
        </div>

        <div
          className="hero-stage"
          ref={stageRef}
          onPointerMove={moveSpotlight}
          aria-label="依据当前外壳 CAD 制作的四路灯控网页交互预览"
          data-reveal
        >
          <div className="stage-orbit orbit-one" aria-hidden="true" />
          <div className="stage-orbit orbit-two" aria-hidden="true" />
          <div className="voice-wave" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
          </div>
          <div className="switch-shadow" aria-hidden="true" />
          <div className="switch-body" aria-hidden="true" />
          <div className="switch-plate">
            {lights.map((isOn, index) => (
              <span
                key={`led-${index}`}
                className={isOn ? "cad-led is-on" : "cad-led"}
                style={{ left: `${cadLedPositions[index]}%` }}
                aria-hidden="true"
              />
            ))}
            {lights.map((isOn, index) => (
              <button
                key={`button-${index}`}
                className={isOn ? "cad-button is-on" : "cad-button"}
                style={{ left: `${cadButtonPositions[index]}%` }}
                onClick={() => toggleLight(index)}
                aria-pressed={isOn}
                aria-label={`${roomNames[index]}灯网页模拟，当前${isOn ? "已打开" : "已关闭"}`}
              />
            ))}
            <span className="cad-mic" aria-hidden="true" />
          </div>
          <div className="hero-model-caption">
            <span>86 × 86 毫米</span>
            <span>依据当前外壳 CAD</span>
            <span>{lights.filter(Boolean).length} / 4 网页模拟点亮</span>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>向下探索</span><i />
        </div>
      </section>

      <section className="manifesto section-shell" id="product">
        <p className="section-kicker" data-reveal>产品主张</p>
        <div className="manifesto-line" data-reveal>
          <span>不是给墙面</span>
          <strong>增加一块屏幕，</strong>
        </div>
        <div className="manifesto-line manifesto-line-right" data-reveal>
          <span>而是让生活</span>
          <strong>少一次寻找。</strong>
        </div>
        <p className="manifesto-note" data-reveal>
          “智能”不必时时被看见。真正合适的技术，应当像灯光一样自然：需要时出现，完成后退场。
        </p>
      </section>

      <section className="features section-shell">
        <div className="section-heading" data-reveal>
          <p className="section-kicker">产品内容</p>
          <h2>一面墙，四路光，<br />一种更自然的关系。</h2>
        </div>
        <div className="feature-list">
          {features.map((feature) => (
            <article className="feature-row" key={feature.no} data-reveal>
              <span className="feature-no">{feature.no}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-note">{feature.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="thinking" id="thinking">
        <div className="section-shell">
          <div className="thinking-intro" data-reveal>
            <p className="section-kicker">我的创建思路</p>
            <h2>先听见生活，<br />再设计产品。</h2>
            <p>我的出发点不是“还能加什么功能”，而是“怎样让控制更少打断生活”。</p>
          </div>
          <div className="thought-grid">
            {thoughts.map((thought) => (
              <article className="thought-card" key={thought.index} data-reveal>
                <span>{thought.index}</span>
                <h3>{thought.title}</h3>
                <p>{thought.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="showcase" id="showcase">
        <div className="showcase-media" data-reveal>
          <img src="/product-concept-2x.jpg" alt="依据当前外壳 CAD 轮廓制作的方言语音控制开关高清概念渲染图" />
          <div className="showcase-overlay">
            <p>方言语音控制开关</p>
            <span>声入其境</span>
          </div>
          <span className="concept-label">基于当前外壳 CAD · 非量产实物</span>
        </div>
        <div className="showcase-caption section-shell" data-reveal>
          <div>
            <p className="section-kicker">设计展示</p>
            <h2>器物有形，<br />回应无声。</h2>
          </div>
          <p>
            依照当前 86 × 86 毫米外壳轮廓，保留四枚独立小按键、四个导光点与右下拾音孔。
            材质与光影仍是概念表达，结构尺寸继续以样机实测闭环。
          </p>
        </div>
      </section>

      <section className="engineering-views section-shell" aria-labelledby="engineering-views-title">
        <div className="engineering-views-heading" data-reveal>
          <div>
            <p className="section-kicker">真实工程视图</p>
            <h2 id="engineering-views-title">不靠想象替代结构，<br />每一张图都有来源。</h2>
          </div>
          <p>
            PCB 图由最新已保存路由快照直接重绘；正面与装配图直接取自当前外壳 CAD。
            它们是工程数据的可视化，不是量产照片，也不代表已通过实物验证。
          </p>
        </div>
        <div className="engineering-view-grid">
          <figure className="engineering-view-card board-view" data-reveal>
            <img src="/pcb-live-routing.png" alt="由当前已保存 PCB 路由快照直接重绘的八十六毫米单板走线图" />
            <figcaption>
              <div><span>01</span><strong>PCB 全网路由</strong></div>
              <p>50 个网络 · 695 段走线 · 41 个过孔</p>
            </figcaption>
          </figure>
          <div className="cad-view-stack">
            <figure className="engineering-view-card" data-reveal>
              <img src="/cad-front-face-current.svg" alt="当前方言语音控制开关八十六毫米正面 CAD 线框图" />
              <figcaption>
                <div><span>02</span><strong>正面 CAD</strong></div>
                <p>四枚独立小按键 · 四个导光点 · 右下拾音孔</p>
              </figcaption>
            </figure>
            <figure className="engineering-view-card assembly-view" data-reveal>
              <img src="/cad-enclosure-current.svg" alt="当前方言语音控制开关外壳装配 CAD 线框图" />
              <figcaption>
                <div><span>03</span><strong>外壳装配 CAD</strong></div>
                <p>外框、载板、四键与导光结构的当前装配关系</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="preorder section-shell" id="preorder">
        <div className="preorder-card" data-reveal>
          <div className="preorder-copy">
            <p className="section-kicker light">首批共创计划</p>
            <h2>预购尚未开放，<br />但欢迎先同行。</h2>
            <p>
              当前处于工程验证阶段，暂不收取订金。首批体验计划将在关键器件、
              安规、机械与样机测试闭环后开放，售价与交付时间届时公布。
            </p>
            <button className="button button-ivory" onClick={() => setPlanOpen((open) => !open)} aria-expanded={planOpen}>
              {planOpen ? "收起计划" : "查看预购路径"} <span>{planOpen ? "↑" : "→"}</span>
            </button>
          </div>
          <div className="preorder-seal" aria-hidden="true">
            <span>首批</span><strong>共创</strong><i>未开放支付</i>
          </div>
        </div>
        <div className={planOpen ? "preorder-path is-open" : "preorder-path"} aria-hidden={!planOpen}>
          <div><span>一</span><strong>工程基线</strong><p>已完成全网布线、双层铺铜与规则复核</p></div>
          <div><span>二</span><strong>样机实测</strong><p>验证方言、负载、温升、浪涌与长期稳定性</p></div>
          <button className="preorder-path-action" type="button" onClick={openRegistration} tabIndex={planOpen ? 0 : -1}>
            <span>三</span><strong>体验邀请</strong><p>填写体验信息，优先获得首批邀请与进展通知</p><i>点击登记 →</i>
          </button>
        </div>
      </section>

      {registrationOpen && (
        <div className="registration-overlay">
          <div
            className="registration-dialog"
            ref={registrationDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
            tabIndex={-1}
          >
            <button
              className="registration-close"
              type="button"
              aria-label="关闭体验登记"
              onClick={() => setRegistrationOpen(false)}
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="registration-intro">
              <p className="section-kicker">抢先体验登记</p>
              <h3 id="registration-title">留下你的信息，<br />优先获得首批邀请。</h3>
              <p>
                这是一份体验意向登记，不是付款订单。请填写真实联系信息，
                用于首批体验联系、地区安排与寄送可行性评估。
              </p>
              <div className="registration-step"><span>01</span><p>填写体验信息</p></div>
              <div className="registration-step"><span>02</span><p>等待首批邀请</p></div>
            </div>

            <form className="preorder-form registration-form" onSubmit={submitPreorder} noValidate={false}>
              <div className="form-field">
              <label htmlFor="preorder-name">姓名</label>
              <input
                id="preorder-name"
                name="name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={30}
                placeholder="请输入姓名"
                required
              />
              </div>
              <div className="form-field">
              <label htmlFor="preorder-phone">手机号</label>
              <input
                id="preorder-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                pattern="1[3-9][0-9]{9}"
                maxLength={11}
                placeholder="请输入 11 位中国大陆手机号"
                required
              />
              </div>
              <div className="form-field">
              <label htmlFor="preorder-address">地址</label>
              <textarea
                id="preorder-address"
                name="address"
                autoComplete="street-address"
                minLength={5}
                maxLength={200}
                rows={4}
                placeholder="请输入省、市、区及详细地址"
                required
              />
              </div>
              <div className="form-trap" aria-hidden="true">
                <label htmlFor="preorder-company">公司</label>
                <input id="preorder-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <label className="form-consent">
                <input name="consent" type="checkbox" required />
                <span>我同意将以上信息用于首批体验联系、地区安排与寄送可行性评估。</span>
              </label>
              <button className="form-submit" type="submit" disabled={formState === "submitting"}>
                {formState === "submitting" ? "正在提交…" : "提交体验意向"}
                <span aria-hidden="true">→</span>
              </button>
              <p
                className={`form-status ${formState === "success" ? "is-success" : ""} ${formState === "error" ? "is-error" : ""}`}
                role="status"
                aria-live="polite"
              >
                {formMessage || "这是一份体验意向登记，本页面不收取订金。"}
              </p>
            </form>
          </div>
        </div>
      )}

      <section className="status" id="status">
        <div className="section-shell status-grid">
          <div className="status-title" data-reveal>
            <p className="section-kicker">工程进度</p>
            <h2>诚实，<br />也是产品的一部分。</h2>
            <p>
              当前产品处于 86 × 86 毫米单板工程原型阶段，已形成单路首验受控制造资料候选包。
              尚未通过外部 DFM、实物装配与市电样机验证，网站演示也不代表商用成品。
            </p>
          </div>
          <div className="status-list">
            {progressItems.map(([state, detail]) => (
              <div className="status-row" key={detail} data-reveal>
                <span className={`status-dot ${state}`} />
                <strong>{state}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="engineering-numbers section-shell" data-reveal>
          <div><strong>86 × 86</strong><span>毫米单板轮廓</span></div>
          <div><strong>50</strong><span>个网络全连通</span></div>
          <div><strong>695</strong><span>段已保存走线</span></div>
          <div><strong>41</strong><span>个已保存过孔</span></div>
        </div>
      </section>

      <footer>
        <div className="footer-mark">声</div>
        <p>让技术隐于墙内，让生活回到眼前。</p>
        <span>方言语音控制开关 · 独立创作中</span>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
