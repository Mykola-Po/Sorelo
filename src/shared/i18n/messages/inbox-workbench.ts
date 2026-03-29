import type { InboxItemStatus, InboxRoute, InboxSourceType } from "@/shared/db/schema";
import type { SupportedLocale } from "@/shared/i18n/config";

export type InboxWorkbenchMessages = {
  pageTitle: string;
  pageDescription: (workspaceName: string) => string;
  composerTitle: string;
  composerDescription: string;
  composerMapLabel: string;
  composerSourceLabel: string;
  composerRawInputLabel: string;
  composerRawInputPlaceholder: string;
  composerCreate: string;
  composerNoMaps: string;
  queueTitle: string;
  queueDescription: string;
  queueEmptyTitle: string;
  queueEmptyDescription: string;
  queueFilteredEmptyTitle: string;
  queueFilteredEmptyDescription: string;
  queueSummary: (count: number) => string;
  queueOpenTriage: string;
  queueRelatedToLabel: string;
  queueStateLabel: string;
  queueNextLabel: string;
  queueUpdatedLabel: string;
  queueReceivedLabel: string;
  queueOwnerLabel: string;
  filtersTitle: string;
  filtersViewLabel: string;
  filtersStatusLabel: string;
  filtersRouteLabel: string;
  filtersMapLabel: string;
  filtersSortLabel: string;
  filtersPageSizeLabel: string;
  filtersAnyStatus: string;
  filtersAnyRoute: string;
  filtersAnyMap: string;
  filtersViewNeedsAttention: string;
  filtersViewAll: string;
  filtersSortUpdatedDesc: string;
  filtersSortUpdatedAsc: string;
  filtersSortCreatedDesc: string;
  filtersApply: string;
  filtersReset: string;
  filtersPrevious: string;
  filtersNext: string;
  filtersPageSummary: (page: number, totalPages: number) => string;
  selectionUnavailableTitle: string;
  selectionUnavailableDescription: string;
  selectionEmptyTitle: string;
  selectionEmptyDescription: string;
  selectionMobileDescription: string;
  selectionOutsideCurrentView: string;
  mobileBackToQueue: string;
  detailSummaryTitle: string;
  detailSummaryDescription: string;
  detailSignalTitle: string;
  detailSignalDescription: string;
  detailRoutingTitle: string;
  detailRoutingDescription: string;
  detailReviewTitle: string;
  detailReviewDescription: string;
  detailClarificationTitle: string;
  detailClarificationDescription: string;
  detailNextStepLabel: string;
  detailStateLabel: string;
  detailRouteLabel: string;
  detailMapLabel: string;
  detailSourceLabel: string;
  detailCreatedLabel: string;
  detailUpdatedLabel: string;
  detailRawInputLabel: string;
  detailNormalizedLabel: string;
  detailNoNormalizedText: string;
  detailRoutingSummaryLabel: string;
  detailRoutingFallback: string;
  detailReviewSummary: (artifactCount: number, resolvedCount: number) => string;
  detailNoReviewArtifacts: string;
  detailClarificationQuestionLabel: string;
  detailClarificationReasonLabel: string;
  detailClarificationAnswerLabel: string;
  detailClarificationPendingTitle: string;
  detailClarificationPendingDescription: string;
  detailNoClarificationHistory: string;
  detailActionProcess: string;
  detailActionRetry: string;
  detailActionAnswer: string;
  detailActionReviewLearning: string;
  detailActionOpenMap: string;
  detailActionOpenInspector: string;
  detailActionClosed: string;
  detailNoTargetMap: string;
  detailTechnicalEvidence: string;
  detailTechnicalReviewBridge: string;
  detailTechnicalRoute: string;
  detailTechnicalExecution: string;
  detailTechnicalTimeline: string;
  detailNoFragments: string;
  detailNoPackets: string;
  detailNoAttempts: string;
  detailNoEvents: string;
  technicalPacketSummary: string;
  technicalRouteReason: string;
  technicalFailure: string;
  technicalDuration: string;
  technicalStarted: string;
  technicalFinished: string;
  technicalRunner: string;
  technicalStep: string;
  technicalStatus: string;
  technicalLatency: string;
  technicalRuntime: string;
  technicalPolicyNotes: string;
  technicalTime: string;
  technicalAttempt: (attemptNo: number) => string;
  technicalFragment: (ordinal: number) => string;
  technicalReviewArtifact: (order: number) => string;
  statusLabels: Record<InboxItemStatus, string>;
  routeLabels: Record<InboxRoute, string>;
  sourceLabels: Record<InboxSourceType, string>;
};

const inboxWorkbenchMessagesByLocale: Record<
  SupportedLocale,
  InboxWorkbenchMessages
> = {
  en: {
    pageTitle: "Inbox",
    pageDescription: (workspaceName) =>
      `Operator queue for incoming signal in ${workspaceName}. Inbox triages what arrived, what it relates to, what happened, and the next step into Learning or the Map.`,
    composerTitle: "Add Signal",
    composerDescription:
      "Pick a target Map first, then paste a raw note or transcript snippet for triage.",
    composerMapLabel: "Target Map",
    composerSourceLabel: "Source type",
    composerRawInputLabel: "Raw input",
    composerRawInputPlaceholder:
      "Paste a raw note, transcript snippet, or observation.",
    composerCreate: "Create Inbox item",
    composerNoMaps: "Create a Map first",
    queueTitle: "Operator Queue",
    queueDescription:
      "Use filters to focus the queue, then open triage for the item that needs a next decision.",
    queueEmptyTitle: "No Inbox items yet",
    queueEmptyDescription:
      "Create the first Inbox item to start the intake flow for this workspace.",
    queueFilteredEmptyTitle: "No items match this view",
    queueFilteredEmptyDescription:
      "Change the queue filters or page size to see more Inbox items.",
    queueSummary: (count) => `${count} items in this view`,
    queueOpenTriage: "Open triage",
    queueRelatedToLabel: "Related to",
    queueStateLabel: "State",
    queueNextLabel: "Next step",
    queueUpdatedLabel: "Updated",
    queueReceivedLabel: "Received",
    queueOwnerLabel: "Owner",
    filtersTitle: "Queue Filters",
    filtersViewLabel: "View",
    filtersStatusLabel: "Status",
    filtersRouteLabel: "Route result",
    filtersMapLabel: "Map",
    filtersSortLabel: "Sort",
    filtersPageSizeLabel: "Page size",
    filtersAnyStatus: "Any status",
    filtersAnyRoute: "Any route",
    filtersAnyMap: "Any Map",
    filtersViewNeedsAttention: "Needs attention",
    filtersViewAll: "All items",
    filtersSortUpdatedDesc: "Newest activity first",
    filtersSortUpdatedAsc: "Oldest activity first",
    filtersSortCreatedDesc: "Newest created first",
    filtersApply: "Apply filters",
    filtersReset: "Reset",
    filtersPrevious: "Previous",
    filtersNext: "Next",
    filtersPageSummary: (page, totalPages) => `Page ${page} of ${totalPages}`,
    selectionUnavailableTitle: "Inbox item unavailable",
    selectionUnavailableDescription:
      "The selected Inbox item could not be loaded in this workspace.",
    selectionEmptyTitle: "Choose an item to triage",
    selectionEmptyDescription:
      "Pick an Inbox item from the queue to inspect its summary, status, and next step.",
    selectionMobileDescription:
      "Pick an Inbox item from the queue to open a focused mobile triage view.",
    selectionOutsideCurrentView:
      "This item is open, but it is outside the current queue view. Adjust filters or pagination if you want it visible in the list.",
    mobileBackToQueue: "Back to queue",
    detailSummaryTitle: "Triage Summary",
    detailSummaryDescription:
      "Start with the current state, why it was routed this way, and the next operator step.",
    detailSignalTitle: "Signal",
    detailSignalDescription:
      "Keep the raw note visible alongside the normalized text used for routing.",
    detailRoutingTitle: "Routing and Provenance",
    detailRoutingDescription:
      "This explains what the item relates to, what happened to it, and what the route means right now.",
    detailReviewTitle: "Review and Apply",
    detailReviewDescription:
      "When the item is review-bound, Learning remains the canonical place to review and apply changes.",
    detailClarificationTitle: "Clarification",
    detailClarificationDescription:
      "Clarification stays visible only when the next useful step is to answer a pending question.",
    detailNextStepLabel: "Next step",
    detailStateLabel: "State",
    detailRouteLabel: "Route result",
    detailMapLabel: "Map context",
    detailSourceLabel: "Source",
    detailCreatedLabel: "Created",
    detailUpdatedLabel: "Updated",
    detailRawInputLabel: "Raw input",
    detailNormalizedLabel: "Normalized text",
    detailNoNormalizedText: "Normalized text is not available yet.",
    detailRoutingSummaryLabel: "Routing summary",
    detailRoutingFallback: "No routing notes have been recorded yet.",
    detailReviewSummary: (artifactCount, resolvedCount) =>
      `${artifactCount} review artifacts, ${resolvedCount} already resolved`,
    detailNoReviewArtifacts:
      "No review artifacts are attached yet. Continue in triage until the item is ready for Learning.",
    detailClarificationQuestionLabel: "Question",
    detailClarificationReasonLabel: "Why this was asked",
    detailClarificationAnswerLabel: "Answer",
    detailClarificationPendingTitle: "Answer the pending clarification",
    detailClarificationPendingDescription:
      "Submit one plain-language answer to rerun the item without changing the original signal.",
    detailNoClarificationHistory: "No clarification history is recorded yet.",
    detailActionProcess: "Process item",
    detailActionRetry: "Retry processing",
    detailActionAnswer: "Answer clarification",
    detailActionReviewLearning: "Review in Learning",
    detailActionOpenMap: "Open Map",
    detailActionOpenInspector: "Open Inspector",
    detailActionClosed: "Closed outcome",
    detailNoTargetMap: "The target Map is not available in this workspace context.",
    detailTechnicalEvidence: "Evidence details",
    detailTechnicalReviewBridge: "Review bridge details",
    detailTechnicalRoute: "Technical route details",
    detailTechnicalExecution: "Execution telemetry",
    detailTechnicalTimeline: "Workflow timeline",
    detailNoFragments: "No fragments were recorded yet.",
    detailNoPackets: "No structured packets were recorded yet.",
    detailNoAttempts: "No execution attempts were recorded yet.",
    detailNoEvents: "No workflow events were recorded yet.",
    technicalPacketSummary: "Packet summary",
    technicalRouteReason: "Route reason",
    technicalFailure: "Failure",
    technicalDuration: "Duration",
    technicalStarted: "Started",
    technicalFinished: "Finished",
    technicalRunner: "Runner",
    technicalStep: "Step",
    technicalStatus: "Status",
    technicalLatency: "Latency",
    technicalRuntime: "Runtime",
    technicalPolicyNotes: "Policy notes",
    technicalTime: "Time",
    technicalAttempt: (attemptNo) => `Attempt ${attemptNo}`,
    technicalFragment: (ordinal) => `Fragment ${ordinal}`,
    technicalReviewArtifact: (order) => `Artifact ${order}`,
    statusLabels: {
      received: "Needs processing",
      persisted: "Saved",
      normalized: "Normalized",
      segmented: "Segmented",
      interpreted: "Interpreted",
      scored: "Scored",
      resolved: "Ready to route",
      clarification_requested: "Needs clarification",
      promoted: "Promoted",
      ready_for_review: "Ready for review",
      parked: "Parked for review",
      discarded: "Discarded",
      applied: "Applied",
      failed_needs_review: "Failed and needs review",
    },
    routeLabels: {
      promote: "Promote",
      clarify: "Clarify",
      park: "Park",
      discard: "Discard",
    },
    sourceLabels: {
      manual_note: "Manual note",
      transcript: "Transcript",
      chat: "Chat",
      upload: "Upload",
      import: "Import",
    },
  },
  uk: {
    pageTitle: "Inbox",
    pageDescription: (workspaceName) =>
      `Операторська черга для вхідного сигналу у ${workspaceName}. Inbox показує, що надійшло, до чого це належить, що сталося далі і який наступний крок у Learning або на Map.`,
    composerTitle: "Додати сигнал",
    composerDescription:
      "Спочатку виберіть цільову Map, а потім вставте сирий нотаток або фрагмент транскрипту для triage.",
    composerMapLabel: "Цільова Map",
    composerSourceLabel: "Тип джерела",
    composerRawInputLabel: "Сирий вхід",
    composerRawInputPlaceholder:
      "Вставте сирий нотаток, фрагмент транскрипту або спостереження.",
    composerCreate: "Створити Inbox item",
    composerNoMaps: "Спочатку створіть Map",
    queueTitle: "Операторська черга",
    queueDescription:
      "Використовуйте фільтри, щоб звузити чергу, а потім відкривайте triage для item, який потребує рішення.",
    queueEmptyTitle: "Inbox item ще немає",
    queueEmptyDescription:
      "Створіть перший Inbox item, щоб запустити intake flow у цьому workspace.",
    queueFilteredEmptyTitle: "У цьому вигляді item немає",
    queueFilteredEmptyDescription:
      "Змініть фільтри черги або розмір сторінки, щоб побачити більше Inbox item.",
    queueSummary: (count) => `${count} item у цьому вигляді`,
    queueOpenTriage: "Відкрити triage",
    queueRelatedToLabel: "Належить до",
    queueStateLabel: "Стан",
    queueNextLabel: "Наступний крок",
    queueUpdatedLabel: "Оновлено",
    queueReceivedLabel: "Отримано",
    queueOwnerLabel: "Власник",
    filtersTitle: "Фільтри черги",
    filtersViewLabel: "Вигляд",
    filtersStatusLabel: "Статус",
    filtersRouteLabel: "Результат route",
    filtersMapLabel: "Map",
    filtersSortLabel: "Сортування",
    filtersPageSizeLabel: "Розмір сторінки",
    filtersAnyStatus: "Будь-який статус",
    filtersAnyRoute: "Будь-який route",
    filtersAnyMap: "Будь-яка Map",
    filtersViewNeedsAttention: "Потребує уваги",
    filtersViewAll: "Усі item",
    filtersSortUpdatedDesc: "Найновіша активність спочатку",
    filtersSortUpdatedAsc: "Найстаріша активність спочатку",
    filtersSortCreatedDesc: "Найновіші створені спочатку",
    filtersApply: "Застосувати фільтри",
    filtersReset: "Скинути",
    filtersPrevious: "Назад",
    filtersNext: "Далі",
    filtersPageSummary: (page, totalPages) => `Сторінка ${page} з ${totalPages}`,
    selectionUnavailableTitle: "Inbox item недоступний",
    selectionUnavailableDescription:
      "Обраний Inbox item не вдалося завантажити в цьому workspace.",
    selectionEmptyTitle: "Оберіть item для triage",
    selectionEmptyDescription:
      "Виберіть Inbox item із черги, щоб побачити його підсумок, статус і наступний крок.",
    selectionMobileDescription:
      "Виберіть Inbox item із черги, щоб відкрити сфокусований mobile triage view.",
    selectionOutsideCurrentView:
      "Цей item відкрито, але він не входить до поточного вигляду черги. Змініть фільтри або пагінацію, якщо хочете бачити його у списку.",
    mobileBackToQueue: "Назад до черги",
    detailSummaryTitle: "Підсумок triage",
    detailSummaryDescription:
      "Почніть із поточного стану, причини route і наступного операторського кроку.",
    detailSignalTitle: "Сигнал",
    detailSignalDescription:
      "Тримайте сирий нотаток поруч із нормалізованим текстом, який використовувався для route.",
    detailRoutingTitle: "Routing і provenance",
    detailRoutingDescription:
      "Тут видно, до чого належить item, що з ним сталося і що означає route зараз.",
    detailReviewTitle: "Review і apply",
    detailReviewDescription:
      "Коли item готовий до review, саме Learning залишається канонічним місцем для review та apply.",
    detailClarificationTitle: "Clarification",
    detailClarificationDescription:
      "Clarification видно тільки тоді, коли наступний корисний крок це відповісти на pending question.",
    detailNextStepLabel: "Наступний крок",
    detailStateLabel: "Стан",
    detailRouteLabel: "Результат route",
    detailMapLabel: "Контекст Map",
    detailSourceLabel: "Джерело",
    detailCreatedLabel: "Створено",
    detailUpdatedLabel: "Оновлено",
    detailRawInputLabel: "Сирий вхід",
    detailNormalizedLabel: "Нормалізований текст",
    detailNoNormalizedText: "Нормалізований текст ще недоступний.",
    detailRoutingSummaryLabel: "Підсумок route",
    detailRoutingFallback: "Нотатки route поки не записані.",
    detailReviewSummary: (artifactCount, resolvedCount) =>
      `${artifactCount} review artifacts, ${resolvedCount} уже вирішено`,
    detailNoReviewArtifacts:
      "Review artifacts поки не прикріплені. Продовжуйте triage, доки item не буде готовий для Learning.",
    detailClarificationQuestionLabel: "Питання",
    detailClarificationReasonLabel: "Чому це запитали",
    detailClarificationAnswerLabel: "Відповідь",
    detailClarificationPendingTitle: "Дайте відповідь на pending clarification",
    detailClarificationPendingDescription:
      "Надішліть одну відповідь простою мовою, щоб перезапустити item без зміни початкового сигналу.",
    detailNoClarificationHistory: "Clarification history ще не записана.",
    detailActionProcess: "Обробити item",
    detailActionRetry: "Повторити обробку",
    detailActionAnswer: "Відповісти на clarification",
    detailActionReviewLearning: "Переглянути в Learning",
    detailActionOpenMap: "Відкрити Map",
    detailActionOpenInspector: "Відкрити Inspector",
    detailActionClosed: "Закритий результат",
    detailNoTargetMap: "Цільова Map недоступна в цьому workspace context.",
    detailTechnicalEvidence: "Деталі evidence",
    detailTechnicalReviewBridge: "Деталі review bridge",
    detailTechnicalRoute: "Технічні деталі route",
    detailTechnicalExecution: "Execution telemetry",
    detailTechnicalTimeline: "Workflow timeline",
    detailNoFragments: "Fragments ще не записані.",
    detailNoPackets: "Structured packets ще не записані.",
    detailNoAttempts: "Execution attempts ще не записані.",
    detailNoEvents: "Workflow events ще не записані.",
    technicalPacketSummary: "Підсумок packet",
    technicalRouteReason: "Причина route",
    technicalFailure: "Помилка",
    technicalDuration: "Тривалість",
    technicalStarted: "Почато",
    technicalFinished: "Завершено",
    technicalRunner: "Runner",
    technicalStep: "Крок",
    technicalStatus: "Статус",
    technicalLatency: "Latency",
    technicalRuntime: "Runtime",
    technicalPolicyNotes: "Policy notes",
    technicalTime: "Час",
    technicalAttempt: (attemptNo) => `Attempt ${attemptNo}`,
    technicalFragment: (ordinal) => `Fragment ${ordinal}`,
    technicalReviewArtifact: (order) => `Artifact ${order}`,
    statusLabels: {
      received: "Потребує обробки",
      persisted: "Збережено",
      normalized: "Нормалізовано",
      segmented: "Сегментовано",
      interpreted: "Інтерпретовано",
      scored: "Оцінено",
      resolved: "Готово до route",
      clarification_requested: "Потрібна clarification",
      promoted: "Promoted",
      ready_for_review: "Готово до review",
      parked: "Відкладено для review",
      discarded: "Відкинуто",
      applied: "Застосовано",
      failed_needs_review: "Помилка, потрібен review",
    },
    routeLabels: {
      promote: "Promote",
      clarify: "Clarify",
      park: "Park",
      discard: "Discard",
    },
    sourceLabels: {
      manual_note: "Ручна нотатка",
      transcript: "Транскрипт",
      chat: "Чат",
      upload: "Завантаження",
      import: "Імпорт",
    },
  },
  ru: {
    pageTitle: "Inbox",
    pageDescription: (workspaceName) =>
      `Операторская очередь для входящего сигнала в ${workspaceName}. Inbox показывает, что пришло, к чему это относится, что произошло дальше и какой следующий шаг в Learning или на Map.`,
    composerTitle: "Добавить сигнал",
    composerDescription:
      "Сначала выберите целевую Map, затем вставьте сырой нотаток или фрагмент транскрипта для triage.",
    composerMapLabel: "Целевая Map",
    composerSourceLabel: "Тип источника",
    composerRawInputLabel: "Сырой вход",
    composerRawInputPlaceholder:
      "Вставьте сырой нотаток, фрагмент транскрипта или наблюдение.",
    composerCreate: "Создать Inbox item",
    composerNoMaps: "Сначала создайте Map",
    queueTitle: "Операторская очередь",
    queueDescription:
      "Используйте фильтры, чтобы сузить очередь, а затем открывайте triage для item, которому нужен следующий шаг.",
    queueEmptyTitle: "Inbox item пока нет",
    queueEmptyDescription:
      "Создайте первый Inbox item, чтобы запустить intake flow в этом workspace.",
    queueFilteredEmptyTitle: "В этом виде item нет",
    queueFilteredEmptyDescription:
      "Измените фильтры очереди или размер страницы, чтобы увидеть больше Inbox item.",
    queueSummary: (count) => `${count} item в этом виде`,
    queueOpenTriage: "Открыть triage",
    queueRelatedToLabel: "Относится к",
    queueStateLabel: "Состояние",
    queueNextLabel: "Следующий шаг",
    queueUpdatedLabel: "Обновлено",
    queueReceivedLabel: "Получено",
    queueOwnerLabel: "Владелец",
    filtersTitle: "Фильтры очереди",
    filtersViewLabel: "Вид",
    filtersStatusLabel: "Статус",
    filtersRouteLabel: "Результат route",
    filtersMapLabel: "Map",
    filtersSortLabel: "Сортировка",
    filtersPageSizeLabel: "Размер страницы",
    filtersAnyStatus: "Любой статус",
    filtersAnyRoute: "Любой route",
    filtersAnyMap: "Любая Map",
    filtersViewNeedsAttention: "Требует внимания",
    filtersViewAll: "Все item",
    filtersSortUpdatedDesc: "Сначала новая активность",
    filtersSortUpdatedAsc: "Сначала старая активность",
    filtersSortCreatedDesc: "Сначала новые созданные",
    filtersApply: "Применить фильтры",
    filtersReset: "Сбросить",
    filtersPrevious: "Назад",
    filtersNext: "Далее",
    filtersPageSummary: (page, totalPages) => `Страница ${page} из ${totalPages}`,
    selectionUnavailableTitle: "Inbox item недоступен",
    selectionUnavailableDescription:
      "Выбранный Inbox item не удалось загрузить в этом workspace.",
    selectionEmptyTitle: "Выберите item для triage",
    selectionEmptyDescription:
      "Выберите Inbox item из очереди, чтобы увидеть его сводку, статус и следующий шаг.",
    selectionMobileDescription:
      "Выберите Inbox item из очереди, чтобы открыть сфокусированный mobile triage view.",
    selectionOutsideCurrentView:
      "Этот item открыт, но не входит в текущий вид очереди. Измените фильтры или пагинацию, если хотите видеть его в списке.",
    mobileBackToQueue: "Назад к очереди",
    detailSummaryTitle: "Сводка triage",
    detailSummaryDescription:
      "Начните с текущего состояния, причины route и следующего операторского шага.",
    detailSignalTitle: "Сигнал",
    detailSignalDescription:
      "Держите сырой нотаток рядом с нормализованным текстом, который использовался для route.",
    detailRoutingTitle: "Routing и provenance",
    detailRoutingDescription:
      "Здесь видно, к чему относится item, что с ним произошло и что сейчас означает route.",
    detailReviewTitle: "Review и apply",
    detailReviewDescription:
      "Когда item готов к review, именно Learning остаётся каноническим местом для review и apply.",
    detailClarificationTitle: "Clarification",
    detailClarificationDescription:
      "Clarification видна только тогда, когда следующий полезный шаг это ответить на pending question.",
    detailNextStepLabel: "Следующий шаг",
    detailStateLabel: "Состояние",
    detailRouteLabel: "Результат route",
    detailMapLabel: "Контекст Map",
    detailSourceLabel: "Источник",
    detailCreatedLabel: "Создано",
    detailUpdatedLabel: "Обновлено",
    detailRawInputLabel: "Сырой вход",
    detailNormalizedLabel: "Нормализованный текст",
    detailNoNormalizedText: "Нормализованный текст пока недоступен.",
    detailRoutingSummaryLabel: "Сводка route",
    detailRoutingFallback: "Заметки route пока не записаны.",
    detailReviewSummary: (artifactCount, resolvedCount) =>
      `${artifactCount} review artifacts, ${resolvedCount} уже решено`,
    detailNoReviewArtifacts:
      "Review artifacts пока не прикреплены. Продолжайте triage, пока item не будет готов для Learning.",
    detailClarificationQuestionLabel: "Вопрос",
    detailClarificationReasonLabel: "Почему это спросили",
    detailClarificationAnswerLabel: "Ответ",
    detailClarificationPendingTitle: "Ответьте на pending clarification",
    detailClarificationPendingDescription:
      "Отправьте один ответ простым языком, чтобы перезапустить item без изменения исходного сигнала.",
    detailNoClarificationHistory: "Clarification history пока не записана.",
    detailActionProcess: "Обработать item",
    detailActionRetry: "Повторить обработку",
    detailActionAnswer: "Ответить на clarification",
    detailActionReviewLearning: "Открыть в Learning",
    detailActionOpenMap: "Открыть Map",
    detailActionOpenInspector: "Открыть Inspector",
    detailActionClosed: "Закрытый результат",
    detailNoTargetMap: "Целевая Map недоступна в этом workspace context.",
    detailTechnicalEvidence: "Детали evidence",
    detailTechnicalReviewBridge: "Детали review bridge",
    detailTechnicalRoute: "Технические детали route",
    detailTechnicalExecution: "Execution telemetry",
    detailTechnicalTimeline: "Workflow timeline",
    detailNoFragments: "Fragments пока не записаны.",
    detailNoPackets: "Structured packets пока не записаны.",
    detailNoAttempts: "Execution attempts пока не записаны.",
    detailNoEvents: "Workflow events пока не записаны.",
    technicalPacketSummary: "Сводка packet",
    technicalRouteReason: "Причина route",
    technicalFailure: "Ошибка",
    technicalDuration: "Длительность",
    technicalStarted: "Начато",
    technicalFinished: "Завершено",
    technicalRunner: "Runner",
    technicalStep: "Шаг",
    technicalStatus: "Статус",
    technicalLatency: "Latency",
    technicalRuntime: "Runtime",
    technicalPolicyNotes: "Policy notes",
    technicalTime: "Время",
    technicalAttempt: (attemptNo) => `Attempt ${attemptNo}`,
    technicalFragment: (ordinal) => `Fragment ${ordinal}`,
    technicalReviewArtifact: (order) => `Artifact ${order}`,
    statusLabels: {
      received: "Нужна обработка",
      persisted: "Сохранено",
      normalized: "Нормализовано",
      segmented: "Сегментировано",
      interpreted: "Интерпретировано",
      scored: "Оценено",
      resolved: "Готово к route",
      clarification_requested: "Нужна clarification",
      promoted: "Promoted",
      ready_for_review: "Готово к review",
      parked: "Отложено для review",
      discarded: "Отброшено",
      applied: "Применено",
      failed_needs_review: "Ошибка, нужен review",
    },
    routeLabels: {
      promote: "Promote",
      clarify: "Clarify",
      park: "Park",
      discard: "Discard",
    },
    sourceLabels: {
      manual_note: "Ручная заметка",
      transcript: "Транскрипт",
      chat: "Чат",
      upload: "Загрузка",
      import: "Импорт",
    },
  },
};

export function getInboxWorkbenchMessages(locale: SupportedLocale) {
  return inboxWorkbenchMessagesByLocale[locale];
}
