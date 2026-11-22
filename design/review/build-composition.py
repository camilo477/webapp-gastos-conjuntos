"""Referencia visual esquemática, no captura de navegador. Pillow solo para exportar PNG."""
from pathlib import Path
from html import escape
import json
from PIL import Image, ImageDraw, ImageFont

DEST = Path(__file__).resolve().parent
FIXTURE = json.loads((DEST/'verified-fixture.json').read_text())
BUDGET = FIXTURE['budget']

def cop(value):
    return '$' + f'{value:,}'.replace(',', '.')

W, H = 1240, 980
img = Image.new('RGB', (W, H), '#eceee8')
draw = ImageDraw.Draw(img)
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
         '<title id="title">Gastos compartidos: composición de referencia de Inicio, Gasto y Balance</title>',
         '<desc id="desc">Wireframes ilustrados de tres pantallas móviles. No son capturas del prototipo ni evidencia de renderizado en navegador.</desc>']
FONTS = Path('/usr/share/fonts/truetype/dejavu')


def rect(x, y, w, h, fill, radius=0, stroke=None):
    draw.rounded_rectangle((x, y, x+w, y+h), radius, fill=fill, outline=stroke)
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"' + (f' stroke="{stroke}"' if stroke else '') + '/>')


def line(x, y, x2, color='#dedfd9'):
    draw.line((x, y, x2, y), fill=color, width=1)
    parts.append(f'<path d="M{x} {y} H{x2}" stroke="{color}" fill="none"/>')


def text(x, y, content, size=14, color='#181a19', bold=False):
    filename = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    font = ImageFont.truetype(str(FONTS/filename), size)
    draw.text((x, y), content, font=font, fill=color, anchor='lt')
    parts.append(f'<text x="{x}" y="{y}" dominant-baseline="hanging" font-family="DejaVu Sans,sans-serif" font-size="{size}" font-weight="{600 if bold else 400}" fill="{color}">{escape(content)}</text>')


def button(x, y, w, label, dark=False):
    rect(x, y, w, 46, '#91d3ad' if dark else '#146347', 10)
    text(x+16, y+13, label, 14, '#15291d' if dark else '#ffffff', True)


rect(0, 0, W, H, '#eceee8')
text(48, 35, 'GASTOS COMPARTIDOS / FASE 1', 12, '#555b57', True)
text(48, 67, 'Menos ruido. Las cuentas, claras.', 32, bold=True)
text(48, 113, 'Referencia de composición móvil · datos coherentes · claro y oscuro', 15, '#555b57')

xs = [48, 446, 844]
for x, label in zip(xs, ['01 / INICIO DEL VIAJE', '02 / CAPTURA RÁPIDA', '03 / BALANCE · OSCURO']):
    text(x, 160, label, 12, '#555b57', True)
    rect(x, 190, 348, 720, '#151816' if x == 844 else '#f7f7f5', 16, '#c7cbc6')

x = xs[0]+22
text(x, 215, 'Mis viajes', 12, '#555b57')
text(x+177, 215, 'Sincronizado', 12, '#555b57')
text(x, 264, 'Villa de Leyva', 27, bold=True)
text(x, 305, '21–24 nov · 4 días · COP', 13, '#555b57')
text(x, 354, 'Te deben', 14, '#555b57')
text(x, 384, '$20.000', 46, '#146347')
text(x, 447, 'Ver balance ↗', 13, '#146347')
line(x, 485, x+304)
text(x, 510, 'Disponible', 12, '#555b57')
text(x+164, 510, 'Gastado hoy', 12, '#555b57')
text(x, 538, cop(BUDGET['available']), 23, bold=True)
text(x+164, 538, cop(BUDGET['spent']), 23, bold=True)
text(x, 578, 'de ' + cop(BUDGET['total']), 12, '#555b57')
text(x+164, 578, 'Cupo ' + cop(BUDGET['assigned']), 12, '#555b57')
text(x+164, 600, 'Exceso ' + cop(BUDGET['difference']), 12, '#795400')
text(x, 638, 'Movimientos', 17, bold=True)
for y, title, amount, who in [(674, 'Almuerzo en la plaza', '$96.000', 'Ana pagó · 13:10'),
                              (734, 'Mercado para la casa', '$84.000', 'Ana + Bruno · 11:45')]:
    text(x, y, title, 13)
    text(x+232, y, amount, 13)
    text(x, y+23, who, 11, '#555b57')
    line(x, y+48, x+304)
rect(x-21, 798, 346, 86, '#f7f7f5')
button(x, 815, 304, '+ Agregar gasto')
line(x-22, 885, x+326)
text(x+17, 898, 'Inicio', 11, '#146347', True)
text(x+122, 898, 'Balance', 11, '#555b57')
text(x+227, 898, 'Actividad', 11, '#555b57')

x = xs[1]+22
text(x, 215, '‹ Volver al viaje', 12, '#555b57')
text(x, 264, 'Agregar gasto', 27, bold=True)
text(x, 305, 'Lo habitual, en unos segundos.', 13, '#555b57')
text(x, 358, 'Concepto', 13, bold=True)
rect(x, 385, 304, 48, '#ffffff', 8, '#7e8981')
text(x+14, 401, 'Café en la plaza', 15)
text(x, 467, 'Importe', 13, '#555b57')
text(x, 495, '$12.000', 46)
text(x, 555, 'COP · pesos enteros', 12, '#555b57')
line(x, 586, x+304)
text(x, 610, '¿Quién pagó?', 14, bold=True)
text(x+234, 611, 'Tú  ›', 13, '#555b57')
line(x, 648, x+304)
text(x, 671, '¿Cómo lo dividimos?', 14, bold=True)
text(x, 697, 'Igual · Ana, Bruno y Carla', 12, '#555b57')
line(x, 728, x+304)
text(x, 747, 'Categoría, fecha y nota  ›', 12, '#555b57')
text(x, 777, 'Cámara · Galería · Stock  ›', 12, '#555b57')
text(x, 810, 'Tu parte', 13, '#555b57')
text(x+230, 810, '$4.000', 15, bold=True)
button(x, 846, 304, 'Guardar gasto')

x = xs[2]+22
ink, muted, accent = '#f0f2ed', '#aeb8af', '#91d3ad'
text(x, 215, 'Mis viajes', 12, muted)
text(x+177, 215, 'Sincronizado', 12, muted)
text(x, 264, 'Balance', 27, ink, True)
text(x, 305, 'Las compras y los abonos, claros.', 13, muted)
text(x, 354, 'Te deben', 14, muted)
text(x, 384, '$20.000', 46, accent)
text(x, 467, 'Las cuentas de cada persona', 16, ink, True)
for y, row in zip([516, 584, 652], FIXTURE['balances']):
    name = row['name'] + (' · tú' if row['name'] == 'Ana' else '')
    text(x, y, name, 15, ink)
    text(x+212, y, cop(row['amount']), 16, ink, True)
    text(x+212, y+25, row['direction'], 12, muted)
    line(x, y+53, x+304, '#383f39')
text(x, 737, 'Pagos sugeridos', 16, ink, True)
for y, row in zip([775, 820], FIXTURE['suggestions']):
    text(x, y, row['from']+' → '+row['to'], 13, ink)
    text(x+220, y, cop(row['amount']), 14, accent)
line(x-22, 885, x+326, '#383f39')
text(x+17, 898, 'Inicio', 11, muted)
text(x+122, 898, 'Balance', 11, accent, True)
text(x+227, 898, 'Actividad', 11, muted)

text(48, 946, 'Wireframes ilustrados. No son capturas de navegador. El prototipo permite recorrer los estados y formularios.', 12, '#555b57')
parts.append('</svg>')
(DEST/'composition.svg').write_text('\n'.join(parts), encoding='utf-8')
img.save(DEST/'composition.png')
print('Composición principal actualizada desde el fixture verificado.')


# Vista adicional de presupuesto: misma tipografía y paleta, sin tarjetas nuevas.
W, H = 440, 1000
img = Image.new('RGB', (W,H), '#eceee8')
draw = ImageDraw.Draw(img)
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="budget-title budget-desc">', '<title id="budget-title">Presupuesto diario: 400000 para cuatro días, gasto250000, disponible150000 y tres cupos50000</title>', '<desc id="budget-desc">Composición ilustrada de revisión, no captura de navegador.</desc>']
text(46,34,'FASE 1 / DETALLE DE PRESUPUESTO',12,'#555b57',True)
text(46,69,'Cada día, claro.',28,bold=True)
rect(46,140,348,790,'#f7f7f5',16,'#c7cbc6')
x=68
text(x,163,'Mis viajes',12,'#555b57'); text(x+177,163,'Sincronizado',12,'#555b57')
text(x,211,'Presupuesto',27,bold=True)
text(x,265,'Disponible del viaje',14,'#555b57')
text(x,295,cop(BUDGET['available']),44,'#146347')
text(x,355,'Presupuesto total '+cop(BUDGET['total']),13,'#555b57')
text(x,382,'Gastado '+cop(BUDGET['spent']),13,'#555b57')
line(x,420,x+304)
text(x,446,'Hoy, 21 de noviembre',18,bold=True)
text(x,485,'Cupo asignado',12,'#555b57');text(x+164,485,'Gastado hoy',12,'#555b57')
text(x,512,cop(BUDGET['assigned']),23,bold=True);text(x+164,512,cop(BUDGET['spent']),23,bold=True)
text(x,558,'Exceso de hoy',13,'#555b57');text(x,586,cop(BUDGET['difference']),23,'#795400',True)
line(x,630,x+304)
text(x,656,'Para los próximos días',18,bold=True)
text(x,692,cop(BUDGET['available'])+' para 3 días restantes.',13,'#555b57')
for y,day,amount in zip([738,785,832],['22 nov','23 nov','24 nov'],BUDGET['future']):
    text(x,y,day+' · automático',13)
    text(x+220,y,cop(amount),14,bold=True)
    line(x,y+31,x+304)
line(x-22,890,x+326)
text(x+17,906,'Inicio',11,'#555b57');text(x+122,906,'Balance',11,'#555b57');text(x+227,906,'Actividad',11,'#555b57')
text(46,959,'Referencia ilustrada · sin captura de navegador',12,'#555b57')
parts.append('</svg>')
(DEST/'budget-composition.svg').write_text('\n'.join(parts),encoding='utf-8')
img.save(DEST/'budget-composition.png')
print('Detalle de presupuesto exportado con cifras del mismo fixture.')
