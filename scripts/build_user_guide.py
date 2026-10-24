"""Build the standalone HTML and printable PDF from docs/USER_GUIDE.md.

Run: python -m pip install -r requirements-docs.txt
     python scripts/build_user_guide.py

Only standard headings, paragraphs, lists, tables and inline bold/code are
needed by this guide. No network access or frontend credentials are used.
"""
from __future__ import annotations

import base64
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, ListFlowable, ListItem, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'USER_GUIDE.md'
PUBLIC = ROOT / 'public'
NAVY = colors.HexColor('#142d59')
BLUE = colors.HexColor('#173f8a')
MUTED = colors.HexColor('#64748b')
LIGHT = colors.HexColor('#edf3fa')


def inline(text: str, pdf: bool = False) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    if pdf:
        return re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)


def blocks(source: str):
    lines = source.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        heading = re.match(r'^(#{1,3}) (.+)$', line)
        if heading:
            yield ('heading', len(heading[1]), heading[2])
            index += 1
            continue
        if line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                cells = [cell.strip() for cell in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', cell) for cell in cells):
                    rows.append(cells)
                index += 1
            yield ('table', rows)
            continue
        ordered = bool(re.match(r'^\d+\. ', line))
        if ordered or line.startswith('- '):
            items = []
            pattern = r'^\d+\. ' if ordered else r'^- '
            while index < len(lines) and re.match(pattern, lines[index].strip()):
                items.append(re.sub(pattern, '', lines[index].strip()))
                index += 1
            yield ('list', ordered, items)
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not re.match(r'^(#{1,3} |\||- |\d+\. )', lines[index].strip()):
            paragraph.append(lines[index].strip())
            index += 1
        yield ('paragraph', ' '.join(paragraph))


def anchor(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def find_logo() -> Path | None:
    return next((PUBLIC / 'branding' / f'trauts-logo.{ext}' for ext in ('jpg', 'png', 'jpeg')
                 if (PUBLIC / 'branding' / f'trauts-logo.{ext}').exists()), None)


def build_html(content, logo: Path | None):
    entries = [block[2] for block in content if block[0] == 'heading' and block[1] == 2]
    toc = ''.join(f'<li><a href="#{anchor(title)}">{html.escape(title)}</a></li>' for title in entries)
    parts = []
    for block in content:
        kind = block[0]
        if kind == 'heading':
            if block[1] == 1:
                continue
            parts.append(f'<h{block[1]} id="{anchor(block[2])}">{inline(block[2])}</h{block[1]}>')
        elif kind == 'paragraph':
            parts.append(f'<p>{inline(block[1])}</p>')
        elif kind == 'list':
            tag = 'ol' if block[1] else 'ul'
            parts.append(f'<{tag}>' + ''.join(f'<li>{inline(item)}</li>' for item in block[2]) + f'</{tag}>')
        elif kind == 'table':
            header, *rows = block[1]
            parts.append('<div class="table-wrap"><table><thead><tr>' + ''.join(f'<th scope="col">{inline(c)}</th>' for c in header) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in row) + '</tr>' for row in rows) + '</tbody></table></div>')
    image = ''
    if logo:
        mime = 'image/png' if logo.suffix == '.png' else 'image/jpeg'
        encoded = base64.b64encode(logo.read_bytes()).decode('ascii')
        image = f'<img class="logo" src="data:{mime};base64,{encoded}" width="140" height="140" alt="TRAUTS Technologies">'
    document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TRAUTS Shop Manager — User Guide</title>
<style>
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:#edf3fa;color:#172c4c;font:15px/1.75 Arial,sans-serif}}main{{max-width:1000px;margin:30px auto;background:white;padding:42px;border-radius:16px;border:1px solid #e2e8f0}}header{{display:flex;gap:28px;align-items:center;border-bottom:3px solid #173f8a;padding-bottom:24px}}h1{{font-size:30px;line-height:1.3;margin:0 0 8px}}h2{{color:#173f8a;font-size:23px;line-height:1.4;margin-top:42px;border-bottom:1px solid #e2e8f0;padding-bottom:9px;scroll-margin-top:20px}}h3{{font-size:17px;margin:25px 0 10px}}p,li{{overflow-wrap:anywhere}}li{{padding-left:4px;margin:5px 0}}.logo{{object-fit:contain;flex-shrink:0}}.subtitle{{color:#64748b;margin:6px 0}}.tools{{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}}.tools a,.tools button{{background:#173f8a;color:#fff;border:0;border-radius:8px;padding:10px 15px;font:inherit;text-decoration:none;cursor:pointer}}nav{{background:#f3f6fb;padding:20px 24px;border-radius:10px}}nav ol{{columns:2;column-gap:28px;margin-bottom:0;padding-left:20px}}nav li{{break-inside:avoid;font-size:13px}}nav a{{color:#173f8a;text-decoration:none}}table{{width:100%;border-collapse:collapse;font-size:13px;line-height:1.6;margin:15px 0}}td,th{{padding:11px 12px;border:1px solid #e2e8f0;text-align:left;vertical-align:top}}th{{background:#edf3fa}}.table-wrap{{overflow-x:auto}}code{{background:#edf3fa;padding:2px 4px}}footer{{border-top:1px solid #e2e8f0;margin-top:35px;padding-top:15px;color:#64748b;font-size:12px}}a:focus-visible,button:focus-visible{{outline:3px solid #77a6f4;outline-offset:3px}}
@media(max-width:650px){{body{{font-size:14px}}main{{margin:0;padding:22px 17px;border-radius:0}}header{{gap:14px;align-items:start}}.logo{{width:85px;height:85px}}h1{{font-size:23px}}nav ol{{columns:1}}h2{{font-size:21px}}td,th{{padding:8px}}}}
@media print{{body{{background:white;font-size:10pt}}main{{margin:0;padding:0;border:0;max-width:none}}.tools{{display:none}}h2,h3{{break-after:avoid}}tr{{break-inside:avoid}}thead{{display:table-header-group}}a{{color:inherit;text-decoration:none}}nav{{break-after:page}}}}
</style></head><body><main><header>{image}<div><h1>TRAUTS Shop Manager<br>User Guide</h1><p class="subtitle">A practical guide for managers and ordinary workers</p><p class="subtitle">Updated 24 October 2026</p></div></header>
<div class="tools"><a href="./user-guide.pdf" download="TRAUTS-User-Guide.pdf">Download PDF</a><button type="button" onclick="window.print()">Print this guide</button><a href="./">Open the app</a></div>
<nav aria-label="Guide contents"><b>Contents</b><ol>{toc}</ol></nav>
{''.join(parts)}<footer>TRAUTS Technologies · Shop Manager User Guide · Current app functionality, 24 October 2026</footer></main></body></html>'''
    (PUBLIC / 'user-guide.html').write_text(document, encoding='utf-8')


def build_pdf(content, logo: Path | None):
    regular = 'Helvetica'
    bold = 'Helvetica-Bold'
    font_dir = Path('/usr/share/fonts/truetype/dejavu')
    if (font_dir / 'DejaVuSans.ttf').exists():
        pdfmetrics.registerFont(TTFont('Guide', str(font_dir / 'DejaVuSans.ttf')))
        pdfmetrics.registerFont(TTFont('Guide-Bold', str(font_dir / 'DejaVuSans-Bold.ttf')))
        pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='Guide-Bold', italic='Guide', boldItalic='Guide-Bold')
        regular, bold = 'Guide', 'Guide-Bold'
    styles = getSampleStyleSheet()
    body = ParagraphStyle('GuideBody', fontName=regular, fontSize=9, leading=14, textColor=NAVY, spaceAfter=8)
    h2 = ParagraphStyle('GuideSection', parent=body, fontName=bold, fontSize=15, leading=20, textColor=BLUE, spaceBefore=17, spaceAfter=10, keepWithNext=True)
    h3 = ParagraphStyle('GuideTask', parent=body, fontName=bold, fontSize=10.5, leading=15, spaceBefore=10, spaceAfter=7, keepWithNext=True)
    table_body = ParagraphStyle('GuideTable', parent=body, fontSize=8, leading=12, spaceAfter=0)
    table_header = ParagraphStyle('GuideTableHeader', parent=table_body, fontName=bold)
    cover_title = ParagraphStyle('GuideTitle', parent=body, fontName=bold, fontSize=30, leading=39, alignment=TA_CENTER, spaceAfter=17)
    cover_subtitle = ParagraphStyle('GuideSubtitle', parent=body, fontSize=12, leading=19, alignment=TA_CENTER, textColor=MUTED)
    width, height = A4
    margin = 43
    inner = width - margin * 2

    class GuideDoc(BaseDocTemplate):
        def afterFlowable(self, flowable):
            if isinstance(flowable, Paragraph) and flowable.style.name in ('GuideSection', 'GuideTask'):
                title = flowable.getPlainText()
                if title == 'Contents':
                    return
                level = 0 if flowable.style.name == 'GuideSection' else 1
                key = anchor(title)
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(title, key, level, False)
                if level == 0:
                    self.notify('TOCEntry', (0, title, self.page, key))

    doc = GuideDoc(str(PUBLIC / 'user-guide.pdf'), pagesize=A4,
                   leftMargin=margin, rightMargin=margin, topMargin=48, bottomMargin=48,
                   title='TRAUTS Shop Manager — User Guide', author='TRAUTS Technologies')

    def decorate(canvas, document):
        canvas.saveState()
        if document.page > 1:
            canvas.setStrokeColor(colors.HexColor('#dbe3ef'))
            canvas.line(margin, height - 32, width - margin, height - 32)
            canvas.setFillColor(MUTED)
            canvas.setFont(regular, 7)
            canvas.drawString(margin, height - 24, 'TRAUTS SHOP MANAGER · USER GUIDE')
        canvas.setFillColor(MUTED)
        canvas.setFont(regular, 7)
        canvas.drawString(margin, 26, 'TRAUTS Technologies · 24 October 2026')
        canvas.drawRightString(width - margin, 26, f'Page {document.page}')
        canvas.restoreState()

    doc.addPageTemplates(PageTemplate(id='guide', frames=Frame(margin, 48, inner, height - 96, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0), onPage=decorate))
    story = [Spacer(1, 55)]
    if logo:
        image = ImageReader(str(logo))
        img_w, img_h = image.getSize()
        story += [Image(str(logo), width=185, height=185 * img_h / img_w), Spacer(1, 25)]
    story += [Paragraph('TRAUTS Shop Manager<br/>User Guide', cover_title),
              Paragraph('A practical guide for managers<br/>and ordinary workers', cover_subtitle),
              Spacer(1, 25), Paragraph('Updated 24 October 2026', cover_subtitle),
              Spacer(1, 35), Paragraph('Every page, everyday tasks, and clear explanations<br/>of what happens when you save.', cover_subtitle), PageBreak()]
    toc = TableOfContents()
    toc.levelStyles = [ParagraphStyle('GuideContents', parent=body, fontSize=10, leading=19, leftIndent=0, firstLineIndent=0, spaceBefore=3)]
    story += [Paragraph('Contents', h2), toc, PageBreak()]
    for block in content:
        kind = block[0]
        if kind == 'heading':
            if block[1] != 1:
                story.append(Paragraph(inline(block[2], True), h2 if block[1] == 2 else h3))
        elif kind == 'paragraph':
            story.append(Paragraph(inline(block[1], True), body))
        elif kind == 'list':
            items = [ListItem(Paragraph(inline(item, True), body), leftIndent=12) for item in block[2]]
            story.append(ListFlowable(items, bulletType='1' if block[1] else 'bullet', start='1' if block[1] else None, leftIndent=18, bulletFontName=regular, bulletFontSize=8, spaceAfter=7))
        elif kind == 'table':
            rows = [[Paragraph(inline(cell, True), table_header if index == 0 else table_body) for cell in row] for index, row in enumerate(block[1])]
            count = len(rows[0])
            widths = [inner * .44, inner * .28, inner * .28] if count == 3 else [inner * .32, inner * .68]
            if count not in (2, 3):
                widths = [inner / count] * count
            table = Table(rows, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), LIGHT),
                ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#dbe3ef')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ]))
            story += [table, Spacer(1, 10)]
    doc.multiBuild(story)


def main():
    PUBLIC.mkdir(exist_ok=True)
    content = list(blocks(SOURCE.read_text(encoding='utf-8')))
    logo = find_logo()
    build_html(content, logo)
    build_pdf(content, logo)
    print(f'Created {PUBLIC / "user-guide.html"}')
    print(f'Created {PUBLIC / "user-guide.pdf"}')


if __name__ == '__main__':
    main()
