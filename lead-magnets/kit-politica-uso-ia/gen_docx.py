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
    p=d.add_paragraph(); p.paragraph_format.space_before=Pt(10); p.paragraph_format.space_after=Pt(3); runs(p,t,bold=True,size=12,color=NAVY7)
def bullet(t):
    p=d.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(2); runs(p,t)
def shade(cell,hexc):
    tcPr=cell._tc.get_or_add_tcPr(); s=OxmlElement('w:shd'); s.set(qn('w:val'),'clear'); s.set(qn('w:color'),'auto'); s.set(qn('w:fill'),hexc); tcPr.append(s)
def table(rows,header=True,widths=None):
    t=d.add_table(rows=len(rows),cols=len(rows[0])); t.style='Table Grid'
    for i,row in enumerate(rows):
        for j,val in enumerate(row):
            c=t.cell(i,j); c.text=''; runs(c.paragraphs[0],val,bold=(header and i==0),size=9.5)
            if header and i==0: shade(c,'EAF2F8')
            if widths: c.width=Mm(widths[j])
    d.add_paragraph().paragraph_format.space_after=Pt(2)
    return t
hdr=sec.header.paragraphs[0]; hdr.add_run().add_picture('logo-horizontal.png',height=Mm(8))
fp=sec.footer.paragraphs[0]; r=fp.add_run('Modelo del «Kit de política de uso de IA» v1.0 (noviembre de 2026) · Nexora Business Intelligence (NBI) · kata.ianexora.com · No es asesoramiento jurídico: adáptalo y, si tratas datos sensibles, revísalo con tu asesor. Borra este pie y el logo al adaptarlo.'); r.font.size=Pt(7.5); r.font.color.rgb=MUTE
p=d.add_paragraph(); runs(p,'Política de uso de inteligencia artificial de [EMPRESA]',bold=True,size=18)
para('Rellena lo marcado en amarillo y borra lo que no aplique. Si algo no es verdad en tu empresa, no lo escribas.',color=MUTE,size=9)
table([['Versión','1.0','Aprobada por','[nombre y cargo]'],['Fecha','[dd/mm/aaaa]','Responsable y contacto','[nombre, teléfono]'],['Próxima revisión','[dd/mm/aaaa]','Dónde está la versión vigente','[carpeta o enlace]']],header=False)
h('1. Para qué sirve')
para('Usamos la IA para trabajar mejor y más rápido, sin poner en riesgo los datos de clientes, de compañeros ni de la empresa. Esta política dice qué herramientas usamos, con qué datos, quién revisa lo que sale y a quién preguntar. Se aplica a toda persona que trabaje para [EMPRESA], también en prácticas o como colaborador externo, en cualquier dispositivo.')
h('2. Herramientas autorizadas')
para('Para trabajar, solo estas, y siempre con la cuenta de la empresa:')
table([['Herramienta y plan','Para qué','Quién','Datos hasta'],['[p. ej. plan de empresa de un asistente de IA]','[redactar, resumir, traducir]','[todo el equipo]','[ámbar]'],['[otra herramienta]','[uso concreto]','[equipo]','[verde]']])
bullet('Nada de cuentas personales de IA para trabajo de la empresa.')
bullet('No se conecta el correo, la agenda ni las carpetas de la empresa a una cuenta personal de IA.')
bullet('Una herramienta, extensión o conector nuevo solo entra si lo aprueba [responsable], y se apunta en el registro con su fecha.')
h('3. El semáforo de datos')
para('Antes de pegar, subir o dictar algo a una IA, mira su color. Si dudas, es rojo.',bold=True)
table([['Color','Qué es','Dónde se puede usar'],['Verde','Lo público: la web, el catálogo, la normativa publicada, los textos que ya hemos publicado.','En cualquier herramienta autorizada.'],['Ámbar','Lo interno sin datos personales: procedimientos, borradores, propuestas, cifras sin nombres.','Solo en las herramientas autorizadas para ámbar, con la cuenta de empresa.'],['Rojo','Datos personales de clientes o empleados (nombre, DNI/NIE, teléfono, cuenta bancaria), salud, nóminas, contratos, expedientes, contraseñas y claves, secretos de la empresa. [Añade los de tu sector.]','No se usa con IA, salvo autorización por escrito de [responsable] en una herramienta aprobada para ello.']])
para('Para consultar un caso, se plantea como ficticio («Cliente A», «Empresa B»), sin datos que permitan reconocer a nadie.')
h('4. Todo lo que sale de la IA lo revisa una persona')
para('La IA se equivoca con seguridad: inventa datos, cifras, citas y normas que suenan ciertas. Quien envía, publica o firma algo hecho con IA responde de ello igual que si lo hubiera escrito sin ayuda.')
bullet('Cifras, nombres, fechas, importes y citas se comprueban en la fuente original.')
bullet('Nada sale hacia un cliente sin que alguien lo haya leído entero.')
h('5. Agentes y automatizaciones: la IA prepara, una persona aprueba')
bullet('Un agente o automatización con IA que envía, publica, comparte, borra, paga o contrata deja la acción como borrador hasta que una persona la aprueba.')
bullet('Solo los permisos imprescindibles para su tarea. Nada de «permitir siempre» sin entender qué permite.')
bullet('Sabemos cómo pararlo y cómo quitarle los accesos.')
h('6. Lo que no se hace con IA')
bullet('Decidir sobre personas (contratar, evaluar, despedir, conceder o negar un servicio) solo con lo que diga la IA.')
bullet('Crear imágenes, vídeos o voces de personas reales sin su permiso.')
bullet('Usos prohibidos por el Reglamento Europeo de IA, como manipular a personas o reconocer las emociones de los trabajadores.')
bullet('Meter datos rojos fuera de lo autorizado.')
h('7. Con clientes, claridad')
para('Si un asistente automático atiende a clientes, dice que es una IA y ofrece hablar con una persona. Si un contenido se ha generado con IA y puede confundir, se indica.')
h('8. Si algo sale mal, se avisa el mismo día')
para('Si se ha pegado un dato rojo donde no tocaba, o una IA ha hecho algo que no debía, se avisa a [responsable] ese mismo día, sin borrar nada antes. Avisar no es el problema; callarlo, sí. Se apunta en el registro de incidencias.')
h('9. Formación')
para('Cada persona recibe una charla de unos 20 minutos antes de usar IA para trabajar, y una actualización cuando entra una herramienta nueva o cambia esta política. Se apunta en el registro de formación.')
h('10. Revisión')
para('Revisamos esta política cada [12] meses y siempre que entre una herramienta nueva o cambien sus condiciones. Cada [3] meses, [responsable] comprueba qué herramientas y conexiones se usan de verdad.')
h('Recibí y entendí')
para('He leído esta política, he podido preguntar mis dudas y la cumpliré.')
table([['Nombre','Puesto','Fecha','Firma'],['','','',''],['','','',''],['','','','']])
d.save('politica.docx')
