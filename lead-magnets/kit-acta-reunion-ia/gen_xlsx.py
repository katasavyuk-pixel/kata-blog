from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from datetime import date
wb=Workbook()
NAVY='03203D'; INK='071E38'; ICE='EAF2F8'; YEL='FFF8D6'
thin=Side(style='thin',color='DBE7F1'); B=Border(left=thin,right=thin,top=thin,bottom=thin)
def head(ws,row,cols,widths):
    for i,(c,w) in enumerate(zip(cols,widths),1):
        x=ws.cell(row=row,column=i,value=c); x.font=Font(bold=True,color='FFFFFF'); x.fill=PatternFill('solid',fgColor=NAVY); x.alignment=Alignment(vertical='center',wrap_text=True); x.border=B
        ws.column_dimensions[x.column_letter].width=w
    ws.row_dimensions[row].height=30
s=wb.active; s.title='Empieza aquí'
lines=[('Registro de acuerdos y tareas de reuniones',True,16),
('Kit «Acta de reunión con IA» v1.0 (noviembre de 2026) · Kata Savyuk · NBI · kata.ianexora.com',False,9),
('',False,11),
('Para qué sirve: que lo que se acuerda en una reunión no se pierda hasta la siguiente.',False,11),
('1. Al enviar cada acta, copia aquí sus tareas (pestaña «Acuerdos y tareas») y apunta la reunión en «Reuniones».',False,11),
('2. Al empezar la próxima reunión, filtra «Estado» por todo lo que no esté en «Hecho» y repásalo en voz alta: es el primer punto del orden del día.',False,11),
('3. Las filas cuya fecha ya ha pasado y no están hechas se ponen en rojo solas.',False,11),
('4. La fila amarilla es un ejemplo inventado: bórrala.',False,11),
('',False,11),
('Estados: Pendiente · En curso · Hecho · Bloqueado (y escribe en «Notas» qué lo bloquea).',False,11)]
for i,(t,b,sz) in enumerate(lines,1):
    c=s.cell(row=i,column=1,value=t); c.font=Font(bold=b,size=sz,color=INK)
s.column_dimensions['A'].width=120
a=wb.create_sheet('Acuerdos y tareas')
cols=['Nº','Fecha de la reunión','Reunión','Acuerdo o tarea','Quién','Para cuándo','Estado','Hecho el','Notas']
head(a,1,cols,[6,14,24,48,18,14,13,13,36])
ex=[1,date(2026,11,26),'Ejemplo: comité semanal','Pedir dos presupuestos de la nueva impresora','Ana (ejemplo)',date(2026,12,3),'Pendiente',None,'Fila de ejemplo inventada: bórrala']
for j,v in enumerate(ex,1):
    c=a.cell(row=2,column=j,value=v); c.fill=PatternFill('solid',fgColor=YEL); c.border=B
for r in range(2,302):
    a.cell(row=r,column=2).number_format='DD/MM/YYYY'; a.cell(row=r,column=6).number_format='DD/MM/YYYY'; a.cell(row=r,column=8).number_format='DD/MM/YYYY'
    for j in range(1,10): a.cell(row=r,column=j).border=B; a.cell(row=r,column=j).alignment=Alignment(vertical='top',wrap_text=True)
dv=DataValidation(type='list',formula1='"Pendiente,En curso,Hecho,Bloqueado"',allow_blank=True); a.add_data_validation(dv); dv.add('G2:G301')
a.conditional_formatting.add('A2:I301',FormulaRule(formula=['AND($F2<>"",$F2<TODAY(),$G2<>"Hecho")'],fill=PatternFill('solid',fgColor='FDE2E2'),font=Font(color='B91C1C')))
a.conditional_formatting.add('A2:I301',FormulaRule(formula=['$G2="Hecho"'],font=Font(color='5D6979')))
a.freeze_panes='A2'; a.auto_filter.ref='A1:I301'
m=wb.create_sheet('Reuniones')
head(m,1,['Fecha','Reunión','Asistentes','¿Transcrita?','Dónde está el acta','Acta enviada el','Transcripción borrada el'],[14,26,40,22,36,16,22])
exm=[date(2026,11,26),'Ejemplo: comité semanal','Ana, Luis, Marta (ejemplo)','Sí (aviso dado)','[carpeta o enlace]',date(2026,11,26),None]
for j,v in enumerate(exm,1):
    c=m.cell(row=2,column=j,value=v); c.fill=PatternFill('solid',fgColor=YEL); c.border=B
for r in range(2,202):
    for j in (1,6,7): m.cell(row=r,column=j).number_format='DD/MM/YYYY'
    for j in range(1,8): m.cell(row=r,column=j).border=B
dv2=DataValidation(type='list',formula1='"Sí (aviso dado),No (notas a mano)"',allow_blank=True); m.add_data_validation(dv2); dv2.add('D2:D201')
m.freeze_panes='A2'
wb.active=0
wb.save('registro-acuerdos.xlsx')
