"use client";

import { useRef, useState } from "react";

export function RichTextEditor({ initialHtml }: { initialHtml: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);

  function sync() {
    setHtml(editorRef.current?.innerHTML || "");
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    sync();
  }

  function addLink() {
    const url = window.prompt("Адрес ссылки, включая https://");
    if (url) command("createLink", url);
  }

  return (
    <div>
      <div className="cms-toolbar" role="toolbar" aria-label="Форматирование текста">
        <button type="button" title="Полужирный" onClick={() => command("bold")}>Ж</button>
        <button type="button" title="Курсив" onClick={() => command("italic")}><em>К</em></button>
        <button type="button" title="Подчёркнутый" onClick={() => command("underline")}><u>Ч</u></button>
        <button type="button" title="Заголовок" onClick={() => command("formatBlock", "h2")}>H2</button>
        <button type="button" title="Подзаголовок" onClick={() => command("formatBlock", "h3")}>H3</button>
        <button type="button" title="Обычный абзац" onClick={() => command("formatBlock", "p")}>¶</button>
        <button type="button" title="Маркированный список" onClick={() => command("insertUnorderedList")}>•</button>
        <button type="button" title="Нумерованный список" onClick={() => command("insertOrderedList")}>1.</button>
        <button type="button" title="Цитата" onClick={() => command("formatBlock", "blockquote")}>❝</button>
        <button type="button" title="Добавить ссылку" onClick={addLink}>Ссылка</button>
        <button type="button" title="Убрать форматирование" onClick={() => command("removeFormat")}>Очистить</button>
      </div>
      <div
        ref={editorRef}
        className="cms-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        aria-label="Основной текст материала"
      />
      <input type="hidden" name="contentHtml" value={html} />
    </div>
  );
}
