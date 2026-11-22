"""Verifica reglas reales de Git y documentación en una copia sin resultados locales."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
CASES = {
    'node_modules/react/index.js': True,
    '.tools/node_modules/playwright/index.js': True,
    '.npm/cache': True,
    '.env': True,
    '.env.local': True,
    '.env.production.local': True,
    '.env.example': False,
    '.env.production.example': False,
    'my-credentials.json': True,
    'client_secret_example.json': True,
    'firebase-adminsdk-private.json': True,
    'test-service-account.json': True,
    'private.key': True,
    '.aws/credentials': True,
    '.codex/config.toml': True,
    '.agents/private-config.json': True,
    '.firebase/cache': True,
    '.runtimeconfig.json': True,
    'firebase-export-example/data': True,
    'emulator-export/data': True,
    'firebase.json': False,
    '.firebaserc': False,
    'firestore.rules': False,
    'storage.rules': False,
    'dist/index.html': True,
    'build/main.js': True,
    'coverage/index.html': True,
    'file.tsbuildinfo': True,
    'playwright-report/index.html': True,
    'test-results/video.webm': True,
    'playwright/.auth/user.json': True,
    'storage-state.json': True,
    'trace.zip': True,
    'design/review/testing/runs/run/results.json': True,
    'design/review/testing/environment/runtime/lib/example.so': True,
    'design/review/testing/environment/debs/example.deb': True,
    'design/review/testing/playwright/artifacts/trace.zip': True,
    'design/review/testing/playwright/html-report/index.html': True,
    'design/review/testing/screenshots/run/home.png': True,
    'design/review/testing/screenshots/README.md': False,
    'design/review/testing/git-publication/security-audit.json': True,
    'debug.log': True,
    '.vscode/settings.json': True,
    '.idea/workspace.xml': True,
    'backup.bak': True,
    'swap.swp': True,
    'README.md': False,
    'AGENTS.md': False,
    '.gitignore': False,
    '.gitattributes': False,
    'design/prototype/index.html': False,
    'design/prototype/app.js': False,
    'design/prototype/styles.css': False,
    'design/wireframes.html': False,
    'design/review/composition.png': False,
    'design/review/budget-composition.svg': False,
    'design/review/testing/playwright/prototype.spec.cjs': False,
    'docs/phase1/DESIGN_SYSTEM.md': False,
    'docs/PLAN_MVP_GASTOS_COMPARTIDOS.md': False,
}


class GitExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='gastos-export-test-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.directory = Path(cls.temp.name)
        metadata = cls.directory/'audit-repo'
        subprocess.run(['git', 'init', '-q', '--initial-branch=main', str(metadata)], check=True)
        # Metadata solo temporal. No inicializa ni escribe .git del proyecto.
        cls.git = ['git', '--git-dir', str(metadata/'.git'), '--work-tree', str(ROOT)]
        names = subprocess.check_output(cls.git+['ls-files', '--others', '--exclude-standard', '-z'])
        cls.candidates = [name for name in names.decode().split('\0') if name]
        cls.export = cls.directory/'export'
        for name in cls.candidates:
            destination = cls.export/name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT/name, destination)

    def test_ignore_rules(self):
        for name, expected in CASES.items():
            with self.subTest(path=name):
                result = subprocess.run(self.git+['check-ignore', '--no-index', '-v', name], capture_output=True, text=True)
                self.assertIn(result.returncode, [0, 1], result.stderr)
                rule = result.stdout.split('\t')[0].split(':', 2)[-1]
                ignored = result.returncode == 0 and not rule.startswith('!')
                self.assertEqual(ignored, expected, result.stdout)

    def verify_export(self):
        report = self.directory/'reports'
        result = subprocess.run(['python3', str(self.export/'design/review/verify-docs.py')],
                                capture_output=True, text=True,
                                env={**os.environ, 'DESIGN_REPORT_DIR': str(report)})
        return result, json.loads((report/'document-results.json').read_text())

    def test_export_without_local_results_is_valid(self):
        result, report = self.verify_export()
        self.assertEqual(result.returncode, 0, result.stdout+result.stderr)
        self.assertEqual(report['issues'], [])
        self.assertGreater(len(report['missingLocalArtifacts']), 0)
        self.assertTrue(report['identityPaletteUnchanged'])

    def test_missing_source_link_still_fails(self):
        readme = self.export/'README.md'
        previous = readme.read_text()
        try:
            readme.write_text(previous+'\n[Fuente inexistente](docs/MISSING_SOURCE.md)\n')
            result, report = self.verify_export()
            self.assertNotEqual(result.returncode, 0)
            self.assertTrue(any('MISSING_SOURCE.md' in issue for issue in report['issues']))
        finally:
            readme.write_text(previous)

    def test_required_sources_are_included(self):
        for name in ['.gitignore', '.gitattributes', 'AGENTS.md', 'docs/PLAN_MVP_GASTOS_COMPARTIDOS.md',
                     'design/prototype/app.js', 'design/prototype/styles.css',
                     'design/prototype/index.html', 'design/review/composition.png',
                     'design/review/test_git_export.py']:
            self.assertIn(name, self.candidates)


if __name__ == '__main__':
    unittest.main(verbosity=2)
