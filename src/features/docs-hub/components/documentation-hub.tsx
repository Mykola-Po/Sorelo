"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";

import type { DocsHubDocument, DocsHubSection } from "@/features/docs-hub/content";

type DocumentationHubProps = {
  sections: DocsHubSection[];
};

export function DocumentationHub({ sections }: DocumentationHubProps) {
  const [query, setQuery] = useState("");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sections;
    }

    return sections
      .map((section) => {
        const sectionMatches = [
          section.title,
          section.summary,
          ...section.documents.flatMap((document) => [
            document.title,
            document.summary,
            document.path,
            ...document.tags,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

        if (sectionMatches) {
          return section;
        }

        const matchingDocuments = section.documents.filter((document) =>
          [
            document.title,
            document.summary,
            document.path,
            ...document.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        );

        if (matchingDocuments.length === 0) {
          return null;
        }

        return {
          ...section,
          documents: matchingDocuments,
        };
      })
      .filter((section): section is DocsHubSection => section !== null);
  }, [query, sections]);

  const visibleDocumentCount = useMemo(
    () =>
      visibleSections.reduce(
        (total, section) => total + section.documents.length,
        0
      ),
    [visibleSections]
  );
  const visibleAnchorIds = useMemo(
    () =>
      new Set(
        visibleSections.flatMap((section) => [
          section.id,
          ...section.documents.map((document) => `${section.id}-${document.id}`),
        ])
      ),
    [visibleSections]
  );
  const resolvedActiveAnchor =
    activeAnchor && visibleAnchorIds.has(activeAnchor)
      ? activeAnchor
      : visibleSections[0]?.id ?? null;

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot) {
      return;
    }

    const anchorNodes = Array.from(
      scrollRoot.querySelectorAll<HTMLElement>("[data-doc-anchor='true']")
    );

    if (anchorNodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (entryA, entryB) =>
              entryA.boundingClientRect.top - entryB.boundingClientRect.top
          );

        const nextActiveAnchor = visibleEntries[0]?.target.id;

        if (nextActiveAnchor) {
          setActiveAnchor(nextActiveAnchor);
        }
      },
      {
        root: scrollRoot,
        rootMargin: "0px 0px -72% 0px",
        threshold: [0.05, 0.25, 0.5, 1],
      }
    );

    anchorNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [visibleSections]);

  const scrollToAnchor = (anchorId: string) => {
    const anchorNode = document.getElementById(anchorId);

    if (!anchorNode) {
      return;
    }

    anchorNode.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveAnchor(anchorId);
  };

  return (
    <div className="docs-hub-layout">
      <Flex align="center" justify="between" gap="3" className="docs-hub-search">
        <TextField.Root
          size="3"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setQuery(event.target.value)
          }
          placeholder="Search product, data, security, ops, and UI docs"
          aria-label="Search documentation"
          className="docs-hub-search-field"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>

        <Flex gap="2" wrap="wrap" justify="end">
          <Badge radius="full" variant="surface" color="gray">
            {visibleSections.length} sections
          </Badge>
          <Badge radius="full" variant="surface" color="blue">
            {visibleDocumentCount} documents
          </Badge>
        </Flex>
      </Flex>

      <div className="docs-hub-grid">
        <div ref={scrollRootRef} className="docs-hub-main-scroll">
          <div className="docs-hub-main-stack">
            {visibleSections.length === 0 ? (
              <Card className="docs-empty-state">
                <Flex direction="column" gap="2">
                  <Heading size="5">No matching documents</Heading>
                  <Text size="2" color="gray">
                    Refine the query or clear the search to see the full
                    documentation roadmap.
                  </Text>
                </Flex>
              </Card>
            ) : (
              visibleSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  data-doc-anchor="true"
                  className="docs-hub-section"
                >
                  <Flex direction="column" gap="2" className="docs-section-head">
                    <Heading size="6">{section.title}</Heading>
                    <Text size="2" color="gray">
                      {section.summary}
                    </Text>
                  </Flex>

                  <div className="docs-card-grid">
                    {section.documents.map((document) => (
                      <DocsDocumentCard
                        key={document.id}
                        document={document}
                        sectionId={section.id}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        <aside className="docs-hub-toc">
          <Flex direction="column" gap="3" className="docs-hub-toc-inner">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                On this page
              </Text>
              <Text size="1" color="gray">
                Section outline and document tree
              </Text>
            </Flex>
            <Separator size="4" />
            <div className="docs-hub-toc-scroll">
              {visibleSections.map((section) => (
                <Flex key={section.id} direction="column" gap="2">
                    <Button
                      type="button"
                      size="1"
                      variant={
                        resolvedActiveAnchor === section.id ? "solid" : "ghost"
                      }
                      color={
                        resolvedActiveAnchor === section.id ? "blue" : "gray"
                      }
                      className="docs-toc-section"
                      onClick={() => scrollToAnchor(section.id)}
                    >
                    {section.title}
                  </Button>
                  <Flex direction="column" gap="1" className="docs-toc-children">
                    {section.documents.map((document) => {
                      const anchorId = `${section.id}-${document.id}`;

                      return (
                        <Button
                          key={anchorId}
                          type="button"
                          size="1"
                          variant={
                            resolvedActiveAnchor === anchorId
                              ? "surface"
                              : "ghost"
                          }
                          color={
                            resolvedActiveAnchor === anchorId
                              ? "blue"
                              : "gray"
                          }
                          className="docs-toc-document"
                          onClick={() => scrollToAnchor(anchorId)}
                        >
                          {document.title}
                        </Button>
                      );
                    })}
                  </Flex>
                </Flex>
              ))}
            </div>
          </Flex>
        </aside>
      </div>
    </div>
  );
}

type DocsDocumentCardProps = {
  document: DocsHubDocument;
  sectionId: string;
};

function DocsDocumentCard({ document, sectionId }: DocsDocumentCardProps) {
  const anchorId = `${sectionId}-${document.id}`;

  return (
    <Card id={anchorId} data-doc-anchor="true" className="docs-document-card">
      <Flex direction="column" gap="3">
        <Flex align="start" justify="between" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Heading size="4">{document.title}</Heading>
            <Text size="2" color="gray">
              {document.summary}
            </Text>
          </Flex>
          <Badge
            radius="full"
            color={getStatusColor(document.status)}
            variant="soft"
          >
            {formatStatus(document.status)}
          </Badge>
        </Flex>

        <Flex gap="2" wrap="wrap">
          <Badge radius="full" variant="surface" color="gray">
            {document.priority}
          </Badge>
          <Badge radius="full" variant="surface" color="gray">
            {document.owner}
          </Badge>
        </Flex>

        <Box className="docs-document-meta">
          <Text size="1" color="gray">
            Canonical file
          </Text>
          <Text size="2" className="docs-document-path">
            {document.path}
          </Text>
        </Box>

        <Flex gap="2" wrap="wrap">
          {document.tags.map((tag) => (
            <Badge key={tag} radius="full" variant="outline" color="gray">
              {tag}
            </Badge>
          ))}
        </Flex>

        {document.status === "existing" ? (
          <Flex justify="end">
            <Button asChild type="button" size="1" variant="surface">
              <Link href={`/handbook/${document.id}`}>
                Open in hub
              </Link>
            </Button>
          </Flex>
        ) : null}
      </Flex>
    </Card>
  );
}

function getStatusColor(status: DocsHubDocumentStatus) {
  if (status === "existing") {
    return "green";
  }

  if (status === "next") {
    return "blue";
  }

  return "gray";
}

function formatStatus(status: DocsHubDocumentStatus) {
  if (status === "existing") {
    return "Existing";
  }

  if (status === "next") {
    return "Next";
  }

  return "Planned";
}

type DocsHubDocumentStatus = DocsHubDocument["status"];
