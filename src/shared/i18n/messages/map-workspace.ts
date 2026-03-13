import type {
  ConceptType,
  RelationType,
  ScenarioRunStatus,
  WorkspaceRole,
} from "@/shared/db/schema";
import type { SupportedLocale } from "@/shared/i18n/config";
import type { GuidedOnboardingStep } from "@/features/maps/workspace-state";

export type MapWorkspaceMessages = {
  mapReadyBadge: string;
  stepLabel: (stepNumber: number, totalSteps: number) => string;
  topBar: {
    newConcept: string;
    createLink: string;
    runScenario: string;
    inspector: string;
    scenario: string;
    mapSettings: string;
    expandPanel: string;
    collapsePanel: string;
    openInspector: string;
    openScenario: string;
  };
  canvas: {
    placeConceptBadge: string;
    placeConceptTitle: string;
    placeConceptDescription: string;
    createLinkBadge: string;
    createLinkSourceTitle: string;
    createLinkSourceDescription: string;
    createLinkTargetTitle: (conceptTitle: string) => string;
    createLinkTargetDescription: string;
    emptyOverlay: string;
    loadingSnapshot: string;
    conceptSummaryFallback: string;
    updatingPosition: string;
  };
  guided: Record<
    GuidedOnboardingStep,
    {
      title: string;
      description: string;
      actionLabel: string | null;
      stepNumber: number;
      totalSteps: number;
    }
  >;
  inspector: {
    placeConceptTitle: string;
    placeConceptDescription: string;
    connectLinkSourceTitle: string;
    connectLinkSourceDescription: string;
    connectLinkTargetTitle: (conceptTitle: string) => string;
    connectLinkTargetDescription: string;
    cancel: string;
    newConcept: string;
    createLink: string;
    mapSettings: string;
    positionLabel: string;
    titleLabel: string;
    conceptTypeLabel: string;
    summaryLabel: string;
    descriptionLabel: string;
    createConceptCta: string;
    createConceptTitlePlaceholder: string;
    createConceptSummaryPlaceholder: string;
    createConceptDescriptionPlaceholder: string;
    conceptSave: string;
    conceptArchive: string;
    connectedLinksTitle: string;
    connectedLinksEmpty: string;
    incoming: string;
    outgoing: string;
    atLeastTwoConceptsTitle: string;
    atLeastTwoConceptsDescription: string;
    sourceConceptLabel: string;
    targetConceptLabel: string;
    relationTypeLabel: string;
    strengthLabel: string;
    linkDescriptionPlaceholder: string;
    createLinkCta: string;
    linkTitle: string;
    linkDelete: string;
    currentDirection: string;
    unknownConcept: string;
    saveLink: string;
    saveMap: string;
    archiveMap: string;
    subjectLabel: string;
    openLink: string;
    strengthValue: (value: number) => string;
  };
  scenario: {
    runTitle: string;
    runDescription: string;
    situationLabel: string;
    situationPlaceholder: string;
    runCta: string;
    latestRun: string;
    noSummaryYet: string;
    openRecentRuns: string;
    saveTab: string;
    savedTab: string;
    runsTab: string;
    saveTitle: string;
    saveCta: string;
    saveTitlePlaceholder: string;
    saveSituationPlaceholder: string;
    noScenariosTitle: string;
    noScenariosDescription: string;
    savedSeeds: (count: number) => string;
    runSavedScenario: string;
    noRunsTitle: string;
    noRunsDescription: string;
    latestRunFallbackTitle: string;
    viaLink: string;
    step: (stepOrder: number) => string;
    score: (score: number) => string;
    seedConceptsLabel: string;
    seedConceptsEmpty: string;
    mobileInspectorDescription: string;
    mobileScenarioDescription: string;
  };
  labels: {
    conceptTypes: Record<ConceptType, string>;
    relationTypes: Record<RelationType, string>;
    workspaceRoles: Record<WorkspaceRole, string>;
    scenarioStatuses: Record<ScenarioRunStatus, string>;
    effectTypes: Record<string, string>;
  };
};

function buildGuidedMessages(locale: SupportedLocale) {
  if (locale === "uk") {
    return {
      no_concepts: {
        title: "Поставте перший Концепт",
        description:
          "Почніть карту з одного значущого фактора, який реально допомагає пояснити людину.",
        actionLabel: "Новий Концепт",
        stepNumber: 1,
        totalSteps: 4,
      },
      one_concept_no_link: {
        title: "Додайте другий Концепт",
        description:
          "Для першого Зв’язку потрібні щонайменше два Концепти, тож додайте ще один значущий фактор.",
        actionLabel: "Новий Концепт",
        stepNumber: 2,
        totalSteps: 4,
      },
      multiple_concepts_no_link: {
        title: "Побудуйте перший Зв’язок",
        description:
          "Покажіть, як один Концепт впливає на інший, щоб карта стала пояснюваною.",
        actionLabel: "Створити Зв’язок",
        stepNumber: 3,
        totalSteps: 4,
      },
      has_links_no_run: {
        title: "Запустіть перший Сценарій",
        description:
          "Перевірте карту на конкретній ситуації та перегляньте шлях пояснення.",
        actionLabel: "Запустити Сценарій",
        stepNumber: 4,
        totalSteps: 4,
      },
      done: {
        title: "Продовжуйте уточнювати карту",
        description:
          "Обирайте будь-який Концепт або Зв’язок, щоб уточнювати визначення, додавати структуру та порівнювати Сценарії.",
        actionLabel: null,
        stepNumber: 4,
        totalSteps: 4,
      },
    } satisfies MapWorkspaceMessages["guided"];
  }

  if (locale === "ru") {
    return {
      no_concepts: {
        title: "Поставьте первый Концепт",
        description:
          "Начните карту с одного значимого фактора, который действительно помогает объяснить человека.",
        actionLabel: "Новый Концепт",
        stepNumber: 1,
        totalSteps: 4,
      },
      one_concept_no_link: {
        title: "Добавьте второй Концепт",
        description:
          "Для первой Связи нужны как минимум два Концепта, поэтому добавьте ещё один значимый фактор.",
        actionLabel: "Новый Концепт",
        stepNumber: 2,
        totalSteps: 4,
      },
      multiple_concepts_no_link: {
        title: "Соберите первую Связь",
        description:
          "Покажите, как один Концепт влияет на другой, чтобы карта стала объяснимой.",
        actionLabel: "Создать Связь",
        stepNumber: 3,
        totalSteps: 4,
      },
      has_links_no_run: {
        title: "Запустите первый Сценарий",
        description:
          "Проверьте карту на конкретной ситуации и изучите путь объяснения.",
        actionLabel: "Запустить Сценарий",
        stepNumber: 4,
        totalSteps: 4,
      },
      done: {
        title: "Продолжайте уточнять карту",
        description:
          "Выбирайте любой Концепт или Связь, чтобы уточнять определения, добавлять структуру и сравнивать Сценарии.",
        actionLabel: null,
        stepNumber: 4,
        totalSteps: 4,
      },
    } satisfies MapWorkspaceMessages["guided"];
  }

  return {
    no_concepts: {
      title: "Place the first Concept",
      description:
        "Start the map with one meaningful factor that helps explain the person.",
      actionLabel: "New Concept",
      stepNumber: 1,
      totalSteps: 4,
    },
    one_concept_no_link: {
      title: "Add a second Concept",
      description:
        "A Link needs at least two Concepts, so add one more meaningful factor.",
      actionLabel: "New Concept",
      stepNumber: 2,
      totalSteps: 4,
    },
    multiple_concepts_no_link: {
      title: "Connect the first Link",
      description:
        "Show how one Concept influences another so the map becomes explainable.",
      actionLabel: "Create Link",
      stepNumber: 3,
      totalSteps: 4,
    },
    has_links_no_run: {
      title: "Run the first Scenario",
      description:
        "Test the map against a concrete situation and inspect the explanation path.",
      actionLabel: "Run Scenario",
      stepNumber: 4,
      totalSteps: 4,
    },
    done: {
      title: "Keep refining the map",
      description:
        "Select any Concept or Link to tighten definitions, add structure, and compare Scenarios.",
      actionLabel: null,
      stepNumber: 4,
      totalSteps: 4,
    },
  } satisfies MapWorkspaceMessages["guided"];
}

export const mapWorkspaceMessages: Record<SupportedLocale, MapWorkspaceMessages> = {
  en: {
    mapReadyBadge: "Map ready",
    stepLabel: (stepNumber, totalSteps) => `Step ${stepNumber} of ${totalSteps}`,
    topBar: {
      newConcept: "New Concept",
      createLink: "Create Link",
      runScenario: "Run Scenario",
      inspector: "Inspector",
      scenario: "Scenario",
      mapSettings: "Map settings",
      expandPanel: "Expand panel",
      collapsePanel: "Collapse panel",
      openInspector: "Open Inspector",
      openScenario: "Open Scenario",
    },
    canvas: {
      placeConceptBadge: "Place Concept",
      placeConceptTitle: "Click anywhere on the canvas to place the next Concept.",
      placeConceptDescription: "The Inspector will open with the position already filled in.",
      createLinkBadge: "Create Link",
      createLinkSourceTitle: "Select the source Concept for the new Link.",
      createLinkSourceDescription: "The first click chooses where the influence starts.",
      createLinkTargetTitle: (conceptTitle) => `Select the target Concept for \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "The second click opens the Link form with source and target already filled in.",
      emptyOverlay:
        "The first Concept starts the map. Click New Concept, then place it directly on the canvas.",
      loadingSnapshot: "Loading graph snapshot...",
      conceptSummaryFallback: "Open Inspector to define the meaning of this Concept.",
      updatingPosition: "Updating canvas position...",
    },
    guided: buildGuidedMessages("en"),
    inspector: {
      placeConceptTitle: "Click on the canvas to place the Concept",
      placeConceptDescription:
        "The next click sets the position, then the Inspector opens a short Concept form.",
      connectLinkSourceTitle: "Select the source Concept",
      connectLinkSourceDescription: "The first click chooses where the influence starts.",
      connectLinkTargetTitle: (conceptTitle) => `Choose a target for \"${conceptTitle}\"`,
      connectLinkTargetDescription:
        "Click a different Concept on the canvas. The Link form will open already filled in.",
      cancel: "Cancel",
      newConcept: "New Concept",
      createLink: "Create Link",
      mapSettings: "Map settings",
      positionLabel: "Position",
      titleLabel: "Title",
      conceptTypeLabel: "Concept type",
      summaryLabel: "Summary",
      descriptionLabel: "Description",
      createConceptCta: "Create Concept",
      createConceptTitlePlaceholder: "Fear of being misunderstood",
      createConceptSummaryPlaceholder: "What should be visible on the canvas.",
      createConceptDescriptionPlaceholder:
        "Why this Concept matters in the person's structure.",
      conceptSave: "Save Concept",
      conceptArchive: "Archive",
      connectedLinksTitle: "Connected Links",
      connectedLinksEmpty:
        "This Concept is not linked yet. Add a Link so the structure becomes explainable.",
      incoming: "Incoming",
      outgoing: "Outgoing",
      atLeastTwoConceptsTitle: "At least two Concepts are required",
      atLeastTwoConceptsDescription:
        "Create a second Concept before adding a Link. A Link only makes sense when one Concept can influence another.",
      sourceConceptLabel: "Source Concept",
      targetConceptLabel: "Target Concept",
      relationTypeLabel: "Relation type",
      strengthLabel: "Strength",
      linkDescriptionPlaceholder: "Why does this influence exist?",
      createLinkCta: "Create Link",
      linkTitle: "Link",
      linkDelete: "Delete",
      currentDirection: "Current direction",
      unknownConcept: "Unknown Concept",
      saveLink: "Save Link",
      saveMap: "Save map",
      archiveMap: "Archive map",
      subjectLabel: "Subject label",
      openLink: "Open Link",
      strengthValue: (value) => `strength ${value}`,
    },
    scenario: {
      runTitle: "Run scenario",
      runDescription:
        "Test one situation against the map and inspect the ordered explanation path.",
      situationLabel: "Situation",
      situationPlaceholder:
        "A colleague questions the person's competence in a public meeting.",
      runCta: "Run scenario",
      latestRun: "Latest run",
      noSummaryYet: "No summary yet.",
      openRecentRuns: "Open recent runs",
      saveTab: "Save scenario",
      savedTab: "Saved scenarios",
      runsTab: "Recent runs",
      saveTitle: "Save current scenario",
      saveCta: "Save scenario",
      saveTitlePlaceholder: "Public disagreement",
      saveSituationPlaceholder:
        "Describe the situation you want to test against the map.",
      noScenariosTitle: "No scenarios yet",
      noScenariosDescription:
        "Save a scenario once you find a situation worth re-running against the map.",
      savedSeeds: (count) => `${count} seed${count === 1 ? "" : "s"}`,
      runSavedScenario: "Run saved scenario",
      noRunsTitle: "No scenario runs yet",
      noRunsDescription:
        "Run a situation to see which Concepts activate, which Links carry the logic, and what sequence becomes plausible.",
      latestRunFallbackTitle: "Latest run",
      viaLink: "Via Link",
      step: (stepOrder) => `Step ${stepOrder}`,
      score: (score) => `score ${score}`,
      seedConceptsLabel: "Seed Concepts",
      seedConceptsEmpty: "Add Concepts to the canvas before selecting scenario seeds.",
      mobileInspectorDescription: "Inspect Concepts, Links, and the current next step.",
      mobileScenarioDescription: "Run Scenarios, save them, and inspect recent runs.",
    },
    labels: {
      conceptTypes: {
        thought: "thought",
        state: "state",
        belief: "belief",
        experience: "experience",
        fact: "fact",
        trigger: "trigger",
        custom: "custom",
      },
      relationTypes: {
        causes: "causes",
        strengthens: "strengthens",
        weakens: "weakens",
        explains: "explains",
        contradicts: "contradicts",
      },
      workspaceRoles: {
        owner: "owner",
        admin: "admin",
        member: "member",
      },
      scenarioStatuses: {
        pending: "pending",
        completed: "completed",
        failed: "failed",
      },
      effectTypes: {
        seed: "seed",
        causes: "causes",
        strengthens: "strengthens",
        weakens: "weakens",
        explains: "explains",
        contradicts: "contradicts",
      },
    },
  },
  uk: {
    mapReadyBadge: "Карта готова",
    stepLabel: (stepNumber, totalSteps) => `Крок ${stepNumber} з ${totalSteps}`,
    topBar: {
      newConcept: "Новий Концепт",
      createLink: "Створити Зв’язок",
      runScenario: "Запустити Сценарій",
      inspector: "Інспектор",
      scenario: "Сценарій",
      mapSettings: "Налаштування карти",
      expandPanel: "Розгорнути панель",
      collapsePanel: "Згорнути панель",
      openInspector: "Відкрити Інспектор",
      openScenario: "Відкрити Сценарій",
    },
    canvas: {
      placeConceptBadge: "Поставити Концепт",
      placeConceptTitle: "Клікніть будь-де на canvas, щоб поставити наступний Концепт.",
      placeConceptDescription: "Інспектор відкриється з уже заповненою позицією.",
      createLinkBadge: "Створити Зв’язок",
      createLinkSourceTitle: "Оберіть вихідний Концепт для нового Зв’язку.",
      createLinkSourceDescription: "Перший клік визначає, звідки починається вплив.",
      createLinkTargetTitle: (conceptTitle) => `Оберіть цільовий Концепт для \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "Другий клік відкриє форму Зв’язку з уже заповненими source і target.",
      emptyOverlay:
        "Перший Концепт починає карту. Натисніть Новий Концепт, а потім поставте його прямо на canvas.",
      loadingSnapshot: "Завантажуємо snapshot графа...",
      conceptSummaryFallback: "Відкрийте Інспектор, щоб уточнити сенс цього Концепту.",
      updatingPosition: "Оновлюємо позицію на canvas...",
    },
    guided: buildGuidedMessages("uk"),
    inspector: {
      placeConceptTitle: "Клікніть на canvas, щоб поставити Концепт",
      placeConceptDescription:
        "Наступний клік задає позицію, після чого Інспектор відкриє коротку форму Концепту.",
      connectLinkSourceTitle: "Оберіть вихідний Концепт",
      connectLinkSourceDescription: "Перший клік визначає, звідки починається вплив.",
      connectLinkTargetTitle: (conceptTitle) => `Оберіть ціль для \"${conceptTitle}\"`,
      connectLinkTargetDescription:
        "Клікніть на інший Концепт на canvas. Форма Зв’язку відкриється вже заповненою.",
      cancel: "Скасувати",
      newConcept: "Новий Концепт",
      createLink: "Створити Зв’язок",
      mapSettings: "Налаштування карти",
      positionLabel: "Позиція",
      titleLabel: "Назва",
      conceptTypeLabel: "Тип Концепту",
      summaryLabel: "Коротко",
      descriptionLabel: "Опис",
      createConceptCta: "Створити Концепт",
      createConceptTitlePlaceholder: "Страх бути неправильно зрозумілим",
      createConceptSummaryPlaceholder: "Що саме має бути видно на canvas.",
      createConceptDescriptionPlaceholder:
        "Чому цей Концепт важливий у структурі цієї людини.",
      conceptSave: "Зберегти Концепт",
      conceptArchive: "Архівувати",
      connectedLinksTitle: "Пов’язані Зв’язки",
      connectedLinksEmpty:
        "Цей Концепт ще не пов’язаний. Додайте Зв’язок, щоб структура стала пояснюваною.",
      incoming: "Вхідні",
      outgoing: "Вихідні",
      atLeastTwoConceptsTitle: "Потрібно щонайменше два Концепти",
      atLeastTwoConceptsDescription:
        "Створіть другий Концепт перед додаванням Зв’язку. Зв’язок має сенс лише тоді, коли один Концепт може впливати на інший.",
      sourceConceptLabel: "Вихідний Концепт",
      targetConceptLabel: "Цільовий Концепт",
      relationTypeLabel: "Тип Зв’язку",
      strengthLabel: "Сила",
      linkDescriptionPlaceholder: "Чому існує цей вплив?",
      createLinkCta: "Створити Зв’язок",
      linkTitle: "Зв’язок",
      linkDelete: "Видалити",
      currentDirection: "Поточний напрям",
      unknownConcept: "Невідомий Концепт",
      saveLink: "Зберегти Зв’язок",
      saveMap: "Зберегти карту",
      archiveMap: "Архівувати карту",
      subjectLabel: "Мітка суб’єкта",
      openLink: "Відкрити Зв’язок",
      strengthValue: (value) => `сила ${value}`,
    },
    scenario: {
      runTitle: "Запустити Сценарій",
      runDescription:
        "Перевірте одну ситуацію на карті та перегляньте впорядкований шлях пояснення.",
      situationLabel: "Ситуація",
      situationPlaceholder:
        "Колега публічно ставить під сумнів компетентність цієї людини.",
      runCta: "Запустити Сценарій",
      latestRun: "Останній запуск",
      noSummaryYet: "Підсумку ще немає.",
      openRecentRuns: "Відкрити останні запуски",
      saveTab: "Зберегти Сценарій",
      savedTab: "Збережені Сценарії",
      runsTab: "Останні запуски",
      saveTitle: "Зберегти поточний Сценарій",
      saveCta: "Зберегти Сценарій",
      saveTitlePlaceholder: "Публічна незгода",
      saveSituationPlaceholder:
        "Опишіть ситуацію, яку хочете перевірити на карті.",
      noScenariosTitle: "Сценаріїв ще немає",
      noScenariosDescription:
        "Збережіть Сценарій, щойно знайдете ситуацію, до якої захочете повертатися.",
      savedSeeds: (count) => `${count} seed${count === 1 ? "" : "s"}`,
      runSavedScenario: "Запустити збережений Сценарій",
      noRunsTitle: "Запусків Сценаріїв ще немає",
      noRunsDescription:
        "Запустіть ситуацію, щоб побачити, які Концепти активуються, які Зв’язки несуть логіку і яка послідовність стає правдоподібною.",
      latestRunFallbackTitle: "Останній запуск",
      viaLink: "Через Зв’язок",
      step: (stepOrder) => `Крок ${stepOrder}`,
      score: (score) => `оцінка ${score}`,
      seedConceptsLabel: "Початкові Концепти",
      seedConceptsEmpty:
        "Додайте Концепти на canvas перед вибором початкових Концептів для Сценарію.",
      mobileInspectorDescription: "Переглядайте Концепти, Зв’язки та поточний наступний крок.",
      mobileScenarioDescription: "Запускайте Сценарії, зберігайте їх і переглядайте останні запуски.",
    },
    labels: {
      conceptTypes: {
        thought: "думка",
        state: "стан",
        belief: "переконання",
        experience: "досвід",
        fact: "факт",
        trigger: "тригер",
        custom: "власне",
      },
      relationTypes: {
        causes: "викликає",
        strengthens: "посилює",
        weakens: "послаблює",
        explains: "пояснює",
        contradicts: "суперечить",
      },
      workspaceRoles: {
        owner: "власник",
        admin: "адмін",
        member: "учасник",
      },
      scenarioStatuses: {
        pending: "очікує",
        completed: "завершено",
        failed: "помилка",
      },
      effectTypes: {
        seed: "початок",
        causes: "викликає",
        strengthens: "посилює",
        weakens: "послаблює",
        explains: "пояснює",
        contradicts: "суперечить",
      },
    },
  },
  ru: {
    mapReadyBadge: "Карта готова",
    stepLabel: (stepNumber, totalSteps) => `Шаг ${stepNumber} из ${totalSteps}`,
    topBar: {
      newConcept: "Новый Концепт",
      createLink: "Создать Связь",
      runScenario: "Запустить Сценарий",
      inspector: "Инспектор",
      scenario: "Сценарий",
      mapSettings: "Настройки карты",
      expandPanel: "Развернуть панель",
      collapsePanel: "Свернуть панель",
      openInspector: "Открыть Инспектор",
      openScenario: "Открыть Сценарий",
    },
    canvas: {
      placeConceptBadge: "Поставить Концепт",
      placeConceptTitle: "Кликните в любом месте canvas, чтобы поставить следующий Концепт.",
      placeConceptDescription: "Инспектор откроется с уже заполненной позицией.",
      createLinkBadge: "Создать Связь",
      createLinkSourceTitle: "Выберите исходный Концепт для новой Связи.",
      createLinkSourceDescription: "Первый клик определяет, откуда начинается влияние.",
      createLinkTargetTitle: (conceptTitle) => `Выберите целевой Концепт для \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "Второй клик откроет форму Связи с уже заполненными source и target.",
      emptyOverlay:
        "Первый Концепт начинает карту. Нажмите Новый Концепт, а затем поставьте его прямо на canvas.",
      loadingSnapshot: "Загружаем snapshot графа...",
      conceptSummaryFallback: "Откройте Инспектор, чтобы уточнить смысл этого Концепта.",
      updatingPosition: "Обновляем позицию на canvas...",
    },
    guided: buildGuidedMessages("ru"),
    inspector: {
      placeConceptTitle: "Кликните по canvas, чтобы поставить Концепт",
      placeConceptDescription:
        "Следующий клик задаёт позицию, после чего Инспектор откроет короткую форму Концепта.",
      connectLinkSourceTitle: "Выберите исходный Концепт",
      connectLinkSourceDescription: "Первый клик определяет, откуда начинается влияние.",
      connectLinkTargetTitle: (conceptTitle) => `Выберите цель для \"${conceptTitle}\"`,
      connectLinkTargetDescription:
        "Кликните по другому Концепту на canvas. Форма Связи откроется уже заполненной.",
      cancel: "Отменить",
      newConcept: "Новый Концепт",
      createLink: "Создать Связь",
      mapSettings: "Настройки карты",
      positionLabel: "Позиция",
      titleLabel: "Название",
      conceptTypeLabel: "Тип Концепта",
      summaryLabel: "Кратко",
      descriptionLabel: "Описание",
      createConceptCta: "Создать Концепт",
      createConceptTitlePlaceholder: "Страх быть неправильно понятым",
      createConceptSummaryPlaceholder: "Что именно должно быть видно на canvas.",
      createConceptDescriptionPlaceholder:
        "Почему этот Концепт важен в структуре этого человека.",
      conceptSave: "Сохранить Концепт",
      conceptArchive: "Архивировать",
      connectedLinksTitle: "Связанные Связи",
      connectedLinksEmpty:
        "Этот Концепт пока не связан. Добавьте Связь, чтобы структура стала объяснимой.",
      incoming: "Входящие",
      outgoing: "Исходящие",
      atLeastTwoConceptsTitle: "Нужно минимум два Концепта",
      atLeastTwoConceptsDescription:
        "Создайте второй Концепт перед добавлением Связи. Связь имеет смысл только тогда, когда один Концепт может влиять на другой.",
      sourceConceptLabel: "Исходный Концепт",
      targetConceptLabel: "Целевой Концепт",
      relationTypeLabel: "Тип Связи",
      strengthLabel: "Сила",
      linkDescriptionPlaceholder: "Почему существует это влияние?",
      createLinkCta: "Создать Связь",
      linkTitle: "Связь",
      linkDelete: "Удалить",
      currentDirection: "Текущее направление",
      unknownConcept: "Неизвестный Концепт",
      saveLink: "Сохранить Связь",
      saveMap: "Сохранить карту",
      archiveMap: "Архивировать карту",
      subjectLabel: "Метка субъекта",
      openLink: "Открыть Связь",
      strengthValue: (value) => `сила ${value}`,
    },
    scenario: {
      runTitle: "Запустить Сценарий",
      runDescription:
        "Проверьте одну ситуацию на карте и изучите упорядоченный путь объяснения.",
      situationLabel: "Ситуация",
      situationPlaceholder:
        "Коллега публично ставит под сомнение компетентность этого человека.",
      runCta: "Запустить Сценарий",
      latestRun: "Последний запуск",
      noSummaryYet: "Пока нет краткого вывода.",
      openRecentRuns: "Открыть последние запуски",
      saveTab: "Сохранить Сценарий",
      savedTab: "Сохранённые Сценарии",
      runsTab: "Последние запуски",
      saveTitle: "Сохранить текущий Сценарий",
      saveCta: "Сохранить Сценарий",
      saveTitlePlaceholder: "Публичное несогласие",
      saveSituationPlaceholder:
        "Опишите ситуацию, которую хотите проверить на карте.",
      noScenariosTitle: "Сценариев пока нет",
      noScenariosDescription:
        "Сохраните Сценарий, как только найдёте ситуацию, к которой захотите возвращаться.",
      savedSeeds: (count) => `${count} seed${count === 1 ? "" : "s"}`,
      runSavedScenario: "Запустить сохранённый Сценарий",
      noRunsTitle: "Запусков Сценариев пока нет",
      noRunsDescription:
        "Запустите ситуацию, чтобы увидеть, какие Концепты активируются, какие Связи несут логику и какая последовательность становится правдоподобной.",
      latestRunFallbackTitle: "Последний запуск",
      viaLink: "Через Связь",
      step: (stepOrder) => `Шаг ${stepOrder}`,
      score: (score) => `оценка ${score}`,
      seedConceptsLabel: "Начальные Концепты",
      seedConceptsEmpty:
        "Добавьте Концепты на canvas перед выбором начальных Концептов для Сценария.",
      mobileInspectorDescription: "Проверяйте Концепты, Связи и текущий следующий шаг.",
      mobileScenarioDescription: "Запускайте Сценарии, сохраняйте их и просматривайте последние запуски.",
    },
    labels: {
      conceptTypes: {
        thought: "мысль",
        state: "состояние",
        belief: "убеждение",
        experience: "переживание",
        fact: "факт",
        trigger: "триггер",
        custom: "своё",
      },
      relationTypes: {
        causes: "вызывает",
        strengthens: "усиливает",
        weakens: "ослабляет",
        explains: "объясняет",
        contradicts: "противоречит",
      },
      workspaceRoles: {
        owner: "владелец",
        admin: "админ",
        member: "участник",
      },
      scenarioStatuses: {
        pending: "ожидает",
        completed: "завершён",
        failed: "ошибка",
      },
      effectTypes: {
        seed: "старт",
        causes: "вызывает",
        strengthens: "усиливает",
        weakens: "ослабляет",
        explains: "объясняет",
        contradicts: "противоречит",
      },
    },
  },
};

export function getMapWorkspaceMessages(locale: SupportedLocale) {
  return mapWorkspaceMessages[locale];
}
