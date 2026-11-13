"""Generate real office/PDF history exports; JSON input on stdin, binary stdout."""
import io
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

HEADERS = ["Recorded at", "Audio file", "Model", "AI score (%)", "Prediction"]
NOTE = "Experimental model scores are not proof of a recording's origin. Dates include their stored timezone."


def values(record):
    return [record.get(k, "") for k in ("date", "filename", "model", "score", "prediction")]


def build(records, kind):
    output = io.BytesIO()
    if kind == "xlsx":
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        from openpyxl.worksheet.table import Table, TableStyleInfo
        book = Workbook(); sheet = book.active; sheet.title = "Detection history"
        sheet.append(["VoiceGuard detection history"])
        sheet.append([NOTE]);sheet.append(HEADERS)
        for row in records:
            sheet.append(values(row))
            for cell in sheet[sheet.max_row]:
                if isinstance(cell.value,str): cell.data_type = "s"
                cell.alignment = Alignment(vertical="top",wrap_text=True)
            sheet.cell(sheet.max_row,4).number_format = '0.000"%"'
            sheet.row_dimensions[sheet.max_row].height = 42
        for cell in sheet[3]:
            cell.font=Font(color="FFFFFF",bold=True);cell.fill=PatternFill("solid",fgColor="191533")
        sheet["A1"].font=Font(size=18,bold=True,color="191533")
        sheet.merge_cells("A1:E1");sheet.merge_cells("A2:E2");sheet["A2"].alignment=Alignment(wrap_text=True)
        sheet.row_dimensions[2].height=32
        for col,width in zip("ABCDE",[28,42,30,18,24]):sheet.column_dimensions[col].width=width
        if records:
            table=Table(displayName="VoiceGuardHistory",ref=f"A3:E{sheet.max_row}")
            table.tableStyleInfo=TableStyleInfo(name="TableStyleMedium2",showRowStripes=True)
            sheet.add_table(table)
        sheet.freeze_panes="A4";sheet.sheet_properties.pageSetUpPr.fitToPage=True
        sheet.page_setup.orientation="landscape";sheet.page_setup.fitToWidth=1;sheet.page_setup.fitToHeight=0
        book.save(output)
    elif kind == "docx":
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        doc=Document();section=doc.sections[0]
        section.top_margin=section.bottom_margin=Inches(.65)
        section.left_margin=section.right_margin=Inches(.65)
        doc.styles['Normal'].font.name='Calibri';doc.styles['Normal'].font.size=Pt(10)
        title=doc.add_paragraph("VoiceGuard detection history",style="Title")
        for run in title.runs:run.font.color.rgb=RGBColor(0,0,0)
        doc.add_paragraph(f"This report contains {len(records)} exported analysis records.")
        doc.add_paragraph(NOTE)
        # Record blocks remain readable for long filenames and narrow pages.
        for index,record in enumerate(records,1):
            p=doc.add_paragraph(f"Analysis {index}",style="Heading 2")
            p.paragraph_format.keep_with_next=True
            for label,value in zip(HEADERS,values(record)):
                p=doc.add_paragraph();p.add_run(label+": ").bold=True
                p.add_run(f"{value:.3f}" if isinstance(value,(float,int)) else str(value))
        doc.save(output)
    elif kind == "pdf":
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        font="Helvetica"
        font_path=Path("C:/Windows/Fonts/arial.ttf")
        if font_path.exists():pdfmetrics.registerFont(TTFont("VoiceGuardText",str(font_path)));font="VoiceGuardText"
        styles=getSampleStyleSheet()
        for style in styles.byName.values():style.fontName=font
        styles['BodyText'].fontSize=9;styles['BodyText'].leading=13
        styles['BodyText'].wordWrap='CJK'
        story=[Paragraph("VoiceGuard detection history",styles['Title']),
               Paragraph(f"{len(records)} exported analysis records. {NOTE}",styles['BodyText']),Spacer(1,16)]
        rows=[[Paragraph(escape(h),styles['BodyText']) for h in HEADERS]]
        for record in records:
            rows.append([Paragraph(escape(f"{v:.3f}" if isinstance(v,(float,int)) else str(v)),styles['BodyText']) for v in values(record)])
        table=Table(rows,colWidths=[132,205,145,70,170],repeatRows=1,hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dce6ee')),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f2f4f8')]),
            ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),
            ('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
        story.append(table)
        def footer(canvas,doc):
            canvas.setFont(font,8);canvas.drawRightString(800,20,f"VoiceGuard | Page {doc.page}")
        SimpleDocTemplate(output,pagesize=landscape(A4),leftMargin=40,rightMargin=40,
                          topMargin=34,bottomMargin=34,title="VoiceGuard detection history").build(story,onFirstPage=footer,onLaterPages=footer)
    else:
        raise ValueError("Unsupported export format")
    return output.getvalue()


if __name__ == "__main__":
    data=json.load(sys.stdin)
    sys.stdout.buffer.write(build(data['records'],sys.argv[1]))
