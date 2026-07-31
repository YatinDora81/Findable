"use client";

import { Children, cloneElement, isValidElement, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import type { Citation } from "../../lib/types";
import { CitationMarker } from "./CitationMarker";
import { SourceCard } from "./SourceCard";

type MarkdownProps = { children?: ReactNode };

function injectCitations(
  children: ReactNode,
  render: (n: number, key: string) => ReactNode,
): ReactNode {
  return Children.map(children, (child, index) => {
    if (typeof child === "string") {
      return child.split(/(\[\d+\])/g).map((part, partIndex) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const digits = match?.[1];
        if (!digits) return part;

        return render(Number(digits), `c-${index}-${partIndex}`);
      });
    }

    if (isValidElement<MarkdownProps>(child) && child.props.children != null) {
      return cloneElement(child, {
        children: injectCitations(child.props.children, render),
      });
    }

    return child;
  });
}

type Props = { text: string; citations: Citation[] };

export function AnswerBody({ text, citations }: Props) {
  const [lit, setLit] = useState<number | null>(null);

  const jump = (n: number) => {
    const target = document.getElementById(`src-${n}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const marker = (n: number, key: string): ReactNode => (
    <CitationMarker
      key={key}
      n={n}
      lit={lit === n}
      onEnter={() => setLit(n)}
      onLeave={() => setLit(null)}
      onClick={() => jump(n)}
    />
  );

  return (
    <div>
      <div className="text-[16px] leading-[1.68] tracking-[-0.009em] text-ink [&_ol]:mt-3.5 [&_ol]:list-decimal [&_ol]:pl-[19px] [&_li]:mt-1.5 [&_p+p]:mt-3.5 [&_ul]:mt-3.5 [&_ul]:list-disc [&_ul]:pl-[19px]">
        <ReactMarkdown
          components={{
            p: (props: MarkdownProps) => (
              <p>{injectCitations(props.children, marker)}</p>
            ),
            li: (props: MarkdownProps) => (
              <li>{injectCitations(props.children, marker)}</li>
            ),
            code: (props: MarkdownProps) => (
              <code className="rounded border border-rule bg-paper-2 px-[5px] py-[1.5px] font-mono text-[13.5px]">
                {props.children}
              </code>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {citations.length > 0 ? (
        <section className="mt-[25px] border-t border-rule pt-[17px]">
          <h4 className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.13em] text-ink-3">
            Sources
          </h4>

          {citations.map((citation) => (
            <SourceCard
              key={citation.id ?? `${citation.rank}-${citation.chunkId ?? ""}`}
              citation={citation}
              lit={lit === citation.rank}
              onEnter={() => setLit(citation.rank)}
              onLeave={() => setLit(null)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
