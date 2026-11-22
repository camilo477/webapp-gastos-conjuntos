"""Diagnóstico de permisos; no altera políticas, namespaces ni configuración."""
import errno
import json
import socket
from pathlib import Path

results = []
for label, family in [('IPv4', socket.AF_INET), ('Unix', socket.AF_UNIX)]:
    try:
        sock = socket.socket(family, socket.SOCK_STREAM)
        results.append({'family': label, 'operation': 'socket', 'status': 'ok'})
    except OSError as exc:
        results.append({'family': label, 'operation': 'socket', 'status': 'denied', 'errno': exc.errno, 'error': str(exc)})
        continue
    try:
        if family == socket.AF_INET:
            sock.bind(('127.0.0.1', 0))
            sock.listen()
            results.append({'family': label, 'operation': 'bind/listen', 'status': 'ok'})
        else:
            sock.shutdown(socket.SHUT_RDWR)
            results.append({'family': label, 'operation': 'shutdown', 'status': 'ok'})
    except OSError as exc:
        results.append({'family': label, 'operation': 'bind/listen' if family == socket.AF_INET else 'shutdown', 'status': 'denied' if exc.errno in (errno.EPERM, errno.EACCES) else 'error', 'errno': exc.errno, 'error': str(exc)})
    finally:
        sock.close()

report = {'scope': 'Permisos efectivos del proceso de pruebas', 'processSecurity': [line for line in Path('/proc/self/status').read_text().splitlines() if line.startswith(('NoNewPrivs:', 'Seccomp:', 'Seccomp_filters:', 'CapEff:'))], 'socketOperations': results}
Path(__file__).with_name('socket-results.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
