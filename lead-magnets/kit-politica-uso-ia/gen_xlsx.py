from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.drawing.image import Image as XImg
INK='071E38'; NAVY='03203D'; ICE2='EAF2F8'; EX='FFF8D6'
thin=Side(style='thin',color='DBE7F1'); B=Border(left=thin,right=thin,top=thin,bottom=thin)
H=Font(name='Calibri',bold=True,color='FFFFFF',size=11); HF=PatternFill('solid',fgColor=NAVY)
wb=Workbook()
ws=wb.active; ws.title='Empieza aquí'
img=XImg('logo-horizontal.png'); img.width=188; img.height=50; ws.add_image(img,'B2')
ws.column_dimensions['A'].width=3; ws.column_dimensions['B'].width=110
lines=[('Registro de IA de [EMPRESA]',Font(bold=True,size=18,color=INK)),
('Kit de política de uso de IA v1.0 · Nexora Business Intelligence (NBI) · kata.ianexora.com',Font(size=9,color='5D6979')),
('',None),
('Para qué sirve',Font(bold=True,size=12,color='12476C')),
('Es la prueba, para ti y para quien pregunte, de que tu empresa ha tomado medidas: qué IA está autorizada, quién ha recibido la formación y qué incidencias ha habido.',None),
('La Comisión Europea indica que para el artículo 4 del Reglamento de IA no hace falta certificado: basta un registro interno de las formaciones u otras iniciativas (FAQ «AI Literacy», consultada el 23/11/2026).',None),
('',None),
('Cómo se usa',Font(bold=True,size=12,color='12476C')),
('1. Herramientas: una fila por cada IA que se usa de verdad, autorizada o no. Lo no autorizado se aprueba o se sustituye.',None),
('2. Formación: una fila por persona y sesión (charla de 20 minutos, lectura firmada de la política, herramienta nueva).',None),
('3. Incidencias: una fila cada vez que algo sale donde no debía o una IA hace algo que no tocaba. Avisar el mismo día; apuntar después.',None),
('4. Cada tres meses: revisa las tres pestañas y actualiza la columna «Comprobado el».',None),
('',None),
('Las filas en amarillo son ejemplos inventados para ver cómo se rellena. Bórralas cuando empieces.',Font(italic=True,color='A35C05')),
('No es asesoramiento jurídico. Si tratas datos sensibles, revisa tu caso con tu asesor o tu delegado de protección de datos.',Font(size=9,color='5D6979'))]
for i,(t,f) in enumerate(lines,start=6):
    c=ws.cell(row=i,column=2,value=t); c.alignment=Alignment(wrap_text=True,vertical='top')
    if f: c.font=f
ws.sheet_view.showGridLines=False
def sheet(name,cols,example,validations,widths):
    s=wb.create_sheet(name)
    for j,(c,w) in enumerate(zip(cols,widths),start=1):
        x=s.cell(row=1,column=j,value=c); x.font=H; x.fill=HF; x.alignment=Alignment(wrap_text=True,vertical='center'); x.border=B
        s.column_dimensions[x.column_letter].width=w
    s.row_dimensions[1].height=36
    for j,v in enumerate(example,start=1):
        x=s.cell(row=2,column=j,value=v); x.fill=PatternFill('solid',fgColor=EX); x.alignment=Alignment(wrap_text=True,vertical='top'); x.border=B
    for r in range(3,103):
        for j in range(1,len(cols)+1):
            x=s.cell(row=r,column=j); x.border=B; x.alignment=Alignment(wrap_text=True,vertical='top')
    for col,opts in validations.items():
        dv=DataValidation(type='list',formula1='"'+','.join(opts)+'"',allow_blank=True); s.add_data_validation(dv); dv.add(f'{col}2:{col}102')
    s.freeze_panes='A2'
    return s
sheet('Herramientas',['Herramienta','Plan / tipo de cuenta','Estado','Para qué se usa','Quién la usa','Datos hasta (color)','¿Usa las conversaciones para entrenar?','¿Contrato de encargado (DPA)?','¿Conectada a correo, agenda o carpetas?','Aprobada por','Fecha de aprobación','Comprobado el','Notas'],
 ['EJEMPLO · Asistente de chat','Plan de empresa','Autorizada','Redactar borradores y resumir documentos','Todo el equipo','Ámbar','No (desactivado para todo el equipo)','Sí','No','[responsable]','01/12/2026','01/12/2026','Se revisa cada 3 meses'],
 {'C':['Autorizada','En prueba','No autorizada','Retirada'],'F':['Verde','Ámbar','Rojo (autorizado por escrito)'],'G':['Sí','No','No (desactivado)','No lo sé aún'],'H':['Sí','No','No aplica'],'I':['Sí','No']},
 [26,20,14,30,16,16,20,16,18,16,14,14,28])
sheet('Formación',['Fecha','Persona','Puesto','Qué recibió','Duración (min)','Impartida por','¿Firmó la política?','¿Respondió las 5 preguntas?','Herramientas que va a usar','Notas'],
 ['01/12/2026','EJEMPLO · Persona A','Administración','Charla de 20 minutos + lectura de la política',20,'[responsable]','Sí','Sí','Asistente de chat (plan de empresa)','Primera sesión'],
 {'D':['Charla de 20 minutos + lectura de la política','Lectura de la política (versión nueva)','Herramienta nueva','Repaso trimestral'],'G':['Sí','No','Pendiente'],'H':['Sí','No','Pendiente']},
 [12,22,18,34,12,16,14,16,28,28])
sheet('Incidencias',['Fecha','Quién avisa','Qué pasó','Color del dato','Herramienta','Qué se hizo','¿Hay que avisar a alguien más? (asesor, DPD, cliente)','Cerrada el','Qué cambiamos para que no se repita'],
 ['03/12/2026','EJEMPLO · Persona B','Pegó en el asistente un correo con nombre y teléfono de un cliente','Rojo','Asistente de chat (plan de empresa)','Se borró la conversación desde los ajustes y se avisó al responsable el mismo día','Consultado con el asesor','03/12/2026','Ejemplo de caso ficticio añadido a la charla'],
 {'D':['Verde','Ámbar','Rojo']},
 [12,18,40,12,22,40,26,12,36])
wb.save('registro.xlsx')
