import type { SupportedLocale } from "@/shared/i18n/config";

export type AppShellMessageSet = {
  shell: {
    brandNote: string;
    workspaceSwitcherLabel: string;
    settings: string;
    maps: string;
    members: string;
    signedInUser: string;
    signOut: string;
  };
  mapsHome: {
    title: string;
    description: string;
    emptyState: {
      title: string;
      description: string;
      nextLabel: string;
      steps: [string, string, string];
    };
    createCard: {
      title: string;
      description: string;
    };
    recentRuns: {
      title: string;
      description: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    workspaceMaps: {
      title: string;
      description: string;
      emptyDescription: string;
      openMap: string;
    };
  };
  createMapForm: {
    titleLabel: string;
    titlePlaceholder: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    slugLabel: string;
    slugPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    submit: string;
    reviewFields: string;
    unableToCreate: string;
  };
};

export const appShellMessages: Record<SupportedLocale, AppShellMessageSet> = {
  en: {
    shell: {
      brandNote: "Explainable human maps",
      workspaceSwitcherLabel: "Workspace",
      settings: "Settings",
      maps: "Maps",
      members: "Members",
      signedInUser: "Signed in user",
      signOut: "Sign out",
    },
    mapsHome: {
      title: "Maps",
      description:
        "A map turns scattered notes into an explainable structure of Concepts, Links, and scenario paths.",
      emptyState: {
        title: "Create your first map",
        description:
          "Start with one person, then place the first Concept directly on the canvas.",
        nextLabel: "What happens next",
        steps: [
          "1. Create one map for one person.",
          "2. Place the first Concept on the canvas.",
          "3. Add the second Concept, connect the first Link, then run a Scenario.",
        ],
      },
      createCard: {
        title: "Create map",
        description:
          "Start with one person, one map, and the first meaningful Concept.",
      },
      recentRuns: {
        title: "Recent scenario runs",
        description:
          "Recent checks across this workspace stay inside a bounded panel.",
        emptyTitle: "No scenario runs yet",
        emptyDescription:
          "Runs appear after someone tests a situation against a map. Each run keeps an ordered explanation path.",
      },
      workspaceMaps: {
        title: "Workspace maps",
        description:
          "Open an existing map or create a new one for this workspace.",
        emptyDescription:
          "Open the map to start defining Concepts, Links, and Scenarios.",
        openMap: "Open map",
      },
    },
    createMapForm: {
      titleLabel: "Map title",
      titlePlaceholder: "Conflict reactions",
      subjectLabel: "Subject label",
      subjectPlaceholder: "Alex",
      slugLabel: "Slug",
      slugPlaceholder: "conflict-reactions",
      descriptionLabel: "Description",
      descriptionPlaceholder:
        "What this map is trying to explain about the person.",
      submit: "Create map",
      reviewFields: "Please review the highlighted fields.",
      unableToCreate: "Unable to create map.",
    },
  },
  uk: {
    shell: {
      brandNote: "Пояснювані карти людини",
      workspaceSwitcherLabel: "Workspace",
      settings: "Налаштування",
      maps: "Карти",
      members: "Учасники",
      signedInUser: "Авторизований користувач",
      signOut: "Вийти",
    },
    mapsHome: {
      title: "Карти",
      description:
        "Карта перетворює розрізнені нотатки на пояснювану структуру Концептів, Зв’язків і сценарних шляхів.",
      emptyState: {
        title: "Створіть першу карту",
        description:
          "Почніть з однієї людини, а потім розмістіть перший Концепт прямо на canvas.",
        nextLabel: "Що буде далі",
        steps: [
          "1. Створіть одну карту для однієї людини.",
          "2. Розмістіть перший Концепт на canvas.",
          "3. Додайте другий Концепт, з’єднайте перший Зв’язок і запустіть Сценарій.",
        ],
      },
      createCard: {
        title: "Створити карту",
        description:
          "Почніть з однієї людини, однієї карти й першого змістовного Концепту.",
      },
      recentRuns: {
        title: "Останні сценарні прогони",
        description:
          "Останні перевірки в цьому workspace залишаються в межах обмеженої панелі.",
        emptyTitle: "Сценарних прогонів ще немає",
        emptyDescription:
          "Прогони з’являються після перевірки конкретної ситуації на карті. Кожен прогін зберігає впорядкований шлях пояснення.",
      },
      workspaceMaps: {
        title: "Карти workspace",
        description: "Відкрийте існуючу карту або створіть нову для цього workspace.",
        emptyDescription:
          "Відкрийте карту, щоб почати визначати Концепти, Зв’язки та Сценарії.",
        openMap: "Відкрити карту",
      },
    },
    createMapForm: {
      titleLabel: "Назва карти",
      titlePlaceholder: "Реакції на конфлікт",
      subjectLabel: "Позначка людини",
      subjectPlaceholder: "Олексій",
      slugLabel: "Slug",
      slugPlaceholder: "reaktsii-na-konflikt",
      descriptionLabel: "Опис",
      descriptionPlaceholder:
        "Що саме ця карта має пояснити про людину.",
      submit: "Створити карту",
      reviewFields: "Перевірте підсвічені поля.",
      unableToCreate: "Не вдалося створити карту.",
    },
  },
  ru: {
    shell: {
      brandNote: "Объяснимые карты человека",
      workspaceSwitcherLabel: "Workspace",
      settings: "Настройки",
      maps: "Карты",
      members: "Участники",
      signedInUser: "Авторизованный пользователь",
      signOut: "Выйти",
    },
    mapsHome: {
      title: "Карты",
      description:
        "Карта превращает разрозненные заметки в объяснимую структуру Концептов, Связей и сценарных путей.",
      emptyState: {
        title: "Создайте первую карту",
        description:
          "Начните с одного человека, а затем разместите первый Концепт прямо на canvas.",
        nextLabel: "Что будет дальше",
        steps: [
          "1. Создайте одну карту для одного человека.",
          "2. Разместите первый Концепт на canvas.",
          "3. Добавьте второй Концепт, соедините первую Связь и запустите Сценарий.",
        ],
      },
      createCard: {
        title: "Создать карту",
        description:
          "Начните с одного человека, одной карты и первого значимого Концепта.",
      },
      recentRuns: {
        title: "Последние прогоны сценариев",
        description:
          "Последние проверки по этому workspace остаются внутри ограниченной панели.",
        emptyTitle: "Прогонов сценариев пока нет",
        emptyDescription:
          "Прогоны появляются после проверки конкретной ситуации на карте. Каждый прогон сохраняет упорядоченный путь объяснения.",
      },
      workspaceMaps: {
        title: "Карты workspace",
        description:
          "Откройте существующую карту или создайте новую для этого workspace.",
        emptyDescription:
          "Откройте карту, чтобы начать определять Концепты, Связи и Сценарии.",
        openMap: "Открыть карту",
      },
    },
    createMapForm: {
      titleLabel: "Название карты",
      titlePlaceholder: "Реакции на конфликт",
      subjectLabel: "Метка человека",
      subjectPlaceholder: "Алекс",
      slugLabel: "Slug",
      slugPlaceholder: "reakcii-na-konflikt",
      descriptionLabel: "Описание",
      descriptionPlaceholder:
        "Что именно эта карта должна объяснить о человеке.",
      submit: "Создать карту",
      reviewFields: "Проверьте подсвеченные поля.",
      unableToCreate: "Не удалось создать карту.",
    },
  },
};

export function getAppShellMessages(locale: SupportedLocale) {
  return appShellMessages[locale];
}
