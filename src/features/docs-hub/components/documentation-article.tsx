"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";

import {
  formatDocsHubStatus,
  formatDocsHubTier,
  type DocsHubResolvedDocument,
  type DocsHubTier,
} from "@/features/docs-hub/content";
import type {
  MarkdownBlock,
  ParsedMarkdownDocument,
} from "@/features/docs-hub/markdown";
import { handbookPath } from "@/shared/config/routes";

type DocumentationArticleProps = {
  docsDocument: DocsHubResolvedDocument;
  content: ParsedMarkdownDocument;
};

export function DocumentationArticle({
  docsDocument,
  content,
}: DocumentationArticleProps) {
  const [activeHeading, setActiveHeading] = useState<string | null>(
    content.headings[0]?.id ?? null
  );
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const headingIds = useMemo(
    () => new Set(content.headings.map((heading) => heading.id)),
    [content.headings]
  );
  const resolvedActiveHeading =
    activeHeading && headingIds.has(activeHeading)
      ? activeHeading
      : content.headings[0]?.id ?? null;

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot || content.headings.length === 0) {
      return;
    }

    const headingNodes = Array.from(
      scrollRoot.querySelectorAll<HTMLElement>("[data-doc-heading='true']")
    );

    if (headingNodes.length === 0) {
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

        const nextHeadingId = visibleEntries[0]?.target.id;

        if (nextHeadingId) {
          setActiveHeading(nextHeadingId);
        }
      },
      {
        root: scrollRoot,
        rootMargin: "0px 0px -70% 0px",
        threshold: [0.05, 0.2, 0.5, 1],
      }
    );

    headingNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [content.headings]);

  const scrollToHeading = (headingId: string) => {
    const headingNode = globalThis.document.getElementById(headingId);

    if (!headingNode) {
      return;
    }

    headingNode.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveHeading(headingId);
  };

  return (
    <div className="docs-hub-layout">
      <Flex
        align="start"
        justify="between"
        gap="3"
        wrap="wrap"
        className="docs-article-header"
      >
        <Flex direction="column" gap="2">
          <Button asChild type="button" size="1" variant="ghost" color="gray">
            <Link href={handbookPath()}>
              <ArrowLeftIcon />
              Back to hub
            </Link>
          </Button>
          <Flex gap="2" wrap="wrap" align="center">
            <Badge
              radius="full"
              variant="soft"
              color={getTierColor(docsDocument.tier)}
            >
              {formatDocsHubTier(docsDocument.tier)}
            </Badge>
            <Text size="1" color="gray">
              {docsDocument.sectionTitle}
            </Text>
          </Flex>
          <Heading size="7">{content.title}</Heading>
          <Text size="2" color="gray" className="docs-article-summary">
            {docsDocument.summary}
          </Text>
        </Flex>

        <Flex gap="2" wrap="wrap" justify="end">
          <Badge radius="full" variant="surface" color="gray">
            {docsDocument.owner}
          </Badge>
          <Badge
            radius="full"
            variant="soft"
            color={getStatusColor(docsDocument.status)}
          >
            {formatDocsHubStatus(docsDocument.status)}
          </Badge>
        </Flex>
      </Flex>

      <div className="docs-hub-grid">
        <div ref={scrollRootRef} className="docs-hub-main-scroll">
          <Card className="docs-article-card">
            <div className="docs-article-body">
              {docsDocument.path ? (
                <Box className="docs-document-meta">
                  <Text size="1" color="gray">
                    Canonical file
                  </Text>
                  <Text size="2" className="docs-document-path">
                    {docsDocument.path}
                  </Text>
                </Box>
              ) : null}

              {docsDocument.legacyNote ? (
                <Box className="docs-document-meta">
                  <Text size="1" color="gray">
                    Legacy note
                  </Text>
                  <Text size="2">{docsDocument.legacyNote}</Text>
                </Box>
              ) : null}

              {content.blocks.map((block, index) => (
                <MarkdownBlockRenderer key={`${block.type}-${index}`} block={block} />
              ))}
            </div>
          </Card>
        </div>

        <aside className="docs-hub-toc">
          <Flex direction="column" gap="3" className="docs-hub-toc-inner">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Headings
              </Text>
              <Text size="1" color="gray">
                Quick navigation through the document
              </Text>
            </Flex>
            <Separator size="4" />
            <div className="docs-hub-toc-scroll">
              {content.headings.map((heading) => (
                <Button
                  key={heading.id}
                  type="button"
                  size="1"
                  variant={
                    resolvedActiveHeading === heading.id ? "surface" : "ghost"
                  }
                  color={
                    resolvedActiveHeading === heading.id ? "blue" : "gray"
                  }
                  className={
                    heading.level === 3
                      ? "docs-toc-document is-nested"
                      : "docs-toc-section"
                  }
                  onClick={() => scrollToHeading(heading.id)}
                >
                  {heading.text}
                </Button>
              ))}
            </div>
          </Flex>
        </aside>
      </div>
    </div>
  );
}

function getStatusColor(status: DocsHubResolvedDocument["status"]) {
  if (status === "existing") {
    return "green";
  }

  if (status === "next") {
    return "blue";
  }

  return "gray";
}

function getTierColor(tier: DocsHubTier) {
  if (tier === "canon") {
    return "amber";
  }

  if (tier === "rules") {
    return "blue";
  }

  if (tier === "surfaces") {
    return "violet";
  }

  return "green";
}

function MarkdownBlockRenderer({ block }: { block: MarkdownBlock }) {
  if (block.type === "heading") {
    const headingClassName =
      block.level === 1
        ? "docs-article-h1"
        : block.level === 2
          ? "docs-article-h2"
          : "docs-article-h3";

    if (block.level === 1) {
      return (
        <Heading id={block.id} size="8" className={headingClassName}>
          {block.text}
        </Heading>
      );
    }

    if (block.level === 2) {
      return (
        <Heading
          id={block.id}
          size="6"
          data-doc-heading="true"
          className={headingClassName}
        >
          {block.text}
        </Heading>
      );
    }

    return (
      <Heading
        id={block.id}
        size="4"
        data-doc-heading="true"
        className={headingClassName}
      >
        {block.text}
      </Heading>
    );
  }

  if (block.type === "paragraph") {
    return (
      <Text as="p" size="3" className="docs-article-paragraph">
        {renderInlineParts(block.parts)}
      </Text>
    );
  }

  const ListTag = block.ordered ? "ol" : "ul";

  return (
    <ListTag className="docs-article-list">
      {block.items.map((item, index) => (
        <li key={index}>
          <Text as="span" size="3">
            {renderInlineParts(item)}
          </Text>
        </li>
      ))}
    </ListTag>
  );
}

function renderInlineParts(
  parts: ParsedMarkdownDocument["blocks"][number] extends infer Block
    ? Block extends { parts: infer InlineParts }
      ? InlineParts
      : never
    : never
) {
  return (parts as Array<{ type: "text" | "code"; value: string }>).map(
    (part, index) =>
      part.type === "code" ? (
        <code key={index} className="docs-inline-code">
          {part.value}
        </code>
      ) : (
        <span key={index}>{part.value}</span>
      )
  );
}
