import type { SupportedLocale } from "@/shared/i18n/config";

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
  workflowEyebrow: string;
  workflowTitle: string;
  workflowSteps: Array<{
    title: string;
    body: string;
  }>;
  principlesEyebrow: string;
  principlesTitle: string;
  principles: Array<{
    title: string;
    body: string;
  }>;
  canvasNodes: {
    trigger: {
      type: string;
      title: string;
      caption: string;
    };
    state: {
      type: string;
      title: string;
      caption: string;
    };
    belief: {
      type: string;
      title: string;
      caption: string;
    };
    reaction: {
      type: string;
      title: string;
      caption: string;
    };
  };
};

export const landingMessages: Record<SupportedLocale, LandingMessageSet> = {
  en: {
    brandNote: "Explainable human maps",
    badge: "Explainable human mapping",
    headline: "Build an explainable map of a person.",
    subheadline:
      "Turn observations, meanings, and reactions into Concepts, Links, and deterministic Scenarios inside a calm workspace built for explanation instead of black-box guesswork.",
    bullets: [
      "See how one concept influences the next.",
      "Clarify meaning in the Inspector instead of scattered notes.",
      "Test reaction paths without losing the logic behind them.",
    ],
    cta: "Continue with Google",
    ctaNote: "Private workspace. Google sign-in. One short path to the first map.",
    credibility: [
      {
        value: "Concepts",
        label: "Meaningful units instead of fragments",
      },
      {
        value: "Links",
        label: "Visible influence between states",
      },
      {
        value: "Scenarios",
        label: "Deterministic reaction paths",
      },
    ],
    previewEyebrow: "Product preview",
    previewTitle: "One readable system instead of disconnected notes",
    previewBody:
      "The canvas keeps structure visible. Side surfaces keep details bounded and explainable.",
    scenarioLabel: "Scenario",
    scenarioValue: "Unexpected criticism during a work conversation",
    pathLabel: "Reaction path",
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
    workflowEyebrow: "How it works",
    workflowTitle: "From raw observations to a readable human model",
    workflowSteps: [
      {
        title: "Capture what matters",
        body: "Start with a thought, trigger, belief, state, experience, or fact that actually changes the person model.",
      },
      {
        title: "Connect the influence",
        body: "Add Links that explain what causes, strengthens, weakens, explains, or contradicts another Concept.",
      },
      {
        title: "Test a situation",
        body: "Run a deterministic Scenario and inspect the reaction path step by step instead of guessing.",
      },
    ],
    principlesEyebrow: "Why it feels usable",
    principlesTitle: "Built to stay calm, clear, and inspectable",
    principles: [
      {
        title: "Canvas-first workspace",
        body: "Keep the full structure visible while details stay inside bounded side surfaces.",
      },
      {
        title: "Inspector that clarifies meaning",
        body: "Edit Concepts and Links without losing context or falling back to loose documents.",
      },
      {
        title: "Deterministic scenarios",
        body: "Follow a readable path of influence instead of trusting an opaque summary.",
      },
    ],
    canvasNodes: {
      trigger: {
        type: "trigger",
        title: "Criticism lands",
        caption: "External signal interpreted as personal threat.",
      },
      state: {
        type: "state",
        title: "Threat spike",
        caption: "Rapid internal escalation and loss of calm.",
      },
      belief: {
        type: "belief",
        title: "Must regain control",
        caption: "Control belief that tries to restore safety.",
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
    badge: "Пояснюване картування людини",
    headline: "Зберіть пояснювану карту людини.",
    subheadline:
      "Перетворюйте спостереження, смисли й реакції на Концепти, Зв’язки та детерміновані Сценарії у спокійному робочому просторі, створеному для пояснення, а не для чорної скриньки.",
    bullets: [
      "Бачте, як один Концепт впливає на наступний.",
      "Уточнюйте сенс в Інспекторі, а не в розкиданих нотатках.",
      "Перевіряйте сценарні шляхи без втрати логіки реакції.",
    ],
    cta: "Увійти через Google",
    ctaNote: "Приватний workspace. Вхід через Google. Короткий шлях до першої карти.",
    credibility: [
      {
        value: "Концепти",
        label: "Осмислені одиниці, а не фрагменти",
      },
      {
        value: "Зв’язки",
        label: "Видимий вплив між станами",
      },
      {
        value: "Сценарії",
        label: "Детерміновані шляхи реакції",
      },
    ],
    previewEyebrow: "Попередній перегляд продукту",
    previewTitle: "Одна читабельна система замість розрізнених нотаток",
    previewBody:
      "Canvas тримає структуру видимою. Бокові поверхні утримують деталі в межах і роблять їх пояснюваними.",
    scenarioLabel: "Сценарій",
    scenarioValue: "Неочікувана критика під час робочої розмови",
    pathLabel: "Шлях реакції",
    pathSteps: [
      "Критика потрапляє в поле уваги",
      "Зростає сплеск загрози",
      "Активується переконання про контроль",
      "Діалог зупиняється",
    ],
    inspectorLabel: "Інспектор",
    inspectorTitle: "Обраний Концепт: Сплеск загрози",
    inspectorBody:
      "Короткочасний стан, який посилює захисну потребу в контролі й звужує варіанти реакції.",
    workflowEyebrow: "Як це працює",
    workflowTitle: "Від сирих спостережень до читабельної моделі людини",
    workflowSteps: [
      {
        title: "Зафіксуйте те, що справді важить",
        body: "Почніть із думки, тригера, переконання, стану, досвіду чи факту, який реально змінює модель людини.",
      },
      {
        title: "Побудуйте вплив",
        body: "Додавайте Зв’язки, які пояснюють, що саме викликає, посилює, послаблює, пояснює або суперечить іншому Концепту.",
      },
      {
        title: "Перевірте ситуацію",
        body: "Запустіть детермінований Сценарій і перегляньте шлях реакції крок за кроком, а не здогадуйтесь.",
      },
    ],
    principlesEyebrow: "Чому цим зручно користуватися",
    principlesTitle: "Спроєктовано, щоб залишатися спокійним, чітким і перевірюваним",
    principles: [
      {
        title: "Canvas-first робочий простір",
        body: "Уся структура лишається перед очима, а деталі живуть у межах бічних поверхонь.",
      },
      {
        title: "Інспектор, що прояснює зміст",
        body: "Редагуйте Концепти та Зв’язки без втрати контексту й без переходу в сторонні документи.",
      },
      {
        title: "Детерміновані Сценарії",
        body: "Слідкуйте за читабельним шляхом впливу замість довіряти непрозорому підсумку.",
      },
    ],
    canvasNodes: {
      trigger: {
        type: "тригер",
        title: "Критика потрапляє",
        caption: "Зовнішній сигнал сприймається як особиста загроза.",
      },
      state: {
        type: "стан",
        title: "Сплеск загрози",
        caption: "Швидка внутрішня ескалація та втрата спокою.",
      },
      belief: {
        type: "переконання",
        title: "Треба повернути контроль",
        caption: "Переконання, що намагається відновити безпеку.",
      },
      reaction: {
        type: "реакція",
        title: "Обірвати діалог",
        caption: "Помітна захисна поведінка в розмові.",
      },
    },
  },
  ru: {
    brandNote: "Объяснимые карты человека",
    badge: "Объяснимое картирование человека",
    headline: "Соберите объяснимую карту человека.",
    subheadline:
      "Превращайте наблюдения, смыслы и реакции в Концепты, Связи и детерминированные Сценарии в спокойном рабочем пространстве, созданном для объяснения, а не для черного ящика.",
    bullets: [
      "Видно, как один Концепт влияет на следующий.",
      "Уточняйте смысл в Инспекторе, а не в разрозненных заметках.",
      "Проверяйте сценарные пути без потери логики реакции.",
    ],
    cta: "Продолжить через Google",
    ctaNote: "Приватный workspace. Вход через Google. Короткий путь к первой карте.",
    credibility: [
      {
        value: "Концепты",
        label: "Осмысленные единицы, а не фрагменты",
      },
      {
        value: "Связи",
        label: "Видимое влияние между состояниями",
      },
      {
        value: "Сценарии",
        label: "Детерминированные пути реакции",
      },
    ],
    previewEyebrow: "Предпросмотр продукта",
    previewTitle: "Одна читаемая система вместо разрозненных заметок",
    previewBody:
      "Canvas держит структуру видимой. Боковые поверхности удерживают детали в понятных и ограниченных рамках.",
    scenarioLabel: "Сценарий",
    scenarioValue: "Неожиданная критика во время рабочего разговора",
    pathLabel: "Путь реакции",
    pathSteps: [
      "Критика попадает в фокус",
      "Растет всплеск угрозы",
      "Активируется убеждение про контроль",
      "Диалог обрывается",
    ],
    inspectorLabel: "Инспектор",
    inspectorTitle: "Выбранный Концепт: Всплеск угрозы",
    inspectorBody:
      "Кратковременное состояние, которое усиливает защитную потребность в контроле и сужает варианты реакции.",
    workflowEyebrow: "Как это работает",
    workflowTitle: "От сырых наблюдений к читаемой модели человека",
    workflowSteps: [
      {
        title: "Зафиксируйте то, что действительно важно",
        body: "Начните с мысли, триггера, убеждения, состояния, опыта или факта, который реально меняет модель человека.",
      },
      {
        title: "Соберите влияние",
        body: "Добавляйте Связи, которые объясняют, что вызывает, усиливает, ослабляет, объясняет или противоречит другому Концепту.",
      },
      {
        title: "Проверьте ситуацию",
        body: "Запустите детерминированный Сценарий и проследите путь реакции шаг за шагом вместо догадок.",
      },
    ],
    principlesEyebrow: "Почему этим удобно пользоваться",
    principlesTitle: "Спроектировано так, чтобы оставаться спокойным, ясным и проверяемым",
    principles: [
      {
        title: "Canvas-first рабочее пространство",
        body: "Вся структура остается перед глазами, а детали живут в границах боковых поверхностей.",
      },
      {
        title: "Инспектор, который проясняет смысл",
        body: "Редактируйте Концепты и Связи без потери контекста и без ухода в сторонние документы.",
      },
      {
        title: "Детерминированные Сценарии",
        body: "Следите за читаемым путем влияния вместо доверия непрозрачной сводке.",
      },
    ],
    canvasNodes: {
      trigger: {
        type: "триггер",
        title: "Критика попадает",
        caption: "Внешний сигнал интерпретируется как личная угроза.",
      },
      state: {
        type: "состояние",
        title: "Всплеск угрозы",
        caption: "Быстрая внутренняя эскалация и потеря спокойствия.",
      },
      belief: {
        type: "убеждение",
        title: "Нужно вернуть контроль",
        caption: "Убеждение, которое пытается восстановить безопасность.",
      },
      reaction: {
        type: "реакция",
        title: "Оборвать диалог",
        caption: "Заметное защитное поведение в разговоре.",
      },
    },
  },
};
