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
    backToMaps: string;
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
    archiveConceptConfirmTitle: string;
    archiveConceptConfirmDescription: string;
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
    deleteLinkConfirmTitle: string;
    deleteLinkConfirmDescription: string;
    currentDirection: string;
    unknownConcept: string;
    saveLink: string;
    saveMap: string;
    archiveMap: string;
    archiveMapConfirmTitle: string;
    archiveMapConfirmDescription: string;
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
    reviewRunCta: string;
    hideReviewCta: string;
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
    runFeedbackTitle: string;
    runFeedbackVerdictLabel: string;
    runFeedbackScoreLabel: string;
    runFeedbackCommentLabel: string;
    runFeedbackCommentPlaceholder: string;
    runFeedbackVerdictUseful: string;
    runFeedbackVerdictPartlyUseful: string;
    runFeedbackVerdictWrong: string;
    stepFeedbackVerdictLabel: string;
    stepFeedbackCorrectedScoreLabel: string;
    stepFeedbackCorrectedExplanationLabel: string;
    stepFeedbackCorrectedExplanationPlaceholder: string;
    stepFeedbackVerdictCorrect: string;
    stepFeedbackVerdictOverstated: string;
    stepFeedbackVerdictWrongLink: string;
    stepFeedbackVerdictMissingContext: string;
    stepFeedbackVerdictWrongEffect: string;
    saveFeedbackCta: string;
    saveStepFeedbackCta: string;
    mobileInspectorDescription: string;
    mobileScenarioDescription: string;
  };
  learning: {
    tabLabel: string;
    mobileDescription: string;
    heading: string;
    emptyTitle: string;
    emptyDescription: string;
    pending: string;
    payload: string;
    resolutionLabel: string;
    reasonLabel: string;
    resolveCta: string;
    openCount: (count: number) => string;
    resolvedCount: (count: number) => string;
    confidence: (value: number) => string;
    suggestionType: (value: string) => string;
    targetEntity: (value: string) => string;
    sourceType: (value: string) => string;
    resolutionType: (value: string) => string;
    reviewChangesHeading: string;
    reviewNoChanges: string;
    reviewEvidenceHeading: string;
    evidenceRationaleLabel: string;
    evidenceSourceLabel: string;
    reviewNoEvidence: string;
    reasonPlaceholder: string;
    acceptCta: string;
    editCta: string;
    rejectCta: string;
    contextLimitedCta: string;
    fieldLabels: Record<string, string>;
    genericFieldLabel: string;
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

function humanizeSuggestionValue(value: string) {
  return value.replaceAll("_", " ");
}

function buildLearningMessages(
  locale: SupportedLocale
): MapWorkspaceMessages["learning"] {
  const formatSuggestionValue = (value: string) => humanizeSuggestionValue(value);

  if (locale === "uk") {
    return {
      tabLabel: "Навчання",
      mobileDescription:
        "Переглядайте Пропозиції та фіксуйте рішення в циклі навчання.",
      heading: "Навчання",
      emptyTitle: "Пропозицій поки немає",
      emptyDescription:
        "Коли з’являться нові Пропозиції, ви зможете переглянути та розв’язати їх тут.",
      pending: "Очікує",
      payload: "Запропонований payload",
      resolutionLabel: "Тип рішення",
      reasonLabel: "Причина",
      resolveCta: "Зафіксувати рішення",
      reviewChangesHeading: "Що зміниться",
      reviewNoChanges: "Запропоновані зміни не деталізовані.",
      reviewEvidenceHeading: "Підсумок підтверджень",
      evidenceRationaleLabel: "Чому запропоновано",
      evidenceSourceLabel: "Підтвердження з джерела",
      reviewNoEvidence: "Додаткових підтверджень не надано.",
      reasonPlaceholder: "За потреби додайте короткий коментар до рішення.",
      acceptCta: "Прийняти",
      editCta: "Редагувати",
      rejectCta: "Відхилити",
      contextLimitedCta: "Бракує контексту",
      fieldLabels: {
        title: "Назва",
        summary: "Коротко",
        description: "Опис",
        conceptType: "Тип Концепту",
        relationType: "Тип Зв’язку",
        strength: "Сила",
        sourceConceptId: "Вихідний Концепт",
        targetConceptId: "Цільовий Концепт",
        situation: "Ситуація",
        seedConceptIds: "Початкові Концепти",
        targetEntityId: "Цільова сутність",
      },
      genericFieldLabel: "Поле",
      openCount: (count) => `Відкриті: ${count}`,
      resolvedCount: (count) => `Вирішені: ${count}`,
      confidence: (value) => `Впевненість: ${Math.round(value * 100)}%`,
      suggestionType: formatSuggestionValue,
      targetEntity: (value) =>
        `Ціль: ${humanizeSuggestionValue(value)}`,
      sourceType: (value) =>
        `Джерело: ${humanizeSuggestionValue(value)}`,
      resolutionType: (value) => {
        if (value === "accepted") {
          return "прийнято";
        }

        if (value === "edited") {
          return "відредаговано";
        }

        if (value === "rejected") {
          return "відхилено";
        }

        if (value === "context_limited") {
          return "бракує контексту";
        }

        return humanizeSuggestionValue(value);
      },
    };
  }

  if (locale === "ru") {
    return {
      tabLabel: "Обучение",
      mobileDescription:
        "Просматривайте Предложения и фиксируйте решения в цикле обучения.",
      heading: "Обучение",
      emptyTitle: "Предложений пока нет",
      emptyDescription:
        "Когда появятся новые Предложения, вы сможете просмотреть и разобрать их здесь.",
      pending: "В ожидании",
      payload: "Предложенный payload",
      resolutionLabel: "Тип решения",
      reasonLabel: "Причина",
      resolveCta: "Зафиксировать решение",
      reviewChangesHeading: "Что изменится",
      reviewNoChanges: "Предложенные изменения не детализированы.",
      reviewEvidenceHeading: "Сводка подтверждений",
      evidenceRationaleLabel: "Почему это предложено",
      evidenceSourceLabel: "Подтверждение из источника",
      reviewNoEvidence: "Дополнительные подтверждения не приложены.",
      reasonPlaceholder: "При необходимости добавьте короткий комментарий к решению.",
      acceptCta: "Принять",
      editCta: "Редактировать",
      rejectCta: "Отклонить",
      contextLimitedCta: "Не хватает контекста",
      fieldLabels: {
        title: "Название",
        summary: "Кратко",
        description: "Описание",
        conceptType: "Тип Концепта",
        relationType: "Тип Связи",
        strength: "Сила",
        sourceConceptId: "Исходный Концепт",
        targetConceptId: "Целевой Концепт",
        situation: "Ситуация",
        seedConceptIds: "Начальные Концепты",
        targetEntityId: "Целевая сущность",
      },
      genericFieldLabel: "Поле",
      openCount: (count) => `Открытые: ${count}`,
      resolvedCount: (count) => `Решенные: ${count}`,
      confidence: (value) => `Уверенность: ${Math.round(value * 100)}%`,
      suggestionType: formatSuggestionValue,
      targetEntity: (value) =>
        `Цель: ${humanizeSuggestionValue(value)}`,
      sourceType: (value) =>
        `Источник: ${humanizeSuggestionValue(value)}`,
      resolutionType: (value) => {
        if (value === "accepted") {
          return "принято";
        }

        if (value === "edited") {
          return "отредактировано";
        }

        if (value === "rejected") {
          return "отклонено";
        }

        if (value === "context_limited") {
          return "не хватает контекста";
        }

        return humanizeSuggestionValue(value);
      },
    };
  }

  return {
    tabLabel: "Learning",
    mobileDescription: "Review Suggestions and resolve them in the learning loop.",
    heading: "Learning",
    emptyTitle: "No Suggestions yet",
    emptyDescription:
      "When new Suggestions arrive, you can review and resolve them here.",
    pending: "Pending",
    payload: "Proposed payload",
    resolutionLabel: "Resolution type",
    reasonLabel: "Reason",
    resolveCta: "Resolve Suggestion",
    reviewChangesHeading: "What will change",
    reviewNoChanges: "The proposed change payload has no detailed fields.",
    reviewEvidenceHeading: "Evidence summary",
    evidenceRationaleLabel: "Why this was suggested",
    evidenceSourceLabel: "Source evidence",
    reviewNoEvidence: "No additional evidence was attached.",
    reasonPlaceholder: "Add a short note for this decision (optional).",
    acceptCta: "Accept",
    editCta: "Edit",
    rejectCta: "Reject",
    contextLimitedCta: "Needs context",
    fieldLabels: {
      title: "Title",
      summary: "Summary",
      description: "Description",
      conceptType: "Concept type",
      relationType: "Relation type",
      strength: "Strength",
      sourceConceptId: "Source Concept",
      targetConceptId: "Target Concept",
      situation: "Situation",
      seedConceptIds: "Seed Concepts",
      targetEntityId: "Target entity",
    },
    genericFieldLabel: "Field",
    openCount: (count) => `Open: ${count}`,
    resolvedCount: (count) => `Resolved: ${count}`,
    confidence: (value) => `Confidence: ${Math.round(value * 100)}%`,
    suggestionType: formatSuggestionValue,
    targetEntity: (value) => `Target: ${humanizeSuggestionValue(value)}`,
    sourceType: (value) => `Source: ${humanizeSuggestionValue(value)}`,
    resolutionType: (value) => {
      if (value === "context_limited") {
        return "needs context";
      }

      return humanizeSuggestionValue(value);
    },
  };
}

export const mapWorkspaceMessages: Record<
  SupportedLocale,
  MapWorkspaceMessages
> = {
  en: {
    mapReadyBadge: "Map ready",
    stepLabel: (stepNumber, totalSteps) =>
      `Step ${stepNumber} of ${totalSteps}`,
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
      backToMaps: "Back to Maps",
    },
    canvas: {
      placeConceptBadge: "Place Concept",
      placeConceptTitle:
        "Click anywhere on the canvas to place the next Concept.",
      placeConceptDescription:
        "The Inspector will open with the position already filled in.",
      createLinkBadge: "Create Link",
      createLinkSourceTitle: "Select the source Concept for the new Link.",
      createLinkSourceDescription:
        "The first click chooses where the influence starts.",
      createLinkTargetTitle: (conceptTitle) =>
        `Select the target Concept for \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "The second click opens the Link form with source and target already filled in.",
      emptyOverlay:
        "The first Concept starts the map. Click New Concept, then place it directly on the canvas.",
      loadingSnapshot: "Loading graph snapshot...",
      conceptSummaryFallback:
        "Open Inspector to define the meaning of this Concept.",
      updatingPosition: "Updating canvas position...",
    },
    guided: buildGuidedMessages("en"),
    inspector: {
      placeConceptTitle: "Click on the canvas to place the Concept",
      placeConceptDescription:
        "The next click sets the position, then the Inspector opens a short Concept form.",
      connectLinkSourceTitle: "Select the source Concept",
      connectLinkSourceDescription:
        "The first click chooses where the influence starts.",
      connectLinkTargetTitle: (conceptTitle) =>
        `Choose a target for \"${conceptTitle}\"`,
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
      archiveConceptConfirmTitle: "Archive this Concept?",
      archiveConceptConfirmDescription:
        "This will remove the Concept from active map analysis and can change Link and Scenario explainability.",
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
      deleteLinkConfirmTitle: "Delete this Link?",
      deleteLinkConfirmDescription:
        "Deleting this Link removes an explicit explanation path from the map.",
      currentDirection: "Current direction",
      unknownConcept: "Unknown Concept",
      saveLink: "Save Link",
      saveMap: "Save map",
      archiveMap: "Archive map",
      archiveMapConfirmTitle: "Archive this map?",
      archiveMapConfirmDescription:
        "This map will be moved out of active workspace lists.",
      subjectLabel: "Subject label",
      openLink: "Open Link",
      strengthValue: (value) => `strength ${value}`,
    },
    scenario: {
      runTitle: "Run Scenario now",
      runDescription:
        "Test one situation against the map and inspect the ordered explanation path.",
      situationLabel: "Situation",
      situationPlaceholder:
        "A colleague questions the person's competence in a public meeting.",
      runCta: "Run now",
      reviewRunCta: "Review run",
      hideReviewCta: "Hide review",
      latestRun: "Latest run",
      noSummaryYet: "No summary yet.",
      openRecentRuns: "Review runs",
      saveTab: "Save scenario",
      savedTab: "Saved scenarios",
      runsTab: "Review runs",
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
      seedConceptsEmpty:
        "Add Concepts to the canvas before selecting scenario seeds.",
      runFeedbackTitle: "Run feedback",
      runFeedbackVerdictLabel: "Run verdict",
      runFeedbackScoreLabel: "Overall score (1-5)",
      runFeedbackCommentLabel: "Comment",
      runFeedbackCommentPlaceholder:
        "What was useful or misleading in this run?",
      runFeedbackVerdictUseful: "Useful",
      runFeedbackVerdictPartlyUseful: "Partly useful",
      runFeedbackVerdictWrong: "Wrong",
      stepFeedbackVerdictLabel: "Step verdict",
      stepFeedbackCorrectedScoreLabel: "Corrected score",
      stepFeedbackCorrectedExplanationLabel: "Corrected explanation",
      stepFeedbackCorrectedExplanationPlaceholder:
        "If needed, explain how this step should be interpreted.",
      stepFeedbackVerdictCorrect: "Correct",
      stepFeedbackVerdictOverstated: "Overstated",
      stepFeedbackVerdictWrongLink: "Wrong link",
      stepFeedbackVerdictMissingContext: "Missing context",
      stepFeedbackVerdictWrongEffect: "Wrong effect",
      saveFeedbackCta: "Save run feedback",
      saveStepFeedbackCta: "Save step feedback",
      mobileInspectorDescription:
        "Inspect Concepts, Links, and the current next step.",
      mobileScenarioDescription:
        "Run Scenarios, save them, and inspect recent runs.",
    },
    learning: buildLearningMessages("en"),
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
      backToMaps: "До списку карт",
    },
    canvas: {
      placeConceptBadge: "Поставити Концепт",
      placeConceptTitle:
        "Клікніть будь-де на canvas, щоб поставити наступний Концепт.",
      placeConceptDescription:
        "Інспектор відкриється з уже заповненою позицією.",
      createLinkBadge: "Створити Зв’язок",
      createLinkSourceTitle: "Оберіть вихідний Концепт для нового Зв’язку.",
      createLinkSourceDescription:
        "Перший клік визначає, звідки починається вплив.",
      createLinkTargetTitle: (conceptTitle) =>
        `Оберіть цільовий Концепт для \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "Другий клік відкриє форму Зв’язку з уже заповненими source і target.",
      emptyOverlay:
        "Перший Концепт починає карту. Натисніть Новий Концепт, а потім поставте його прямо на canvas.",
      loadingSnapshot: "Завантажуємо snapshot графа...",
      conceptSummaryFallback:
        "Відкрийте Інспектор, щоб уточнити сенс цього Концепту.",
      updatingPosition: "Оновлюємо позицію на canvas...",
    },
    guided: buildGuidedMessages("uk"),
    inspector: {
      placeConceptTitle: "Клікніть на canvas, щоб поставити Концепт",
      placeConceptDescription:
        "Наступний клік задає позицію, після чого Інспектор відкриє коротку форму Концепту.",
      connectLinkSourceTitle: "Оберіть вихідний Концепт",
      connectLinkSourceDescription:
        "Перший клік визначає, звідки починається вплив.",
      connectLinkTargetTitle: (conceptTitle) =>
        `Оберіть ціль для \"${conceptTitle}\"`,
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
      archiveConceptConfirmTitle: "Архівувати цей Концепт?",
      archiveConceptConfirmDescription:
        "Це прибере Концепт з активного аналізу карти та може змінити пояснюваність Зв’язків і Сценаріїв.",
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
      deleteLinkConfirmTitle: "Видалити цей Зв’язок?",
      deleteLinkConfirmDescription:
        "Видалення цього Зв’язку прибирає явний шлях пояснення з карти.",
      currentDirection: "Поточний напрям",
      unknownConcept: "Невідомий Концепт",
      saveLink: "Зберегти Зв’язок",
      saveMap: "Зберегти карту",
      archiveMap: "Архівувати карту",
      archiveMapConfirmTitle: "Архівувати цю карту?",
      archiveMapConfirmDescription:
        "Цю карту буде прибрано з активних списків workspace.",
      subjectLabel: "Мітка суб’єкта",
      openLink: "Відкрити Зв’язок",
      strengthValue: (value) => `сила ${value}`,
    },
    scenario: {
      runTitle: "Запустити Сценарій зараз",
      runDescription:
        "Перевірте одну ситуацію на карті та перегляньте впорядкований шлях пояснення.",
      situationLabel: "Ситуація",
      situationPlaceholder:
        "Колега публічно ставить під сумнів компетентність цієї людини.",
      runCta: "Запустити зараз",
      reviewRunCta: "Переглянути запуск",
      hideReviewCta: "Сховати перегляд",
      latestRun: "Останній запуск",
      noSummaryYet: "Підсумку ще немає.",
      openRecentRuns: "Переглянути запуски",
      saveTab: "Зберегти Сценарій",
      savedTab: "Збережені Сценарії",
      runsTab: "Перегляд запусків",
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
      runFeedbackTitle: "Зворотний зв'язок по запуску",
      runFeedbackVerdictLabel: "Вердикт запуску",
      runFeedbackScoreLabel: "Загальна оцінка (1-5)",
      runFeedbackCommentLabel: "Коментар",
      runFeedbackCommentPlaceholder:
        "Що в цьому запуску було корисним або хибним?",
      runFeedbackVerdictUseful: "Корисно",
      runFeedbackVerdictPartlyUseful: "Частково корисно",
      runFeedbackVerdictWrong: "Хибно",
      stepFeedbackVerdictLabel: "Вердикт кроку",
      stepFeedbackCorrectedScoreLabel: "Скоригована оцінка",
      stepFeedbackCorrectedExplanationLabel: "Скориговане пояснення",
      stepFeedbackCorrectedExplanationPlaceholder:
        "За потреби опишіть, як цей крок слід інтерпретувати.",
      stepFeedbackVerdictCorrect: "Коректно",
      stepFeedbackVerdictOverstated: "Перебільшено",
      stepFeedbackVerdictWrongLink: "Хибний Зв’язок",
      stepFeedbackVerdictMissingContext: "Бракує контексту",
      stepFeedbackVerdictWrongEffect: "Хибний ефект",
      saveFeedbackCta: "Зберегти feedback запуску",
      saveStepFeedbackCta: "Зберегти feedback кроку",
      mobileInspectorDescription:
        "Переглядайте Концепти, Зв’язки та поточний наступний крок.",
      mobileScenarioDescription:
        "Запускайте Сценарії, зберігайте їх і переглядайте останні запуски.",
    },
    learning: buildLearningMessages("uk"),
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
      backToMaps: "К списку карт",
    },
    canvas: {
      placeConceptBadge: "Поставить Концепт",
      placeConceptTitle:
        "Кликните в любом месте canvas, чтобы поставить следующий Концепт.",
      placeConceptDescription:
        "Инспектор откроется с уже заполненной позицией.",
      createLinkBadge: "Создать Связь",
      createLinkSourceTitle: "Выберите исходный Концепт для новой Связи.",
      createLinkSourceDescription:
        "Первый клик определяет, откуда начинается влияние.",
      createLinkTargetTitle: (conceptTitle) =>
        `Выберите целевой Концепт для \"${conceptTitle}\".`,
      createLinkTargetDescription:
        "Второй клик откроет форму Связи с уже заполненными source и target.",
      emptyOverlay:
        "Первый Концепт начинает карту. Нажмите Новый Концепт, а затем поставьте его прямо на canvas.",
      loadingSnapshot: "Загружаем snapshot графа...",
      conceptSummaryFallback:
        "Откройте Инспектор, чтобы уточнить смысл этого Концепта.",
      updatingPosition: "Обновляем позицию на canvas...",
    },
    guided: buildGuidedMessages("ru"),
    inspector: {
      placeConceptTitle: "Кликните по canvas, чтобы поставить Концепт",
      placeConceptDescription:
        "Следующий клик задаёт позицию, после чего Инспектор откроет короткую форму Концепта.",
      connectLinkSourceTitle: "Выберите исходный Концепт",
      connectLinkSourceDescription:
        "Первый клик определяет, откуда начинается влияние.",
      connectLinkTargetTitle: (conceptTitle) =>
        `Выберите цель для \"${conceptTitle}\"`,
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
      createConceptSummaryPlaceholder:
        "Что именно должно быть видно на canvas.",
      createConceptDescriptionPlaceholder:
        "Почему этот Концепт важен в структуре этого человека.",
      conceptSave: "Сохранить Концепт",
      conceptArchive: "Архивировать",
      archiveConceptConfirmTitle: "Архивировать этот Концепт?",
      archiveConceptConfirmDescription:
        "Это уберёт Концепт из активного анализа карты и может изменить объяснимость Связей и Сценариев.",
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
      deleteLinkConfirmTitle: "Удалить эту Связь?",
      deleteLinkConfirmDescription:
        "Удаление этой Связи убирает явный путь объяснения из карты.",
      currentDirection: "Текущее направление",
      unknownConcept: "Неизвестный Концепт",
      saveLink: "Сохранить Связь",
      saveMap: "Сохранить карту",
      archiveMap: "Архивировать карту",
      archiveMapConfirmTitle: "Архивировать эту карту?",
      archiveMapConfirmDescription:
        "Эта карта будет убрана из активных списков workspace.",
      subjectLabel: "Метка субъекта",
      openLink: "Открыть Связь",
      strengthValue: (value) => `сила ${value}`,
    },
    scenario: {
      runTitle: "Запустить Сценарий сейчас",
      runDescription:
        "Проверьте одну ситуацию на карте и изучите упорядоченный путь объяснения.",
      situationLabel: "Ситуация",
      situationPlaceholder:
        "Коллега публично ставит под сомнение компетентность этого человека.",
      runCta: "Запустить сейчас",
      reviewRunCta: "Проверить запуск",
      hideReviewCta: "Скрыть обзор",
      latestRun: "Последний запуск",
      noSummaryYet: "Пока нет краткого вывода.",
      openRecentRuns: "Проверить запуски",
      saveTab: "Сохранить Сценарий",
      savedTab: "Сохранённые Сценарии",
      runsTab: "Проверка запусков",
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
      runFeedbackTitle: "Обратная связь по запуску",
      runFeedbackVerdictLabel: "Вердикт запуска",
      runFeedbackScoreLabel: "Общая оценка (1-5)",
      runFeedbackCommentLabel: "Комментарий",
      runFeedbackCommentPlaceholder:
        "Что в этом запуске было полезным или ошибочным?",
      runFeedbackVerdictUseful: "Полезно",
      runFeedbackVerdictPartlyUseful: "Частично полезно",
      runFeedbackVerdictWrong: "Неверно",
      stepFeedbackVerdictLabel: "Вердикт шага",
      stepFeedbackCorrectedScoreLabel: "Скорректированная оценка",
      stepFeedbackCorrectedExplanationLabel: "Скорректированное объяснение",
      stepFeedbackCorrectedExplanationPlaceholder:
        "При необходимости опишите, как этот шаг следует интерпретировать.",
      stepFeedbackVerdictCorrect: "Корректно",
      stepFeedbackVerdictOverstated: "Преувеличено",
      stepFeedbackVerdictWrongLink: "Неверная Связь",
      stepFeedbackVerdictMissingContext: "Не хватает контекста",
      stepFeedbackVerdictWrongEffect: "Неверный эффект",
      saveFeedbackCta: "Сохранить feedback запуска",
      saveStepFeedbackCta: "Сохранить feedback шага",
      mobileInspectorDescription:
        "Проверяйте Концепты, Связи и текущий следующий шаг.",
      mobileScenarioDescription:
        "Запускайте Сценарии, сохраняйте их и просматривайте последние запуски.",
    },
    learning: buildLearningMessages("ru"),
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
