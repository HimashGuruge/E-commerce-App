import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const QuillEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: placeholder || "Start writing your product description...",
        modules: {
          toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ align: ["", "center", "right", "justify"] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"],
          ],
        },
      });

      // Set initial value
      if (value) {
        quillRef.current.root.innerHTML = value;
        setCharCount(quillRef.current.getText().trim().length);
      }

      // Listen for text changes
      quillRef.current.on("text-change", () => {
        const text = quillRef.current.getText().trim();
        setCharCount(text.length);
        onChange(quillRef.current.root.innerHTML);
      });

      // Track focus state
      quillRef.current.on("selection-change", (range) => {
        setIsFocused(range !== null);
      });
    }

    return () => {
      quillRef.current = null;
    };
  }, []);

  // Update value from outside
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value || "";
      setCharCount(quillRef.current.getText().trim().length);
    }
  }, [value]);

  return (
    <div className="quill-wrapper">
      <style>{`
        .quill-wrapper .ql-toolbar {
          border: 2px solid #e5e7eb;
          border-bottom: none;
          border-radius: 12px 12px 0 0;
          padding: 8px 12px;
          background: #f9fafb;
        }
        .quill-wrapper .ql-toolbar:hover {
          border-color: #d1d5db;
        }
        .quill-wrapper .ql-container {
          border: 2px solid #e5e7eb;
          border-radius: 0 0 12px 12px;
          font-family: inherit;
          font-size: 14px;
        }
        .quill-wrapper .ql-container:focus-within,
        .quill-wrapper .ql-toolbar:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .quill-wrapper .ql-editor {
          min-height: 200px;
          padding: 16px;
          line-height: 1.7;
          color: #374151;
        }
        .quill-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          left: 16px;
          right: 16px;
        }
        .quill-wrapper .ql-editor h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .quill-wrapper .ql-editor h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .quill-wrapper .ql-toolbar .ql-stroke {
          stroke: #6b7280;
        }
        .quill-wrapper .ql-toolbar .ql-fill {
          fill: #6b7280;
        }
        .quill-wrapper .ql-toolbar .ql-picker {
          color: #6b7280;
        }
        .quill-wrapper .ql-toolbar:hover .ql-stroke {
          stroke: #10b981;
        }
        .quill-wrapper .ql-toolbar:hover .ql-fill {
          fill: #10b981;
        }
        .quill-wrapper .ql-toolbar button:hover,
        .quill-wrapper .ql-toolbar .ql-picker-label:hover {
          background: #ecfdf5;
          border-radius: 4px;
        }
        .quill-wrapper .ql-toolbar button.ql-active {
          background: #ecfdf5;
          border-radius: 4px;
        }
        .quill-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: #10b981;
        }
        .quill-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: #10b981;
        }
      `}</style>
      
      <div ref={editorRef} />
      
      <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
        <span>{placeholder ? "Use toolbar to format text" : "Rich text enabled"}</span>
        <span className={isFocused ? "text-brand-500" : ""}>
          {charCount} {charCount === 1 ? "character" : "characters"}
        </span>
      </div>
    </div>
  );
};

export default QuillEditor;
