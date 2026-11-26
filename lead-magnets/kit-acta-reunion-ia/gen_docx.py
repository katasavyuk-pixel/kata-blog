import re
from docx import Document
from docx.shared import Pt, RGBColor, Mm
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
INK=RGBColor(0x07,0x1e,0x38); NAVY7=RGBColor(0x12,0x47,0x6c); MUTE=RGBColor(0x5d,0x69,0x79)
d=Document()
sec=d.sections[0]; sec.page_width=Mm(210); sec.page_height=Mm(297)
for m in ('left_margin','right_margin'): setattr(sec,m,Mm(20))
sec.top_margin=Mm(18); sec.bottom_margin=Mm(18)
st=d.styles['Normal']; st.font.name='Calibri'; st.font.size=Pt(10.5); st.font.color.rgb=INK
st.element.rPr.rFonts.set(qn('w:eastAsia'),'Calibri')
def runs(p,text,bold=False,size=None,color=None):
    for part in re.split(r'(\[[^\]]+\])',text):
        if not part: continue
        r=p.add_run(part); r.bold=bold
        if size: r.font.size=Pt(size)
        if color: r.font.color.rgb=color
        if part.startswith('['): r.font.highlight_color=WD_COLOR_INDEX.YELLOW
    return p
def para(t,**k):
    p=d.add_paragraph(); p.paragraph_format.space_after=Pt(4); return runs(p,t,**k)
def h(t):
    p=d.add_paragraph(); p.paragraph_format.space_before=Pt(7); p.paragraph_format.space_after=Pt(3); runs(p,t,bold=True,size=12,color=NAVY7)
def bullet(t):
    p=d.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(2); runs(p,t)
_n=[0]
def num(t,reset=False):
    if reset: _n[0]=0
    _n[0]+=1; p=d.add_paragraph(); p.paragraph_format.space_after=Pt(2); p.paragraph_format.left_indent=Mm(5); runs(p,f'{_n[0]}.  '+t)
def shade(cell,hexc):
    tcPr=cell._tc.get_or_add_tcPr(); s=OxmlElement('w:shd'); s.set(qn('w:val'),'clear'); s.set(qn('w:color'),'auto'); s.set(qn('w:fill'),hexc); tcPr.append(s)
def table(rows,header=True,widths=None):
    t=d.add_table(rows=len(rows),cols=len(rows[0])); t.style='Table Grid'
    for i,row in enumerate(rows):
        for j,val in enumerate(row):
            c=t.cell(i,j); c.text=''; runs(c.paragraphs[0],val,bold=(header and i==0),size=9.5)
            if header and i==0: shade(c,'EAF2F8')
            if widths: c.width=Mm(widths[j])
    if widths:
        t.autofit=False
        for j,w in enumerate(widths): t.columns[j].width=Mm(w)
    d.add_paragraph().paragraph_format.space_after=Pt(2)
    return t
hdr=sec.header.paragraphs[0]; hdr.add_run().add_picture('logo-horizontal.png',height=Mm(8))
fp=sec.footer.paragraphs[0]; r=fp.add_run('Plantilla del kit «Acta de reunión con IA» v1.0 (noviembre de 2026) · Nexora Business Intelligence (NBI) · kata.ianexora.com · Para reuniones de trabajo. Borra este pie y el logo al usarla.'); r.font.size=Pt(7.5); r.font.color.rgb=MUTE
p=d.add_paragraph(); runs(p,'Acta de la reunión: [MOTIVO DE LA REUNIÓN]',bold=True,size=18)
para('Rellena lo marcado en amarillo. Si la IA ha preparado el borrador, pega aquí su texto y comprueba cada apartado con la lista del final antes de enviarla.',color=MUTE,size=9)
table([['Fecha y hora','[dd/mm/aaaa, de hh:mm a hh:mm]'],['Lugar','[sala / Teams / Meet / teléfono]'],['Asistentes','[nombre y cargo de cada persona]'],['Excusan asistencia','[nombres o «nadie»]'],['Redacta','[nombre]'],['¿Se transcribió?','[sí, con aviso al empezar / no, notas a mano]']],header=False,widths=[45,125])
h('1. Orden del día')
num('[Punto 1]',reset=True); num('[Punto 2]'); num('[Punto 3]')
h('2. Puntos tratados')
para('[1. Punto]. [Dos o tres líneas: qué se habló y en qué quedó. Sin citas literales.]')
para('[2. Punto]. [Resumen.]')
h('3. Acuerdos')
para('Solo lo que se decidió. Lo que quedó en propuesta va en el apartado 5.',color=MUTE,size=9)
num('[Acuerdo, en una frase.]',reset=True); num('[Acuerdo.]')
h('4. Tareas')
table([['Qué','Quién','Para cuándo'],['[tarea]','[persona]','[dd/mm/aaaa]'],['[tarea]','[persona]','[dd/mm/aaaa]'],['','',''],['','','']],widths=[100,40,30])
para('Pásalas al registro de acuerdos (Excel del kit) y se repasan al empezar la próxima reunión.',color=MUTE,size=9)
h('5. Pendiente de decidir')
bullet('[Tema] · [qué falta para decidirlo y quién lo trae]')
h('6. Próxima reunión')
para('[dd/mm/aaaa, hora y lugar, o «sin fecha»]')
h('Antes de enviarla: seis comprobaciones')
for t in ['Los nombres y cargos de los asistentes están bien escritos.',
          'Cada acuerdo se decidió de verdad: compáralo con la ronda de cierre.',
          'Cada tarea tiene quién y para cuándo, y esa persona la aceptó.',
          'Cifras, importes y fechas: búscalos en la transcripción, uno a uno.',
          'No queda ninguna marca REVISAR, SIN RESPONSABLE ni SIN FECHA sin resolver.',
          'No consta nada que no deba: datos personales que no hacen falta, comentarios fuera de lugar, lo que alguien pidió dejar fuera.']:
    p=d.add_paragraph(); p.paragraph_format.space_after=Pt(2); runs(p,'☐  '+t)
para('Revisada por [nombre] el [dd/mm/aaaa].',bold=True)
d.save('plantilla-acta.docx')
