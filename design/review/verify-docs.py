"""Verificación documental, recursos y contraste de tokens de Fase 1."""
import hashlib
import os
import json
import re
from pathlib import Path
from urllib.parse import unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
issues = []
local_artifacts = []
files = [ROOT/'README.md', ROOT/'design/README.md', *sorted((ROOT/'docs').rglob('*.md'))]
if (ROOT/'AGENTS.md').exists():
    files.append(ROOT/'AGENTS.md')


def local_artifact(target):
    """Solo salidas locales excluidas de Git, nunca documentación o fuentes."""
    try:
        relative = target.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return False
    prefixes = [
        'design/review/testing/runs/',
        'design/review/testing/git-publication/',
        'design/review/testing/playwright/html-report/',
        'design/review/testing/playwright/artifacts/',
        'design/review/testing/environment/runtime/',
        'design/review/testing/environment/debs/',
    ]
    return any(relative.startswith(prefix) for prefix in prefixes) or (
        relative.startswith('design/review/testing/') and
        (target.name.endswith('.log') or '.log.' in target.name)
    ) or (
        relative.startswith('design/review/testing/screenshots/') and
        target.name != 'README.md'
    )


for file in files:
    content = file.read_text()
    if content.count('```') % 2:
        issues.append(f'{file.relative_to(ROOT)}: bloque sin cerrar')
    for ref in re.findall(r'\]\(([^)]+)\)', content):
        if ref.startswith(('https://', 'http://', '#')):
            continue
        target = ref.split('#')[0]
        if target:
            destination = file.parent/unquote(target)
            if not destination.exists():
                if local_artifact(destination):
                    local_artifacts.append({'source': str(file.relative_to(ROOT)),
                                            'target': target, 'status': 'local-artifact-not-generated'})
                else:
                    issues.append(f'{file.relative_to(ROOT)}: enlace ausente {target}')

original = ROOT/'docs/PLAN_MVP_GASTOS_COMPARTIDOS.md'
assert hashlib.sha256(original.read_bytes()).hexdigest() == '455b9c3d7ba9be0cffb746142418bbd6a39afce7d7c59f81978899cceb804605'

css = (ROOT/'design/prototype/styles.css').read_text()
light = re.search(r':root\s*\{(.*?)\}', css, re.S).group(1)
dark = re.search(r':root\[data-theme\s*=\s*[\"\']?dark[\"\']?\]\s*\{(.*?)\}', css, re.S).group(1)


def luminance(color):
    color = color.lstrip('#')
    if len(color) == 3:
        color = ''.join(c*2 for c in color)
    values = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(a*b for a, b in zip(linear, [.2126, .7152, .0722]))


pairs = [('ink', 'bg', 4.5), ('ink', 'surface', 4.5), ('muted', 'bg', 4.5),
         ('muted', 'surface', 4.5), ('accent', 'bg', 4.5), ('accent', 'accent-soft', 4.5),
         ('on-accent', 'accent', 4.5), ('danger', 'danger-soft', 4.5),
         ('warning', 'warning-soft', 4.5), ('control', 'surface', 3), ('focus', 'bg', 3),
         ('muted', 'accent-soft', 4.5), ('muted', 'warning-soft', 4.5),
         ('muted', 'danger-soft', 4.5), ('warning', 'bg', 4.5), ('danger', 'bg', 4.5)]
contrast = []
identity_unchanged = True
identity = json.loads((ROOT/'design/review/identity-baseline.json').read_text())
for theme, raw in [('light', light), ('dark', dark)]:
    tokens = dict(re.findall(r'--([a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;', raw))
    if tokens != identity[theme]:
        identity_unchanged = False
        issues.append(f'{theme}: se alteró la paleta de identidad aprobada')
    for foreground, background, minimum in pairs:
        a, b = sorted([luminance(tokens[foreground]), luminance(tokens[background])])
        ratio = (b+.05)/(a+.05)
        contrast.append({'theme': theme, 'foreground': foreground, 'background': background,
                         'ratio': round(ratio, 2), 'minimum': minimum, 'passed': ratio >= minimum})
        if ratio < minimum:
            issues.append(f'{theme}: {foreground}/{background} {ratio:.2f} < {minimum}')

# Ambas ilustraciones deben conservar las cifras públicas exportadas por el DOM.
ns = {'svg': 'http://www.w3.org/2000/svg'}
composition_text = [el.text for el in ET.parse(ROOT/'design/review/composition.svg').findall('.//svg:text', ns)]
budget_text = [el.text for el in ET.parse(ROOT/'design/review/budget-composition.svg').findall('.//svg:text', ns)]
for label in ['Bruno → Ana', 'Bruno → Carla']:
    if label not in composition_text:
        issues.append(f'Composición: falta {label}')
if budget_text.count('$50.000') != 3:
    issues.append('Composición de presupuesto: deben aparecer tres cupos de $50.000')
for label in ['$400.000', '$250.000', '$150.000', '$100.000']:
    if not any(label in (text or '') for text in budget_text):
        issues.append(f'Composición de presupuesto: falta {label}')

report = {'markdownFiles': len(files), 'sourcePlanUnchanged': True, 'contrastPairs': contrast, 'compositionFiguresChecked': 2,
          'identityPaletteUnchanged': identity_unchanged, 'issues': issues,
          'missingLocalArtifacts': local_artifacts,
          'scope': 'Tokens estáticos, enlaces fuente y Markdown; resultados locales excluidos se informan aparte; no certificación WCAG ni renderizado'}
report_dir = Path(os.environ.get('DESIGN_REPORT_DIR', ROOT/'design/review'))
report_dir.mkdir(parents=True, exist_ok=True)
(report_dir/'document-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(f'{len(files)} documentos comprobados; {len(contrast)} combinaciones de contraste; {len(issues)} incidencias.')
if local_artifacts:
    print(f'{len(local_artifacts)} enlaces a resultados locales no generados (no versionados).')
for issue in issues:
    print(issue)
raise SystemExit(bool(issues))
