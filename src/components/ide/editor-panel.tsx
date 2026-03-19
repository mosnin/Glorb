"use client";

import { useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface EditorPanelProps {
  content: string;
  filePath: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

function getLanguageExtension(filePath: string) {
  if (filePath.endsWith(".json")) return [json()];
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) return [yaml()];
  return [markdown({})];
}

export function EditorPanel({
  content,
  filePath,
  onChange,
  readOnly = false,
}: EditorPanelProps) {
  const debounceTimer = useRef<NodeJS.Timeout>(undefined);

  const handleChange = useCallback(
    (value: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onChange(value);
      }, 500);
    },
    [onChange]
  );

  return (
    <div className="h-full overflow-hidden">
      <CodeMirror
        value={content}
        height="100%"
        theme={vscodeDark}
        extensions={getLanguageExtension(filePath)}
        onChange={handleChange}
        readOnly={readOnly}
        className="h-full text-sm"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
