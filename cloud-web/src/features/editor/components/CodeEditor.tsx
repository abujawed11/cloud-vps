import { useState } from 'react'
import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  filename: string
  readOnly?: boolean
}

export default function CodeEditor({ value, onChange, filename, readOnly = false }: CodeEditorProps) {
  const [theme, setTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark')
  const [fontSize, setFontSize] = useState(14)

  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.dart': 'dart',
      '.scala': 'scala',
      '.clj': 'clojure',
      '.hs': 'haskell',
      '.ml': 'fsharp',
      '.r': 'r',
      '.m': 'objective-c',
      '.pl': 'perl',
      '.sh': 'shell',
      '.bat': 'bat',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.dockerfile': 'dockerfile',
      '.gitignore': 'plaintext',
      '.env': 'plaintext',
      '.txt': 'plaintext',
      '.log': 'plaintext',
      '.ini': 'ini',
      '.cfg': 'ini',
      '.conf': 'ini'
    }

    return languageMap[ext] || 'plaintext'
  }

  const language = getLanguageFromFilename(filename)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // This will be handled by parent component
      const event = new CustomEvent('editor-save')
      document.dispatchEvent(event)
    })
    
    // Add custom actions
    editor.addAction({
      id: 'increase-font-size',
      label: 'Increase Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
      run: () => setFontSize(prev => Math.min(prev + 2, 24))
    })
    
    editor.addAction({
      id: 'decrease-font-size',
      label: 'Decrease Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
      run: () => setFontSize(prev => Math.max(prev - 2, 10))
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-background-muted px-4 py-2 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Language:</span>
            <span className="text-sm font-mono bg-background px-2 py-1 rounded">
              {language}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'vs-dark' | 'vs-light')}
              className="text-sm bg-background border rounded px-2 py-1"
            >
              <option value="vs-dark">Dark</option>
              <option value="vs-light">Light</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Font Size:</span>
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-16"
            />
            <span className="text-sm w-8">{fontSize}</span>
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <kbd>Ctrl+S</kbd> Save • <kbd>Ctrl+F</kbd> Find • <kbd>Ctrl+H</kbd> Replace
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: 'Consolas, "Courier New", monospace',
            readOnly,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: true,
            bracketMatching: 'always',
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: 'selection',
            rulers: [80, 120],
            suggest: {
              showKeywords: true,
              showSnippets: true
            },
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            parameterHints: { enabled: true },
            hover: { enabled: true },
            contextmenu: true,
            mouseWheelZoom: true,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            renderLineHighlight: 'all',
            selectOnLineNumbers: true,
            glyphMargin: true,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true
          }}
        />
      </div>
    </div>
  )
}