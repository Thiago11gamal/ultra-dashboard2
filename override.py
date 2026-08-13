import re

with open(r'd:\Downloads\ultra-patched\src\components\coach\CoachControlCenter.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace ErrorAlert component definition
old_error_alert = r'function ErrorAlert\(\{ message, onDismiss \}\) \{[\s\S]*?\}\n'
new_error_alert = '''function ErrorAlert({ message }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm font-medium">Erro no Control Center</p>
        <p className="text-red-400/70 text-xs mt-1">{message}</p>
      </div>
      <button onClick={() => setDismissed(true)} aria-label="Dispensar erro" className="text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}
'''
text = re.sub(old_error_alert, new_error_alert, text)

# Remove useEffect and errorDismissed
text = re.sub(r'  // LOTE 4: dismiss REAL do alerta de erro.*?useEffect\(\(\) => \{ setErrorDismissed\(false\); \}, \[error\]\);\n', '', text, flags=re.DOTALL)

# Replace the usage
text = re.sub(r'\{hasError && !errorDismissed && \([\s\S]*?\)\}', '{hasError && <ErrorAlert key={error} message={error} />}', text)

with open(r'd:\Downloads\ultra-patched\src\components\coach\CoachControlCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Override applied.")
