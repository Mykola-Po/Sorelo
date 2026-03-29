import type { GuidedOnboardingStep } from "@/features/maps/workspace-state";
import type { SupportedLocale } from "@/shared/i18n/config";

type WorkspaceHomeStage = GuidedOnboardingStep | "no_maps";

export type WorkspaceHomeMessages = {
  headerEyebrow: string;
  headerDescription: string;
  roleLabel: string;
  latestMapLabel: string;
  lastUpdatedLabel: string;
  focusEyebrow: string;
  whyNowLabel: string;
  solidProgressLabel: string;
  openMap: string;
  createAnotherMap: string;
  createAnotherMapTitle: string;
  createAnotherMapDescription: string;
  createAnotherMapHelper: string;
  mapLibraryTitle: string;
  mapLibraryDescription: string;
  mapLibraryEmptyTitle: string;
  mapLibraryEmptyDescription: string;
  latestFocusBadge: string;
  recentRunsTitle: string;
  recentRunsDescription: string;
  recentRunsEmptyTitle: string;
  recentRunsEmptyDescription: string;
  noMapsStepsTitle: string;
  noMapsStepsDescription: string;
  summaryTitle: string;
  summaryDescription: string;
  metrics: {
    maps: string;
    concepts: string;
    links: string;
    scenarios: string;
    members: string;
  };
  stages: Record<
    WorkspaceHomeStage,
    {
      title: string;
      description: string;
      whyNow: string;
      solidProgress: string;
    }
  >;
};

export const workspaceHomeMessages: Record<
  SupportedLocale,
  WorkspaceHomeMessages
> = {
  en: {
    headerEyebrow: "Workspace",
    headerDescription:
      "Keep one explainable workspace where Maps, Concepts, Links, Inspector decisions, and Scenarios stay aligned instead of drifting into notes.",
    roleLabel: "Role",
    latestMapLabel: "Latest Map",
    lastUpdatedLabel: "Last updated",
    focusEyebrow: "Next best step",
    whyNowLabel: "Why this now",
    solidProgressLabel: "What becomes solid after this",
    openMap: "Open Map",
    createAnotherMap: "Create another Map",
    createAnotherMapTitle: "Start a new Map only when the subject changes",
    createAnotherMapDescription:
      "Keep each Map bounded to one person or one explainable context so Concepts and Links do not blur together.",
    createAnotherMapHelper:
      "Use a separate Map when a new person, relationship, or context would otherwise weaken clarity.",
    mapLibraryTitle: "Map library",
    mapLibraryDescription:
      "Open the current focus or return to an existing Map without losing the workspace context.",
    mapLibraryEmptyTitle: "No Maps yet",
    mapLibraryEmptyDescription:
      "The first Map gives this workspace a durable surface for Concepts, Links, and Scenarios.",
    latestFocusBadge: "Latest focus",
    recentRunsTitle: "Recent Scenario signal",
    recentRunsDescription:
      "Recent Scenarios show what was tested, what path became plausible, and where the model still needs review.",
    recentRunsEmptyTitle: "No Scenario runs yet",
    recentRunsEmptyDescription:
      "The first Scenario turns structure into an explanation path you can revisit.",
    noMapsStepsTitle: "First useful session",
    noMapsStepsDescription:
      "Use the shortest safe path: create one Map, place the first Concepts, connect one Link, then test one Scenario.",
    summaryTitle: "Solid progress",
    summaryDescription:
      "This workspace turns session effort into stable structure you can inspect again later.",
    metrics: {
      maps: "Maps",
      concepts: "Concepts",
      links: "Links",
      scenarios: "Scenario runs",
      members: "Members",
    },
    stages: {
      no_maps: {
        title: "Create the first Map",
        description:
          "Start with one person and one bounded Map so the workspace can hold an explainable model instead of loose notes.",
        whyNow:
          "Without a Map there is no safe place to convert current attention into durable structure.",
        solidProgress:
          "The first Map becomes the stable surface where Concepts, Links, Inspector detail, and Scenarios can accumulate.",
      },
      no_concepts: {
        title: "Place the first Concept",
        description:
          "The latest Map exists, but it cannot explain anything until the first Concept is placed on the canvas.",
        whyNow:
          "A blank Map still leaves the model in your head instead of on an inspectable surface.",
        solidProgress:
          "The first Concept anchors the model and makes the next session easier to resume.",
      },
      one_concept_no_link: {
        title: "Add the second Concept",
        description:
          "One Concept is still a note. A second Concept creates the minimum structure for an explicit Link.",
        whyNow:
          "You cannot make influence visible until there is another meaningful point on the Map.",
        solidProgress:
          "Two Concepts create a reusable frame for explicit Links and future Scenarios.",
      },
      multiple_concepts_no_link: {
        title: "Connect the first Link",
        description:
          "The factors exist, but the causal or explanatory structure is still hidden until one Link is explicit.",
        whyNow:
          "Without a Link the Map remains a collection of fragments instead of an explainable system.",
        solidProgress:
          "The first Link turns separate Concepts into a readable chain you can inspect and challenge later.",
      },
      has_links_no_run: {
        title: "Run the first Scenario",
        description:
          "The Map has structure, but it still has not been tested against a concrete situation.",
        whyNow:
          "A Scenario is what converts static structure into a traceable explanation path.",
        solidProgress:
          "The first Scenario creates a reusable trail that shows what activated first and why.",
      },
      done: {
        title: "Keep refining the working Map",
        description:
          "The workspace already has usable structure, so the next gain comes from tightening definitions and comparing Scenarios.",
        whyNow:
          "The best next move is refinement, not setup, because the base model already exists.",
        solidProgress:
          "Each edit sharpens the explanation without losing the history of what already works.",
      },
    },
  },
  uk: {
    headerEyebrow: "Робочий простір",
    headerDescription:
      "Тримайте один пояснюваний workspace, де Карти, Концепти, Зв’язки, рішення в Inspector і Сценарії не розсипаються на окремі нотатки.",
    roleLabel: "Роль",
    latestMapLabel: "Остання Карта",
    lastUpdatedLabel: "Оновлено",
    focusEyebrow: "Найкращий наступний крок",
    whyNowLabel: "Чому це важливо зараз",
    solidProgressLabel: "Що стане solid progress після цього",
    openMap: "Відкрити Карту",
    createAnotherMap: "Створити ще одну Карту",
    createAnotherMapTitle: "Починайте нову Карту лише коли змінюється суб’єкт",
    createAnotherMapDescription:
      "Тримайте кожну Карту в межах однієї людини або одного пояснюваного контексту, щоб Концепти й Зв’язки не змішувалися.",
    createAnotherMapHelper:
      "Окрема Карта доречна тоді, коли нова людина, стосунок або контекст починають розмивати ясність поточної моделі.",
    mapLibraryTitle: "Бібліотека Карт",
    mapLibraryDescription:
      "Поверніться до поточного фокусу або відкрийте наявну Карту без втрати контексту workspace.",
    mapLibraryEmptyTitle: "Карт поки немає",
    mapLibraryEmptyDescription:
      "Перша Карта дає цьому workspace стійку поверхню для Концептів, Зв’язків і Сценаріїв.",
    latestFocusBadge: "Поточний фокус",
    recentRunsTitle: "Останній сигнал зі Сценаріїв",
    recentRunsDescription:
      "Останні Сценарії показують, що саме перевіряли, який шлях став правдоподібним і де модель ще потребує уточнення.",
    recentRunsEmptyTitle: "Сценарних прогонів ще немає",
    recentRunsEmptyDescription:
      "Перший Сценарій перетворює структуру на шлях пояснення, до якого можна повернутися.",
    noMapsStepsTitle: "Перша корисна сесія",
    noMapsStepsDescription:
      "Ідіть найкоротшим безпечним шляхом: створіть одну Карту, поставте перші Концепти, додайте один Зв’язок і перевірте один Сценарій.",
    summaryTitle: "Solid progress",
    summaryDescription:
      "Цей workspace перетворює зусилля однієї сесії на стійку структуру, яку можна знову спокійно перевірити.",
    metrics: {
      maps: "Карти",
      concepts: "Концепти",
      links: "Зв’язки",
      scenarios: "Прогони Сценаріїв",
      members: "Учасники",
    },
    stages: {
      no_maps: {
        title: "Створіть першу Карту",
        description:
          "Почніть з однієї людини й однієї обмеженої Карти, щоб workspace міг тримати пояснювану модель, а не набір уривків.",
        whyNow:
          "Без Карти тут ще немає безпечного місця, куди можна перевести поточну увагу в стійку структуру.",
        solidProgress:
          "Перша Карта стає стабільною поверхнею, де накопичуються Концепти, Зв’язки, деталі Inspector і Сценарії.",
      },
      no_concepts: {
        title: "Поставте перший Концепт",
        description:
          "Остання Карта вже є, але вона ще нічого не пояснює, доки на canvas не з’явився перший Концепт.",
        whyNow:
          "Порожня Карта все ще тримає модель у голові, а не на поверхні, яку можна спокійно перевіряти.",
        solidProgress:
          "Перший Концепт закріплює модель і полегшує повернення до неї в наступній сесії.",
      },
      one_concept_no_link: {
        title: "Додайте другий Концепт",
        description:
          "Один Концепт ще схожий на нотатку. Другий Концепт створює мінімальну структуру для явного Зв’язку.",
        whyNow:
          "Вплив не можна зробити видимим, поки на Карті немає другої значущої точки.",
        solidProgress:
          "Два Концепти створюють повторно придатний каркас для явних Зв’язків і майбутніх Сценаріїв.",
      },
      multiple_concepts_no_link: {
        title: "Побудуйте перший Зв’язок",
        description:
          "Фактори вже є, але причинна або пояснювальна структура ще прихована, доки хоча б один Зв’язок не стане явним.",
        whyNow:
          "Без Зв’язку Карта лишається набором фрагментів, а не пояснюваною системою.",
        solidProgress:
          "Перший Зв’язок перетворює окремі Концепти на читабельний ланцюг, який можна перевіряти й оскаржувати.",
      },
      has_links_no_run: {
        title: "Запустіть перший Сценарій",
        description:
          "У Карти вже є структура, але її ще не перевірено на конкретній ситуації.",
        whyNow:
          "Саме Сценарій переводить статичну структуру в шлях пояснення, який можна простежити.",
        solidProgress:
          "Перший Сценарій створює повторно придатний слід того, що активувалося першим і чому.",
      },
      done: {
        title: "Продовжуйте уточнювати робочу Карту",
        description:
          "У workspace вже є робоча структура, тож найбільший наступний виграш дає не setup, а уточнення визначень і порівняння Сценаріїв.",
        whyNow:
          "Базова модель уже існує, тому зараз найкраще не починати спочатку, а точніше налаштовувати те, що працює.",
        solidProgress:
          "Кожне редагування робить пояснення точнішим без втрати історії того, що вже працює.",
      },
    },
  },
  ru: {
    headerEyebrow: "Рабочее пространство",
    headerDescription:
      "Держите один объяснимый workspace, где Карты, Концепты, Связи, решения в Inspector и Сценарии не распадаются на отдельные заметки.",
    roleLabel: "Роль",
    latestMapLabel: "Последняя Карта",
    lastUpdatedLabel: "Обновлено",
    focusEyebrow: "Лучший следующий шаг",
    whyNowLabel: "Почему это важно сейчас",
    solidProgressLabel: "Что станет solid progress после этого",
    openMap: "Открыть Карту",
    createAnotherMap: "Создать ещё одну Карту",
    createAnotherMapTitle: "Создавайте новую Карту только когда меняется субъект",
    createAnotherMapDescription:
      "Держите каждую Карту в границах одного человека или одного объяснимого контекста, чтобы Концепты и Связи не смешивались.",
    createAnotherMapHelper:
      "Отдельная Карта нужна тогда, когда новый человек, отношение или контекст начинают размывать ясность текущей модели.",
    mapLibraryTitle: "Библиотека Карт",
    mapLibraryDescription:
      "Возвращайтесь к текущему фокусу или открывайте существующую Карту без потери контекста workspace.",
    mapLibraryEmptyTitle: "Карт пока нет",
    mapLibraryEmptyDescription:
      "Первая Карта даёт этому workspace устойчивую поверхность для Концептов, Связей и Сценариев.",
    latestFocusBadge: "Текущий фокус",
    recentRunsTitle: "Последний сигнал из Сценариев",
    recentRunsDescription:
      "Последние Сценарии показывают, что именно проверяли, какой путь стал правдоподобным и где модель ещё требует уточнения.",
    recentRunsEmptyTitle: "Сценарных прогонов пока нет",
    recentRunsEmptyDescription:
      "Первый Сценарий превращает структуру в путь объяснения, к которому можно вернуться.",
    noMapsStepsTitle: "Первая полезная сессия",
    noMapsStepsDescription:
      "Идите по самому короткому безопасному пути: создайте одну Карту, поставьте первые Концепты, добавьте одну Связь и проверьте один Сценарий.",
    summaryTitle: "Solid progress",
    summaryDescription:
      "Этот workspace переводит усилие одной сессии в устойчивую структуру, которую можно спокойно проверить позже.",
    metrics: {
      maps: "Карты",
      concepts: "Концепты",
      links: "Связи",
      scenarios: "Прогоны Сценариев",
      members: "Участники",
    },
    stages: {
      no_maps: {
        title: "Создайте первую Карту",
        description:
          "Начните с одного человека и одной ограниченной Карты, чтобы workspace держал объяснимую модель, а не набор разрозненных фрагментов.",
        whyNow:
          "Без Карты здесь ещё нет безопасного места, куда можно перевести текущее внимание в устойчивую структуру.",
        solidProgress:
          "Первая Карта становится стабильной поверхностью, где накапливаются Концепты, Связи, детали Inspector и Сценарии.",
      },
      no_concepts: {
        title: "Поставьте первый Концепт",
        description:
          "Последняя Карта уже создана, но она ещё ничего не объясняет, пока на canvas не появился первый Концепт.",
        whyNow:
          "Пустая Карта всё ещё оставляет модель в голове, а не на поверхности, которую можно проверить.",
        solidProgress:
          "Первый Концепт закрепляет модель и облегчает возвращение к ней в следующей сессии.",
      },
      one_concept_no_link: {
        title: "Добавьте второй Концепт",
        description:
          "Один Концепт всё ещё похож на заметку. Второй Концепт создаёт минимальную структуру для явной Связи.",
        whyNow:
          "Влияние нельзя сделать видимым, пока на Карте нет второй значимой точки.",
        solidProgress:
          "Два Концепта создают повторно используемый каркас для явных Связей и будущих Сценариев.",
      },
      multiple_concepts_no_link: {
        title: "Соберите первую Связь",
        description:
          "Факторы уже есть, но причинная или объясняющая структура всё ещё скрыта, пока хотя бы одна Связь не станет явной.",
        whyNow:
          "Без Связи Карта остаётся набором фрагментов, а не объяснимой системой.",
        solidProgress:
          "Первая Связь превращает отдельные Концепты в читаемую цепочку, которую можно проверять и оспаривать позже.",
      },
      has_links_no_run: {
        title: "Запустите первый Сценарий",
        description:
          "У Карты уже есть структура, но она ещё не проверена на конкретной ситуации.",
        whyNow:
          "Именно Сценарий переводит статичную структуру в путь объяснения, который можно проследить.",
        solidProgress:
          "Первый Сценарий создаёт повторно используемый след того, что активировалось первым и почему.",
      },
      done: {
        title: "Продолжайте уточнять рабочую Карту",
        description:
          "В workspace уже есть рабочая структура, поэтому следующий лучший выигрыш даёт не setup, а уточнение определений и сравнение Сценариев.",
        whyNow:
          "Базовая модель уже существует, поэтому сейчас важнее не начинать заново, а точнее доработать то, что уже работает.",
        solidProgress:
          "Каждое редактирование делает объяснение точнее без потери истории того, что уже работает.",
      },
    },
  },
};

export function getWorkspaceHomeMessages(locale: SupportedLocale) {
  return workspaceHomeMessages[locale];
}
