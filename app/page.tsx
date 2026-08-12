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
    title: "先听懂家乡话",
    text: "首发以普通话与潮汕话离线识别起步，优先优化澄海、潮南、普宁、揭阳口音；开灯、关灯等常用指令不必先说唤醒词。",
    note: "离线模型待实测",
  },
  {
    no: "贰",
    title: "四块面板，四路灯光",
    text: "一块标准 86 型面板分成四块独立齐平触控区，最多控制四路照明。每一路都能单独触摸开关，不使用机械按键行程。",
    note: "四区电容触控",
  },
  {
    no: "叁",
    title: "光与声音，轻轻回应",
    text: "待机暖白、开启暖金，再配一声克制的提示音。首发只做照明开关，把最常用的动作先做稳定、做自然。",
    note: "无机械行程",
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
    text: "不是把更多界面搬上墙，而是让技术退到背后：看得见的是克制的四区薄面板，听得见的是千音自然的回应。",
  },
  {
    index: "03",
    title: "为变化留下余地",
    text: "测试阶段先把离线开关灯做实；后续再加入蓝牙、4G、手机配置与云端升级，并通过网关连接更多家居器件。",
  },
  {
    index: "04",
    title: "以证据换取信任",
    text: "不把概念当成成品，不把动效当成能力。每一步都要经过器件、布线、安规、机械与真实环境验证。",
  },
] as const;

const progressItems = [
  ["已确认", "86 型零火线供电、四路照明与四块齐平触控面的产品定义"],
  ["已完成", "当前 PCB 数字工程基线：ERC 0、PCB DRC 0、50 个网络全连通"],
  ["进行中", "薄型阻燃塑料外壳、离线普通话与潮汕话识别方案收敛"],
  ["待验证", "触控版结构、实物装配、方言模型、温升、浪涌与电磁兼容"],
] as const;

const roomNames = ["客厅主灯", "餐厅灯", "卧室灯", "走廊灯"] as const;

const productSpecs = [
  ["86 × 86", "标准 86 型底盒"],
  ["L + N", "零火线供电"],
  ["四路", "照明开关控制"],
  ["四块", "独立齐平触控面"],
  ["阻燃塑料", "薄型外壳目标"],
  ["暖白 / 暖金", "灯光与轻提示音"],
] as const;

const roadmap = [
  {
    phase: "现在 · 离线首验",
    title: "先把开灯、关灯做稳",
    text: "普通话与潮汕话离线识别起步，优先适配澄海、潮南、普宁、揭阳口音；四路照明名称从预设词库选择。",
  },
  {
    phase: "下一步 · 联网演进",
    title: "蓝牙与 4G 让配置更自由",
    text: "通过手机自定义灯光名称；联网识别可判断使用者方言，并以相近方言回应，能力以实测结果为准。",
  },
  {
    phase: "未来 · 万声智家",
    title: "从一面开关走向全屋协同",
    text: "以网关连接更多家居器件，由手机与云端完成配置、控制和升级；这是规划方向，不是首发已具备功能。",
  },
] as const;
const preorderApiUrl = "https://fangyan-voice-switch.xiaoyilei77.chatgpt.site/api/preorder";

export default function Home() {
  const [lights, setLights] = useState([false, false, false, false]);
  const [lastFeedback, setLastFeedback] = useState("轻触任一分区，体验四路灯光反馈");
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
    const nextState = !lights[index];
    setLights((current) =>
      current.map((state, stateIndex) => (stateIndex === index ? !state : state)),
    );
    setLastFeedback(`${roomNames[index]}${nextState ? "已开启" : "已关闭"} · ${nextState ? "暖金" : "暖白"}提示`);

    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(nextState ? 660 : 520, audioContext.currentTime);
      gain.gain.setValueAtTime(0.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.08);
      oscillator.addEventListener("ended", () => void audioContext.close());
    } catch {
      // 浏览器禁用音频时，灯光状态与文字反馈仍可正常工作。
    }
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
          <span className="brand-mark">千</span>
          <span className="brand-copy"><strong>万声智家</strong><small>方言语音控制开关</small></span>
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
          <p className="eyebrow"><span /> 万声智家 · 千音语音助手</p>
          <h1>让每一种乡音，<br />点亮一个家。</h1>
          <p className="hero-lead">
            面向标准 86 型底盒的零火线四路灯控开关。首发从普通话与潮汕话离线控制开灯、关灯开始，
            把四块独立触控面做得更薄、更贴近墙面。
          </p>
          <div className="hero-tags" aria-label="首发产品要点">
            <span>普通话＋潮汕话</span><span>离线首验</span><span>86 型零火线</span><span>四路触控</span>
          </div>
          <div className="hero-actions">
            <a className="button button-solid" href="#product">向下了解 <span>↓</span></a>
            <a className="button button-ghost" href="#thinking">我的创建思路</a>
          </div>
        </div>

        <div
          className="hero-stage"
          ref={stageRef}
          onPointerMove={moveSpotlight}
          aria-label="四块独立触控面的方言语音控制开关概念图与网页交互模拟"
          data-reveal
        >
          <div className="voice-wave" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
          </div>
          <div className="hero-product-visual">
            <img src="/product-concept-thin-touch.png?v=20260812-touch4" alt="安装在墙面的薄型四路方言语音控制开关，正面分成四块独立齐平触控面" />
            <span>四区薄型触控概念渲染 · 非量产实物</span>
          </div>
          <div className="light-control-panel" aria-label="四路照明网页交互模拟">
            {lights.map((isOn, index) => (
              <button
                key={roomNames[index]}
                className={isOn ? "light-control is-on" : "light-control"}
                onClick={() => toggleLight(index)}
                aria-pressed={isOn}
                aria-label={`${roomNames[index]}网页模拟，当前${isOn ? "已打开" : "已关闭"}`}
              >
                <i aria-hidden="true" />
                <span>{roomNames[index]}</span>
                <small>{isOn ? "已开启" : "已关闭"}</small>
              </button>
            ))}
          </div>
          <p className="hero-feedback" role="status" aria-live="polite">{lastFeedback} · {lights.filter(Boolean).length} / 4 路点亮</p>
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

      <section className="product-specs section-shell" aria-labelledby="product-specs-title">
        <div className="specs-heading" data-reveal>
          <p className="section-kicker">首发定义</p>
          <h2 id="product-specs-title">先把照明开关，<br />做到足够自然。</h2>
          <p>首发只控制照明的开与关；不承诺调光、调色温、插座、窗帘或其他负载。安装需由专业电工完成。</p>
        </div>
        <div className="spec-grid" data-reveal>
          {productSpecs.map(([value, label]) => (
            <div key={label}><strong>{value}</strong><span>{label}</span></div>
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
          <img src="/product-concept-thin-touch.png?v=20260812-touch4" alt="薄型四路方言语音控制开关概念渲染，正面清晰分成四块独立齐平触控面" />
          <div className="showcase-overlay">
            <p>方言语音控制开关</p>
            <span>千音 · 听懂每一种乡音</span>
          </div>
          <span className="concept-label">四区薄型触控概念渲染 · 非量产实物</span>
        </div>
        <div className="showcase-caption section-shell" data-reveal>
          <div>
            <p className="section-kicker">设计展示</p>
            <h2>器物有形，<br />回应无声。</h2>
          </div>
          <p>
            目标外观采用全阻燃塑料结构：正面明确分成四块独立齐平触控面，不设机械按键行程；
            待机暖白、开启暖金，并以轻微提示音回应。厚度、阻燃等级与装配尺寸仍需样机实测闭环。
          </p>
        </div>
      </section>

      <section className="roadmap section-shell" aria-labelledby="roadmap-title">
        <div className="roadmap-heading" data-reveal>
          <p className="section-kicker">演进路径</p>
          <h2 id="roadmap-title">从一面开关，<br />走向万声智家。</h2>
        </div>
        <div className="roadmap-list">
          {roadmap.map((item, index) => (
            <article key={item.phase} data-reveal>
              <span>0{index + 1}</span>
              <p>{item.phase}</p>
              <h3>{item.title}</h3>
              <div>{item.text}</div>
            </article>
          ))}
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
            现有 CAD 仍是机械四键结构基线，下一轮需按“四块齐平触控面”重构；这些图不是量产照片，也不代表已通过实物验证。
          </p>
        </div>
        <div className="engineering-view-grid">
          <figure className="engineering-view-card board-view" data-reveal>
            <img src="/pcb-live-routing.png?v=20260812-touch4" alt="由当前已保存 PCB 路由快照直接重绘的八十六毫米单板走线图" />
            <figcaption>
              <div><span>01</span><strong>PCB 全网路由</strong></div>
              <p>50 个网络 · 695 段走线 · 41 个过孔</p>
            </figcaption>
          </figure>
          <div className="cad-view-stack">
            <figure className="engineering-view-card" data-reveal>
              <img src="/cad-front-face-current.svg?v=20260812-touch4" alt="当前方言语音控制开关八十六毫米正面 CAD 线框图" />
              <figcaption>
                <div><span>02</span><strong>现有正面 CAD 基线</strong></div>
                <p>当前四机械键仅作尺寸对照 · 待改四块齐平触控面</p>
              </figcaption>
            </figure>
            <figure className="engineering-view-card assembly-view" data-reveal>
              <img src="/cad-enclosure-current.svg?v=20260812-touch4" alt="当前方言语音控制开关外壳装配 CAD 线框图" />
              <figcaption>
                <div><span>03</span><strong>现有装配 CAD 基线</strong></div>
                <p>当前装配关系保留作重构输入 · 非触控版最终结构</p>
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
          <div><span>一</span><strong>定义收敛</strong><p>86 型零火线、四路照明与四块齐平触控面</p></div>
          <div><span>二</span><strong>样机实测</strong><p>验证触控、方言、负载、温升、浪涌与长期稳定性</p></div>
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
              产品定义已收敛为标准 86 型底盒、零火线供电、最多四路照明和四块独立齐平触控面。
              当前工程数据不等于触控薄型外壳已经完成；尚未通过外部 DFM、实物装配与市电样机验证。
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
          <div><strong>86 × 86</strong><span>毫米标准面板</span></div>
          <div><strong>4</strong><span>块独立触控面</span></div>
          <div><strong>2</strong><span>类首发语言</span></div>
          <div><strong>4</strong><span>个潮汕重点口音</span></div>
        </div>
      </section>

      <footer>
        <div className="footer-mark">千</div>
        <p>让技术隐于墙内，让生活回到眼前。</p>
        <span>万声智家 · 千音语音助手 · 方言语音控制开关</span>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
