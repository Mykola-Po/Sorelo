import type { SupportedLocale } from "@/shared/i18n/config";

type LandingCard = {
  title: string;
  body: string;
};

type LandingSurfaceCard = LandingCard & {
  name: string;
};

type LandingCanvasNode = {
  type: string;
  title: string;
  caption: string;
};

export type LandingMessageSet = {
  brandNote: string;
  badge: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  ctaNote: string;
  credibility: Array<{
    value: string;
    label: string;
  }>;
  previewEyebrow: string;
  previewTitle: string;
  previewBody: string;
  scenarioLabel: string;
  scenarioValue: string;
  pathLabel: string;
  pathSteps: string[];
  inspectorLabel: string;
  inspectorTitle: string;
  inspectorBody: string;
  problemEyebrow: string;
  problemTitle: string;
  problemBody: string;
  problemPoints: LandingCard[];
  modelEyebrow: string;
  modelTitle: string;
  modelBody: string;
  modelSteps: LandingCard[];
  surfacesEyebrow: string;
  surfacesTitle: string;
  surfacesBody: string;
  surfaces: LandingSurfaceCard[];
  exampleEyebrow: string;
  exampleTitle: string;
  exampleBody: string;
  exampleInsights: LandingCard[];
  sessionEyebrow: string;
  sessionTitle: string;
  sessionBody: string;
  sessionSteps: LandingCard[];
  guardrailsEyebrow: string;
  guardrailsTitle: string;
  guardrailsBody: string;
  guardrails: LandingCard[];
  finalEyebrow: string;
  finalTitle: string;
  finalBody: string;
  canvasNodes: {
    trigger: LandingCanvasNode;
    state: LandingCanvasNode;
    belief: LandingCanvasNode;
    reaction: LandingCanvasNode;
  };
};

export const landingMessages: Record<SupportedLocale, LandingMessageSet> = {
  en: {
    brandNote: "Explainable human maps",
    badge: "Explainable human mapping",
    headline: "See why a person reacts the way they do.",
    subheadline:
      "Sorelo helps you build an explainable map of a person through Concepts, Links, the Inspector, and deterministic Scenarios instead of guesswork, scattered notes, and black-box summaries.",
    bullets: [
      "Connect states, beliefs, triggers, and reactions inside one readable structure.",
      "Clarify meaning in the Inspector without losing the map context.",
      "Test likely reaction paths through Scenarios instead of trusting intuition alone.",
    ],
    cta: "Continue with Google",
    ctaNote:
      "Private workspace. One short path to the first map and the first Scenario.",
    credibility: [
      {
        value: "Concepts",
        label: "Capture the meaningful units of a person model.",
      },
      {
        value: "Links",
        label: "Make directed influence visible instead of implied.",
      },
      {
        value: "Inspector",
        label: "Keep detail readable without leaving the working surface.",
      },
      {
        value: "Scenarios",
        label: "Follow a deterministic path instead of an opaque answer.",
      },
    ],
    previewEyebrow: "Readable preview",
    previewTitle: "One causal system instead of a pile of disconnected episodes",
    previewBody:
      "The canvas keeps structure in view. Side surfaces keep detail bounded, calm, and explainable.",
    scenarioLabel: "Scenario",
    scenarioValue: "Unexpected criticism during a work conversation",
    pathLabel: "Path",
    pathSteps: [
      "Criticism lands",
      "Threat spike rises",
      "Control belief activates",
      "Dialogue shuts down",
    ],
    inspectorLabel: "Inspector",
    inspectorTitle: "Selected Concept: Threat spike",
    inspectorBody:
      "A short-term state that amplifies defensive control behavior and narrows reaction options.",
    problemEyebrow: "Why plain notes break down",
    problemTitle: "The reaction is visible. The cause keeps dissolving.",
    problemBody:
      "When observations are not assembled into a map, it becomes hard to see what starts the reaction, what strengthens it, and what should be refined next.",
    problemPoints: [
      {
        title: "Observations stay fragmented",
        body: "You may have episodes, phrases, feelings, and facts, but not a readable model of the person behind them.",
      },
      {
        title: "The chain of influence stays hidden",
        body: "The visible reaction appears, but the state, belief, and trigger that carried it remain disconnected.",
      },
      {
        title: "The next move is built on guesswork",
        body: "Without structure, it is hard to decide what to inspect, what to challenge, and what likely changes the path.",
      },
    ],
    modelEyebrow: "How Sorelo reads behavior",
    modelTitle: "Between an event and a reaction there is always an internal chain",
    modelBody:
      "Sorelo is built on the idea that a person does not react directly to a signal. The product helps make the intermediate structure visible.",
    modelSteps: [
      {
        title: "A signal arrives",
        body: "An event, phrase, or situation enters the person's current context.",
      },
      {
        title: "State changes perception",
        body: "Current state shapes what feels safe, urgent, threatening, or relevant.",
      },
      {
        title: "Belief gives meaning",
        body: "Beliefs and internal rules interpret what the signal is taken to mean.",
      },
      {
        title: "Links carry the path",
        body: "Directed Links expose what causes, strengthens, weakens, explains, or contradicts the next Concept.",
      },
      {
        title: "The outcome becomes testable",
        body: "Scenarios turn the chain into a readable path you can inspect and challenge.",
      },
    ],
    surfacesEyebrow: "What the product is made of",
    surfacesTitle: "Four surfaces of one explainable model",
    surfacesBody:
      "Each surface solves a specific clarity problem: meaning, influence, detail, and testability.",
    surfaces: [
      {
        name: "Concepts",
        title: "Capture the units that actually change the model",
        body: "Thoughts, states, beliefs, triggers, experiences, and facts become stable points in the map instead of loose fragments.",
      },
      {
        name: "Links",
        title: "Show why one Concept influences another",
        body: "Links make direction and relation explicit so the model stays readable over time.",
      },
      {
        name: "Inspector",
        title: "Clarify meaning without losing the whole",
        body: "Use the Inspector to understand and edit the selected item while keeping the map context visible.",
      },
      {
        name: "Scenarios",
        title: "Test a concrete situation step by step",
        body: "Scenarios reveal the deterministic reaction path instead of hiding logic behind a vague output.",
      },
    ],
    exampleEyebrow: "What this preview proves",
    exampleTitle: "A path is useful only when it can be inspected and challenged",
    exampleBody:
      "A good Scenario does not just return an outcome. It shows what activated, what carried the logic, and where the map still needs refinement.",
    exampleInsights: [
      {
        title: "What activated first",
        body: "The path makes clear which Concepts entered the chain and in what order.",
      },
      {
        title: "Which Links carried the logic",
        body: "The structure stays readable because the chain is grounded in explicit Links, not hidden transitions.",
      },
      {
        title: "What to inspect next",
        body: "The Inspector gives you a bounded place to refine the meaning of the selected Concept or Link.",
      },
    ],
    sessionEyebrow: "First useful session",
    sessionTitle: "A new user should reach the first explainable map without ceremony",
    sessionBody:
      "The landing page should promise the exact path the product continues after sign-in.",
    sessionSteps: [
      {
        title: "Create or enter a Workspace",
        body: "Start inside one bounded place for maps, members, and future refinement.",
      },
      {
        title: "Create the first Map",
        body: "The Map becomes the container for one explainable person model.",
      },
      {
        title: "Place the first two Concepts",
        body: "Capture the first meaningful units directly on the canvas instead of drafting a detached form.",
      },
      {
        title: "Connect the first Link",
        body: "Make the first directional influence explicit and readable.",
      },
      {
        title: "Run the first Scenario",
        body: "Test one concrete situation against the map instead of guessing the likely path.",
      },
      {
        title: "Inspect why the path appeared",
        body: "Understand which Concepts and Links created the reaction path you are looking at.",
      },
    ],
    guardrailsEyebrow: "Why this feels trustworthy",
    guardrailsTitle: "A calm system instead of a black box",
    guardrailsBody:
      "The page should reduce anxiety early by showing what Sorelo is and what it deliberately is not.",
    guardrails: [
      {
        title: "Explainable by design",
        body: "Structure stays visible. The product helps surface meaning instead of hiding it behind automation.",
      },
      {
        title: "Deterministic Scenarios",
        body: "Scenario output is meant to be readable and inspectable, not merely plausible.",
      },
      {
        title: "Canvas-first workspace",
        body: "The map remains the main working surface while secondary detail lives in bounded side panels.",
      },
      {
        title: "Built for refinement",
        body: "The model can be challenged, corrected, and extended instead of becoming a frozen note archive.",
      },
    ],
    finalEyebrow: "Start building",
    finalTitle: "Build the first map of a person and inspect the first Scenario",
    finalBody:
      "If the goal is to understand not only what happened but why the reaction unfolded that way, start with a map instead of another disconnected note.",
    canvasNodes: {
      trigger: {
        type: "trigger",
        title: "Criticism lands",
        caption: "An external signal is interpreted as personal threat.",
      },
      state: {
        type: "state",
        title: "Threat spike",
        caption: "Rapid internal escalation and loss of calm.",
      },
      belief: {
        type: "belief",
        title: "Must regain control",
        caption: "A control belief trying to restore safety.",
      },
      reaction: {
        type: "reaction",
        title: "Cut off dialogue",
        caption: "Visible defensive behavior in conversation.",
      },
    },
  },
  uk: {
    brandNote: "Пояснювані карти людини",
    badge: "Explainable human mapping",
    headline: "Побачте, чому людина реагує саме так.",
    subheadline:
      "Sorelo допомагає зібрати пояснювану карту людини через Concepts, Links, Inspector і детерміновані Scenarios замість здогадів, розрізнених нотаток і чорної скриньки.",
    bullets: [
      "Зв’яжіть стани, переконання, тригери й реакції в одну читабельну структуру.",
      "Уточнюйте сенс в Inspector без втрати контексту карти.",
      "Перевіряйте ймовірні шляхи реакції через Scenarios, а не через інтуїцію.",
    ],
    cta: "Увійти через Google",
    ctaNote:
      "Приватний workspace. Короткий шлях до першої карти та першого Scenario.",
    credibility: [
      {
        value: "Concepts",
        label: "Фіксують змістові одиниці моделі людини.",
      },
      {
        value: "Links",
        label: "Роблять спрямований вплив явним, а не припущеним.",
      },
      {
        value: "Inspector",
        label: "Тримають деталі читабельними без виходу з робочої поверхні.",
      },
      {
        value: "Scenarios",
        label: "Показують детермінований шлях замість непрозорої відповіді.",
      },
    ],
    previewEyebrow: "Читабельний preview",
    previewTitle: "Одна причинна система замість набору розрізнених епізодів",
    previewBody:
      "Canvas тримає структуру перед очима. Бокові поверхні утримують деталі в межах, де їх можна спокійно перевіряти.",
    scenarioLabel: "Scenario",
    scenarioValue: "Неочікувана критика під час робочої розмови",
    pathLabel: "Path",
    pathSteps: [
      "Критика потрапляє в поле уваги",
      "Зростає сплеск загрози",
      "Активується переконання про контроль",
      "Діалог обривається",
    ],
    inspectorLabel: "Inspector",
    inspectorTitle: "Selected Concept: Сплеск загрози",
    inspectorBody:
      "Короткочасний стан, який посилює захисну потребу в контролі та звужує варіанти реакції.",
    problemEyebrow: "Чому звичайні нотатки не спрацьовують",
    problemTitle: "Реакцію видно. Причина розсипається.",
    problemBody:
      "Коли спостереження не зібрані в карту, важко зрозуміти, що саме запускає реакцію, що її підсилює та що уточнювати далі.",
    problemPoints: [
      {
        title: "Спостереження залишаються фрагментами",
        body: "Можуть бути епізоди, фрази, стани й факти, але немає читабельної моделі людини, що стоїть за ними.",
      },
      {
        title: "Ланцюг впливу залишається прихованим",
        body: "Видима реакція є, але стан, переконання й тригер, що її несуть, не зв’язані в одну систему.",
      },
      {
        title: "Наступний крок будується на здогадці",
        body: "Без структури складно вирішити, що саме перевіряти, що оскаржувати й що реально змінює шлях.",
      },
    ],
    modelEyebrow: "Як Sorelo читає поведінку",
    modelTitle: "Між подією та реакцією завжди є внутрішній ланцюг",
    modelBody:
      "Sorelo побудовано на ідеї, що людина не реагує на сигнал напряму. Продукт допомагає зробити проміжну структуру видимою.",
    modelSteps: [
      {
        title: "Сигнал потрапляє всередину",
        body: "Подія, фраза або ситуація входить у поточний контекст людини.",
      },
      {
        title: "Стан забарвлює сприйняття",
        body: "Поточний стан визначає, що здається безпечним, терміновим, загрозливим або важливим.",
      },
      {
        title: "Переконання задає сенс",
        body: "Переконання та внутрішні правила пояснюють, що саме означає цей сигнал.",
      },
      {
        title: "Links несуть логіку далі",
        body: "Спрямовані Links показують, що викликає, підсилює, послаблює, пояснює або суперечить наступному Concept.",
      },
      {
        title: "Підсумок стає перевірюваним",
        body: "Scenarios перетворюють ланцюг на читабельний шлях, який можна переглянути й оскаржити.",
      },
    ],
    surfacesEyebrow: "З чого складається продукт",
    surfacesTitle: "Чотири поверхні однієї explainable моделі",
    surfacesBody:
      "Кожна поверхня вирішує окрему задачу ясності: сенс, вплив, деталізацію та перевірку.",
    surfaces: [
      {
        name: "Concepts",
        title: "Фіксують одиниці, що реально змінюють модель",
        body: "Думки, стани, переконання, тригери, досвіди та факти стають стабільними точками карти, а не розсипом фрагментів.",
      },
      {
        name: "Links",
        title: "Показують, чому один Concept впливає на інший",
        body: "Links роблять напрям і тип зв’язку явними, щоб модель лишалась читабельною з часом.",
      },
      {
        name: "Inspector",
        title: "Прояснює сенс без втрати цілого",
        body: "Inspector дає змогу зрозуміти й редагувати вибраний елемент, не втрачаючи контекст карти.",
      },
      {
        name: "Scenarios",
        title: "Перевіряють конкретну ситуацію крок за кроком",
        body: "Scenarios відкривають детермінований шлях реакції замість розмитого підсумку без логіки.",
      },
    ],
    exampleEyebrow: "Що доводить цей приклад",
    exampleTitle: "Шлях корисний лише тоді, коли його можна переглянути й поставити під сумнів",
    exampleBody:
      "Хороший Scenario не просто повертає підсумок. Він показує, що активувалося, що протягнуло логіку та де карта ще потребує уточнення.",
    exampleInsights: [
      {
        title: "Що активувалося першим",
        body: "Path дає змогу побачити, які Concepts увійшли в ланцюг і в якому порядку.",
      },
      {
        title: "Які Links понесли логіку",
        body: "Структура лишається читабельною, бо шлях спирається на явні Links, а не на приховані переходи.",
      },
      {
        title: "Що уточнювати далі",
        body: "Inspector дає межоване місце, де можна перевірити сенс вибраного Concept або Link.",
      },
    ],
    sessionEyebrow: "Перша корисна сесія",
    sessionTitle: "Новий користувач має дійти до першої explainable карти без зайвої церемонії",
    sessionBody:
      "Landing повинен обіцяти саме той шлях, який продукт реально продовжує після входу.",
    sessionSteps: [
      {
        title: "Створити або відкрити Workspace",
        body: "Почати всередині одного обмеженого місця для карт, учасників і подальшого уточнення.",
      },
      {
        title: "Створити першу Map",
        body: "Map стає контейнером для однієї пояснюваної моделі людини.",
      },
      {
        title: "Поставити перші два Concepts",
        body: "Зафіксувати перші значущі одиниці прямо на canvas замість відриватися на окрему форму.",
      },
      {
        title: "З’єднати перший Link",
        body: "Зробити перший спрямований вплив явним і читабельним.",
      },
      {
        title: "Запустити перший Scenario",
        body: "Перевірити одну конкретну ситуацію на карті замість просто гадати про шлях.",
      },
      {
        title: "Подивитися, чому з’явився цей path",
        body: "Зрозуміти, які Concepts і Links сформували ту реакцію, яку ви бачите.",
      },
    ],
    guardrailsEyebrow: "Чому цьому можна довіряти",
    guardrailsTitle: "Спокійна система замість чорної скриньки",
    guardrailsBody:
      "Сторінка має рано зняти тривогу й показати, чим Sorelo є насправді і чим навмисно не є.",
    guardrails: [
      {
        title: "Explainable за замовчуванням",
        body: "Структура залишається видимою. Продукт виносить сенс назовні замість ховати його за автоматизацією.",
      },
      {
        title: "Детерміновані Scenarios",
        body: "Scenario-результат має бути читабельним і перевірюваним, а не просто правдоподібним.",
      },
      {
        title: "Canvas-first workspace",
        body: "Карта лишається головною робочою поверхнею, а вторинні деталі живуть у межованих бокових панелях.",
      },
      {
        title: "Створено для уточнення",
        body: "Модель можна оскаржувати, виправляти й розширювати, а не заморожувати як архів нотаток.",
      },
    ],
    finalEyebrow: "Почати роботу",
    finalTitle: "Зберіть першу карту людини й перевірте перший Scenario",
    finalBody:
      "Якщо потрібно зрозуміти не лише що сталося, а й чому реакція склалася саме так, починати варто з карти, а не з чергової розрізненої нотатки.",
    canvasNodes: {
      trigger: {
        type: "trigger",
        title: "Критика потрапляє",
        caption: "Зовнішній сигнал сприймається як особиста загроза.",
      },
      state: {
        type: "state",
        title: "Сплеск загрози",
        caption: "Швидка внутрішня ескалація та втрата спокою.",
      },
      belief: {
        type: "belief",
        title: "Треба повернути контроль",
        caption: "Переконання, що намагається відновити безпеку.",
      },
      reaction: {
        type: "reaction",
        title: "Обірвати діалог",
        caption: "Помітна захисна поведінка в розмові.",
      },
    },
  },
  ru: {
    brandNote: "Объяснимые карты человека",
    badge: "Explainable human mapping",
    headline: "Поймите, почему человек реагирует именно так.",
    subheadline:
      "Sorelo помогает собрать объяснимую карту человека через Concepts, Links, Inspector и детерминированные Scenarios вместо догадок, разрозненных заметок и черного ящика.",
    bullets: [
      "Свяжите состояния, убеждения, триггеры и реакции в одну читаемую структуру.",
      "Уточняйте смысл в Inspector без потери контекста карты.",
      "Проверяйте вероятные пути реакции через Scenarios, а не через интуицию.",
    ],
    cta: "Продолжить через Google",
    ctaNote:
      "Приватный workspace. Короткий путь до первой карты и первого Scenario.",
    credibility: [
      {
        value: "Concepts",
        label: "Фиксируют осмысленные единицы модели человека.",
      },
      {
        value: "Links",
        label: "Делают направленное влияние явным, а не подразумеваемым.",
      },
      {
        value: "Inspector",
        label: "Удерживает детали читаемыми без выхода с рабочей поверхности.",
      },
      {
        value: "Scenarios",
        label: "Показывают детерминированный путь вместо непрозрачного ответа.",
      },
    ],
    previewEyebrow: "Читаемый preview",
    previewTitle: "Одна причинная система вместо набора разрозненных эпизодов",
    previewBody:
      "Canvas держит структуру перед глазами. Боковые поверхности удерживают детали в рамках, где их можно спокойно проверить.",
    scenarioLabel: "Scenario",
    scenarioValue: "Неожиданная критика во время рабочего разговора",
    pathLabel: "Path",
    pathSteps: [
      "Критика попадает в фокус",
      "Растет всплеск угрозы",
      "Активируется убеждение про контроль",
      "Диалог обрывается",
    ],
    inspectorLabel: "Inspector",
    inspectorTitle: "Selected Concept: Всплеск угрозы",
    inspectorBody:
      "Кратковременное состояние, которое усиливает защитную потребность в контроле и сужает варианты реакции.",
    problemEyebrow: "Почему обычные заметки не работают",
    problemTitle: "Реакция видна. Причина распадается.",
    problemBody:
      "Когда наблюдения не собраны в карту, трудно понять, что именно запускает реакцию, что ее усиливает и что уточнять дальше.",
    problemPoints: [
      {
        title: "Наблюдения остаются фрагментами",
        body: "Могут быть эпизоды, фразы, состояния и факты, но нет читаемой модели человека, которая стоит за ними.",
      },
      {
        title: "Цепочка влияния остается скрытой",
        body: "Видимая реакция есть, но состояние, убеждение и триггер, которые ее несут, не собраны в одну систему.",
      },
      {
        title: "Следующий шаг строится на догадке",
        body: "Без структуры сложно решить, что проверять, что оспаривать и что реально меняет путь реакции.",
      },
    ],
    modelEyebrow: "Как Sorelo читает поведение",
    modelTitle: "Между событием и реакцией всегда есть внутренняя цепочка",
    modelBody:
      "Sorelo построен на идее, что человек не реагирует на сигнал напрямую. Продукт помогает сделать промежуточную структуру видимой.",
    modelSteps: [
      {
        title: "Сигнал попадает внутрь",
        body: "Событие, фраза или ситуация входят в текущий контекст человека.",
      },
      {
        title: "Состояние окрашивает восприятие",
        body: "Текущее состояние меняет то, что кажется безопасным, срочным, угрожающим или важным.",
      },
      {
        title: "Убеждение задает смысл",
        body: "Убеждения и внутренние правила объясняют, что именно значит этот сигнал.",
      },
      {
        title: "Links несут логику дальше",
        body: "Направленные Links показывают, что вызывает, усиливает, ослабляет, объясняет или противоречит следующему Concept.",
      },
      {
        title: "Итог становится проверяемым",
        body: "Scenarios превращают цепочку в читаемый путь, который можно просмотреть и оспорить.",
      },
    ],
    surfacesEyebrow: "Из чего состоит продукт",
    surfacesTitle: "Четыре поверхности одной explainable модели",
    surfacesBody:
      "Каждая поверхность решает отдельную задачу ясности: смысл, влияние, детализацию и проверку.",
    surfaces: [
      {
        name: "Concepts",
        title: "Фиксируют единицы, которые реально меняют модель",
        body: "Мысли, состояния, убеждения, триггеры, опыты и факты становятся стабильными точками карты, а не россыпью фрагментов.",
      },
      {
        name: "Links",
        title: "Показывают, почему один Concept влияет на другой",
        body: "Links делают направление и тип связи явными, чтобы модель оставалась читаемой со временем.",
      },
      {
        name: "Inspector",
        title: "Проясняет смысл без потери целого",
        body: "Inspector позволяет понять и отредактировать выбранный элемент, не теряя контекст карты.",
      },
      {
        name: "Scenarios",
        title: "Проверяют конкретную ситуацию шаг за шагом",
        body: "Scenarios открывают детерминированный путь реакции вместо размытого итога без логики.",
      },
    ],
    exampleEyebrow: "Что доказывает этот пример",
    exampleTitle: "Путь полезен только тогда, когда его можно просмотреть и оспорить",
    exampleBody:
      "Хороший Scenario не просто возвращает итог. Он показывает, что активировалось, что протащило логику и где карта еще требует уточнения.",
    exampleInsights: [
      {
        title: "Что активировалось первым",
        body: "Path позволяет увидеть, какие Concepts вошли в цепочку и в каком порядке.",
      },
      {
        title: "Какие Links понесли логику",
        body: "Структура остается читаемой, потому что путь опирается на явные Links, а не на скрытые переходы.",
      },
      {
        title: "Что уточнять дальше",
        body: "Inspector дает ограниченное место, где можно проверить смысл выбранного Concept или Link.",
      },
    ],
    sessionEyebrow: "Первая полезная сессия",
    sessionTitle: "Новый пользователь должен дойти до первой explainable карты без лишней церемонии",
    sessionBody:
      "Landing должен обещать ровно тот путь, который продукт реально продолжает после входа.",
    sessionSteps: [
      {
        title: "Создать или открыть Workspace",
        body: "Начать внутри одного ограниченного места для карт, участников и дальнейшего уточнения.",
      },
      {
        title: "Создать первую Map",
        body: "Map становится контейнером для одной объяснимой модели человека.",
      },
      {
        title: "Поставить первые два Concepts",
        body: "Зафиксировать первые значимые единицы прямо на canvas вместо ухода в отдельную форму.",
      },
      {
        title: "Соединить первый Link",
        body: "Сделать первое направленное влияние явным и читаемым.",
      },
      {
        title: "Запустить первый Scenario",
        body: "Проверить одну конкретную ситуацию на карте вместо простого предположения о пути реакции.",
      },
      {
        title: "Посмотреть, почему появился этот path",
        body: "Понять, какие Concepts и Links сформировали ту реакцию, которую вы видите.",
      },
    ],
    guardrailsEyebrow: "Почему этому можно доверять",
    guardrailsTitle: "Спокойная система вместо черного ящика",
    guardrailsBody:
      "Страница должна рано снимать тревогу и показывать, чем Sorelo является на самом деле и чем намеренно не является.",
    guardrails: [
      {
        title: "Explainable по умолчанию",
        body: "Структура остается видимой. Продукт выносит смысл наружу, а не прячет его за автоматизацией.",
      },
      {
        title: "Детерминированные Scenarios",
        body: "Результат Scenario должен быть читаемым и проверяемым, а не просто правдоподобным.",
      },
      {
        title: "Canvas-first workspace",
        body: "Карта остается главной рабочей поверхностью, а вторичные детали живут в ограниченных боковых панелях.",
      },
      {
        title: "Построено для уточнения",
        body: "Модель можно оспаривать, исправлять и расширять, а не замораживать как архив заметок.",
      },
    ],
    finalEyebrow: "Начать работу",
    finalTitle: "Соберите первую карту человека и проверьте первый Scenario",
    finalBody:
      "Если нужно понять не только что произошло, но и почему реакция сложилась именно так, начинать стоит с карты, а не с очередной разрозненной заметки.",
    canvasNodes: {
      trigger: {
        type: "trigger",
        title: "Критика попадает",
        caption: "Внешний сигнал интерпретируется как личная угроза.",
      },
      state: {
        type: "state",
        title: "Всплеск угрозы",
        caption: "Быстрая внутренняя эскалация и потеря спокойствия.",
      },
      belief: {
        type: "belief",
        title: "Нужно вернуть контроль",
        caption: "Убеждение, которое пытается восстановить безопасность.",
      },
      reaction: {
        type: "reaction",
        title: "Оборвать диалог",
        caption: "Заметное защитное поведение в разговоре.",
      },
    },
  },
};
