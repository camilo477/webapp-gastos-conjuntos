#!/bin/sh
# Runtime de revisión local. Mantiene el sandbox del navegador y del sistema.
GASTOS_WEBKIT_DIR=/home/camiska/.cache/ms-playwright/webkit-2203/minibrowser-wpe
GASTOS_LOCAL_LIBS=/mnt/Datos/gastos/design/review/testing/environment/runtime/usr/lib/x86_64-linux-gnu
export WEBKIT_EXEC_PATH="$GASTOS_WEBKIT_DIR/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="$GASTOS_WEBKIT_DIR/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="$GASTOS_WEBKIT_DIR/share"
export LD_LIBRARY_PATH="$GASTOS_LOCAL_LIBS:$GASTOS_WEBKIT_DIR/lib:$GASTOS_WEBKIT_DIR/sys/lib"
exec "$GASTOS_WEBKIT_DIR/bin/MiniBrowser" "$@"
