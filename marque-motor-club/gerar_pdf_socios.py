#!/usr/bin/env python3
"""MARQUE Motor Club — PDF premium para sócios (identidade da marca)."""

from pathlib import Path

from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
    KeepTogether,
    Flowable,
    NextPageTemplate,
)

BASE = Path(__file__).resolve().parent
LOGO_LIGHT = BASE / "marque-motor-club-logo.png"
LOGO_TRANS = BASE / "marque-logo-transparent.png"
ARTE = BASE / "marque-instagram-v3-full-name.png"
OUT = BASE / "MARQUE-Apresentacao-Socios.pdf"
OUT_ARTIFACT = Path("/opt/cursor/artifacts/MARQUE-Apresentacao-Socios.pdf")
OUT_ARTIFACT_ALT = Path("/opt/cursor/artifacts/MARQUE-Motor-Club-Apresentacao-Socios.pdf")

# Identidade MARQUE
INK = HexColor("#141414")
GRAPHITE = HexColor("#1C1C1E")
CHARCOAL = HexColor("#2A2A2C")
SILVER = HexColor("#A8A8B0")
SILVER_DARK = HexColor("#6E6E76")
GOLD = HexColor("#9C8460")
GOLD_SOFT = HexColor("#C4A97A")
IVORY = HexColor("#F4F1EA")
IVORY_DARK = HexColor("#E8E3D8")
SOFT = HexColor("#F7F5F0")
WHITE = white

W, H = A4


class GoldRule(Flowable):
    def __init__(self, width=None, thick=0.8, space_before=2, space_after=10, color=GOLD):
        super().__init__()
        self._width = width
        self.thick = thick
        self.space_before = space_before
        self.space_after = space_after
        self.color = color
        self.height = space_before + thick + space_after

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        return self.width, self.height

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thick)
        y = self.space_after
        self.canv.line(0, y + self.thick / 2, self.width, y + self.thick / 2)


class DarkBand(Flowable):
    """Full-bleed-ish dark band with title (within frame)."""

    def __init__(self, title, subtitle="", height=28 * mm):
        super().__init__()
        self.title = title
        self.subtitle = subtitle
        self.band_h = height

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        self.height = self.band_h
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(GRAPHITE)
        c.rect(0, 0, self.width, self.band_h, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.line(0, self.band_h - 1, self.width, self.band_h - 1)
        c.setFillColor(GOLD_SOFT)
        c.setFont("Helvetica", 8)
        c.drawString(4 * mm, self.band_h - 8 * mm, "MARQUE MOTOR CLUB")
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(4 * mm, 10 * mm, self.title)
        if self.subtitle:
            c.setFillColor(SILVER)
            c.setFont("Helvetica", 8)
            c.drawString(4 * mm, 5 * mm, self.subtitle)


class QuoteBox(Flowable):
    def __init__(self, text, width=None):
        super().__init__()
        self.text = text
        self._width = width

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        # estimate height
        self.para = Paragraph(
            self.text,
            ParagraphStyle(
                "qb",
                fontName="Helvetica-Oblique",
                fontSize=10.5,
                leading=15,
                textColor=CHARCOAL,
            ),
        )
        w, h = self.para.wrap(self.width - 14 * mm, availHeight)
        self._ph = h
        self.height = h + 12 * mm
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(IVORY_DARK)
        c.roundRect(0, 0, self.width, self.height, 2, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(2.2)
        c.line(2.5 * mm, 3 * mm, 2.5 * mm, self.height - 3 * mm)
        self.para.drawOn(c, 7 * mm, 5 * mm)


class KeyStat(Flowable):
    def __init__(self, value, label, width=52 * mm, height=28 * mm):
        super().__init__()
        self.value = value
        self.label = label
        self._w = width
        self._h = height

    def wrap(self, availWidth, availHeight):
        self.width = self._w
        self.height = self._h
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(GRAPHITE)
        c.roundRect(0, 0, self.width, self.height, 2, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.8)
        c.line(4 * mm, self.height - 3 * mm, self.width - 4 * mm, self.height - 3 * mm)
        c.setFillColor(GOLD_SOFT)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(self.width / 2, 14 * mm, self.value)
        c.setFillColor(SILVER)
        c.setFont("Helvetica", 7)
        c.drawCentredString(self.width / 2, 7 * mm, self.label.upper())


def styles():
    s = {}
    s["h1"] = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=INK,
        spaceAfter=6,
    )
    s["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=INK,
        spaceBefore=8,
        spaceAfter=6,
    )
    s["eyebrow"] = ParagraphStyle(
        "eyebrow",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=GOLD,
        spaceAfter=4,
    )
    s["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=CHARCOAL,
        alignment=TA_JUSTIFY,
        spaceAfter=7,
    )
    s["bodyLeft"] = ParagraphStyle(
        "bodyLeft",
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=CHARCOAL,
        alignment=TA_LEFT,
        spaceAfter=5,
    )
    s["bullet"] = ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=CHARCOAL,
        leftIndent=2 * mm,
        spaceAfter=3,
    )
    s["th"] = ParagraphStyle(
        "th",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=WHITE,
    )
    s["td"] = ParagraphStyle(
        "td",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=CHARCOAL,
    )
    s["tdBold"] = ParagraphStyle(
        "tdBold",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11.5,
        textColor=INK,
    )
    s["caption"] = ParagraphStyle(
        "caption",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=SILVER_DARK,
        alignment=TA_CENTER,
        spaceBefore=3,
        spaceAfter=8,
    )
    s["smallGold"] = ParagraphStyle(
        "smallGold",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=GOLD,
        alignment=TA_CENTER,
    )
    return s


def bullets(items, st):
    return [Paragraph(f"<font color='#9C8460'>▸</font>  {i}", st["bullet"]) for i in items]


def premium_table(rows, col_widths):
    data = []
    for r_i, row in enumerate(rows):
        line = []
        for cell in row:
            if r_i == 0:
                line.append(Paragraph(str(cell), styles()["th"]))
            else:
                style = styles()["tdBold"] if str(cell).startswith("<b>") or "R$" in str(cell) and "Total" in str(row[0]) else styles()["td"]
                line.append(Paragraph(str(cell), style))
        data.append(line)

    # fix bold detection simply
    data = []
    st = styles()
    for r_i, row in enumerate(rows):
        line = []
        for c_i, cell in enumerate(row):
            if r_i == 0:
                line.append(Paragraph(cell, st["th"]))
            else:
                line.append(Paragraph(cell, st["td"]))
        data.append(line)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), GRAPHITE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, IVORY_DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, GOLD),
    ]
    # zebra
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), HexColor("#FAF8F3")))
    t.setStyle(TableStyle(style_cmds))
    return t


def draw_cover(c: canvas.Canvas, doc):
    c.saveState()
    # dark full page
    c.setFillColor(GRAPHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # gold frame
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.7)
    margin = 12 * mm
    c.rect(margin, margin, W - 2 * margin, H - 2 * margin, fill=0, stroke=1)
    c.setLineWidth(0.35)
    c.setStrokeColor(HexColor("#3A3A3C"))
    c.rect(margin + 2.5 * mm, margin + 2.5 * mm, W - 2 * margin - 5 * mm, H - 2 * margin - 5 * mm, fill=0, stroke=1)

    # top label
    c.setFillColor(GOLD_SOFT)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, H - 28 * mm, "DOCUMENTO CONFIDENCIAL  ·  SÓCIOS & PARCEIROS")

    # logo
    logo_path = LOGO_TRANS if LOGO_TRANS.exists() else LOGO_LIGHT
    if logo_path.exists():
        c.drawImage(
            str(logo_path),
            W / 2 - 28 * mm,
            H / 2 + 8 * mm,
            width=56 * mm,
            height=56 * mm,
            mask="auto",
            preserveAspectRatio=True,
            anchor="c",
        )

    # title block
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(W / 2, H / 2 - 18 * mm, "MARQUE")
    c.setFillColor(GOLD_SOFT)
    c.setFont("Helvetica", 11)
    c.drawCentredString(W / 2, H / 2 - 26 * mm, "M O T O R   C L U B")

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(W / 2 - 28 * mm, H / 2 - 32 * mm, W / 2 + 28 * mm, H / 2 - 32 * mm)

    c.setFillColor(SILVER)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W / 2, H / 2 - 42 * mm, "Apresentação estratégica para sócios")
    c.drawCentredString(W / 2, H / 2 - 48 * mm, "Cascavel · Alpi Motors")

    # bottom meta
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W / 2, 32 * mm, "JANTAR DE FUNDAÇÃO  ·  12.10.2026")
    c.setFillColor(SILVER_DARK)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, 24 * mm, "20 vagas  ·  Anuidade  ·  Seleção por indicação")
    c.restoreState()


def draw_inner(c: canvas.Canvas, doc):
    c.saveState()
    # ivory background
    c.setFillColor(SOFT)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # top gold thin bar
    c.setFillColor(GRAPHITE)
    c.rect(0, H - 14 * mm, W, 14 * mm, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.line(0, H - 14 * mm, W, H - 14 * mm)

    c.setFillColor(GOLD_SOFT)
    c.setFont("Helvetica", 7.5)
    c.drawString(16 * mm, H - 8.5 * mm, "MARQUE MOTOR CLUB")
    c.setFillColor(SILVER)
    c.drawRightString(W - 16 * mm, H - 8.5 * mm, "CASCAVEL  ·  ALPI MOTORS")

    # footer
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.line(16 * mm, 12 * mm, W - 16 * mm, 12 * mm)
    c.setFillColor(SILVER_DARK)
    c.setFont("Helvetica", 7)
    c.drawString(16 * mm, 7 * mm, "Uso interno · confidencial")
    c.setFillColor(GOLD)
    c.drawRightString(W - 16 * mm, 7 * mm, f"{doc.page:02d}")
    c.restoreState()


def build():
    st = styles()
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        title="MARQUE Motor Club — Apresentação para Sócios",
        author="MARQUE Motor Club",
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
    )

    frame_cover = Frame(0, 0, W, H, id="cover")
    frame_inner = Frame(
        16 * mm,
        16 * mm,
        W - 32 * mm,
        H - 36 * mm,
        id="inner",
    )

    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame_cover], onPage=draw_cover),
            PageTemplate(id="inner", frames=[frame_inner], onPage=draw_inner),
        ]
    )

    story = []
    story.append(NextPageTemplate("inner"))
    story.append(PageBreak())

    # 01
    story.append(Paragraph("01  —  CONTEXTO", st["eyebrow"]))
    story.append(Paragraph("A oportunidade em Cascavel", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "A referência é o <b>Benzin Motor Club</b> (São Paulo): clube automotivo premium "
            "que cresce por <b>seleção</b>, não por volume. O valor está em exclusividade, "
            "experiências únicas e um círculo alinhado — nunca em desconto de oficina ou "
            "grupo aberto de WhatsApp.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Em Cascavel já existem <b>local</b> (Alpi Motors) e <b>parceiros</b>. "
            "O MARQUE formaliza o círculo com identidade própria, critério e modelo financeiro claro. "
            "A Alpi deixa de ser só ponto de venda e vira a <b>casa ritual</b> do clube.",
            st["body"],
        )
    )
    story.append(
        QuoteBox(
            "“Não foi feito para muitos. Foi feito para quem entende marca, carro e postura. "
            "Crescemos por seleção. O privilégio não é entrar — é pertencer.”"
        )
    )
    story.append(Spacer(1, 6 * mm))

    # stats row
    stats = Table(
        [[
            KeyStat("20", "Vagas fundação"),
            KeyStat("12.10", "Jantar 2026"),
            KeyStat("ANUAL", "Modelo de cobrança"),
        ]],
        colWidths=[54 * mm, 54 * mm, 54 * mm],
    )
    stats.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(stats)
    story.append(Spacer(1, 7 * mm))

    story.append(Paragraph("O que somos / o que não somos", st["h2"]))
    story.append(
        premium_table(
            [
                ["SOMOS", "NÃO SOMOS"],
                ["Seleção por indicação", "Grupo aberto de WhatsApp"],
                ["Encontros, estrada e networking", "Só exposição de carro"],
                ["Cultura + lifestyle premium", "Programa de desconto da loja"],
                ["Poucos membros certos", "Meta de centenas de inscritos"],
            ],
            [80 * mm, 80 * mm],
        )
    )
    story.append(PageBreak())

    # 02 NOME
    story.append(Paragraph("02  —  MARCA", st["eyebrow"]))
    story.append(Paragraph("Por que o nome MARQUE", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "<b>Marque</b>, no vocabulário automobilístico europeu, significa <b>marca</b> — "
            "a linhagem, o emblema, a identidade de um fabricante. Falar em marque é falar de "
            "Porsche, BMW, Mercedes: não só do carro, mas do <b>código cultural</b> por trás dele.",
            st["body"],
        )
    )
    story.extend(
        bullets(
            [
                "<b>Liga a carros e marcas premium</b> — o DNA do clube.",
                "<b>Curto e internacional</b> — merch, domínio, Instagram.",
                "<b>Não copia o Benzin</b> — tom europeu, identidade própria.",
                "<b>Sem nome protegido</b> de montadora.",
                "<b>Escalável</b> — vive na Alpi sem ser só “clube da loja”.",
            ],
            st,
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "<b>Nome:</b> MARQUE Motor Club &nbsp;&nbsp;·&nbsp;&nbsp; "
            "<b>Assinatura:</b> Cascavel · by Alpi Motors &nbsp;&nbsp;·&nbsp;&nbsp; "
            "<b>Handle:</b> @marque.club",
            st["bodyLeft"],
        )
    )

    # 03 IDENTIDADE
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("03  —  IDENTIDADE VISUAL", st["eyebrow"]))
    story.append(Paragraph("Sistema visual da marca", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "A identidade evita o visual genérico de clube no Instagram. O caminho é "
            "<b>editorial e heráldico</b>: brasão, tipografia forte, grafite, prata e ouro — "
            "como um convite de marca europeia.",
            st["body"],
        )
    )

    # color swatches as table of KeyStats-like mini
    swatch_data = [[
        Paragraph("<font color='#F4F1EA'><b>GRAFITE</b><br/>#1C1C1E</font>", ParagraphStyle("sw", fontSize=8, leading=11, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<font color='#141414'><b>PRATA</b><br/>#A8A8B0</font>", ParagraphStyle("sw2", fontSize=8, leading=11, textColor=INK, alignment=TA_CENTER)),
        Paragraph("<font color='#141414'><b>OURO</b><br/>#9C8460</font>", ParagraphStyle("sw3", fontSize=8, leading=11, textColor=INK, alignment=TA_CENTER)),
        Paragraph("<font color='#141414'><b>MARFIM</b><br/>#F4F1EA</font>", ParagraphStyle("sw4", fontSize=8, leading=11, textColor=INK, alignment=TA_CENTER)),
    ]]
    sw = Table(swatch_data, colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm], rowHeights=[16 * mm])
    sw.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), GRAPHITE),
        ("BACKGROUND", (1, 0), (1, 0), SILVER),
        ("BACKGROUND", (2, 0), (2, 0), GOLD_SOFT),
        ("BACKGROUND", (3, 0), (3, 0), IVORY),
        ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(sw)
    story.append(Spacer(1, 5 * mm))

    # logo + arte side by side
    imgs = []
    if LOGO_LIGHT.exists():
        imgs.append(Image(str(LOGO_LIGHT), width=62 * mm, height=62 * mm))
    else:
        imgs.append(Spacer(62 * mm, 62 * mm))
    if ARTE.exists():
        imgs.append(Image(str(ARTE), width=62 * mm, height=62 * mm))
    else:
        imgs.append(Spacer(62 * mm, 62 * mm))
    img_table = Table([imgs], colWidths=[80 * mm, 80 * mm])
    img_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (0, 0), WHITE),
        ("BACKGROUND", (1, 0), (1, 0), GRAPHITE),
        ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(img_table)
    story.append(Paragraph("Logo oficial  ·  Arte Instagram V3 (lançamento)", st["caption"]))
    story.extend(
        bullets(
            [
                "Tom de voz: discreto, seletivo, confiante — nunca “promoção”.",
                "Foto: carros reais da Alpi e dos sócios.",
                "Regra: menos texto, mais critério. Escassez real.",
            ],
            st,
        )
    )
    story.append(PageBreak())

    # 04 COBRANÇA
    story.append(Paragraph("04  —  MODELO FINANCEIRO", st["eyebrow"]))
    story.append(Paragraph("Por que cobrança anual", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "Decisão travada: <b>anuidade no lançamento</b>. Mensalidade fica para fases "
            "posteriores (lista de espera) — não para os primeiros 20 fundadores.",
            st["body"],
        )
    )
    story.extend(
        bullets(
            [
                "<b>Compromisso:</b> fundador não testa um mês — entra no círculo.",
                "<b>Caixa:</b> jantar, kit, fotógrafo e 1ª road trip precisam de fôlego.",
                "<b>Seleção:</b> preço + anuidade filtram o perfil certo.",
                "<b>Operação:</b> menos inadimplência no início.",
                "<b>Escassez:</b> após 14/10/2026 a condição de fundador encerra e a entrada sobe.",
            ],
            st,
        )
    )
    story.append(
        QuoteBox(
            "A anuidade paga pertencimento (agenda, acesso, grupo, benefícios). "
            "Experiências extras — track day, viagem — são cobradas à parte e geram memória."
        )
    )
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("05  —  PLANOS DE FUNDAÇÃO", st["eyebrow"]))
    story.append(Paragraph("Founder e Membro", st["h1"]))
    story.append(GoldRule())
    story.append(
        premium_table(
            [
                ["", "MEMBRO", "FOUNDER"],
                ["Vagas", "12", "8"],
                ["Taxa de entrada", "R$ 1.980", "R$ 3.480"],
                ["Anuidade", "R$ 3.480", "R$ 4.980"],
                ["<b>Total ano 1</b>", "<b>R$ 5.460</b>", "<b>R$ 8.460</b>"],
                ["Parcelamento", "Anuidade em até 2x", "Anuidade em até 2x"],
                ["Indicações / ano", "1 (com veto)", "2 (com veto)"],
            ],
            [50 * mm, 55 * mm, 55 * mm],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "<b>Receita potencial (20 vagas lotadas):</b> 12 × R$ 5.460 + 8 × R$ 8.460 = "
            "<font color='#9C8460'><b>R$ 133.200</b></font> no ano 1 "
            "(antes de experiências avulsas e patrocínios).",
            st["body"],
        )
    )
    story.append(Paragraph("Inclusos", st["h2"]))
    story.append(Paragraph("<b>MEMBRO</b> — encontros mensais, grupo oficial, benefícios essenciais, kit de entrada, prioridade em experiências (à parte).", st["bodyLeft"]))
    story.append(Paragraph("<b>FOUNDER</b> — tudo do Membro + kit numerado 01–08, 1 experiência/ano inclusa, concierge leve, voz no calendário do 1º ano.", st["bodyLeft"]))
    story.append(PageBreak())

    # 06 PARCEIROS
    story.append(Paragraph("06  —  ECOSSISTEMA", st["eyebrow"]))
    story.append(Paragraph("Parceiros e benefícios", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "Fechar <b>5–7 parceiros</b> antes do jantar. Eles entregam benefício real; "
            "o clube entrega acesso ao círculo certo.",
            st["body"],
        )
    )
    story.append(
        premium_table(
            [
                ["PARCEIRO", "BENEFÍCIO AO SÓCIO"],
                ["Alpi Motors", "Casa dos encontros, avaliação prioritária, pré-estoque"],
                ["Estética / detailing", "15–25% off ou 1 lavagem premium / trimestre"],
                ["Oficina especializada", "Check-up / diagnóstico com prioridade"],
                ["Restaurante / chef", "Menu do sócio ou sala reservada"],
                ["Hotel / pousada", "Upgrade ou 10–15% em road trips"],
                ["Fotógrafo", "Ensaio de membro + cobertura dos eventos"],
            ],
            [48 * mm, 112 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Pacote mínimo: Alpi + estética + oficina + restaurante + fotógrafo.", st["caption"]))

    # 07 EVENTO
    story.append(Paragraph("07  —  LANÇAMENTO", st["eyebrow"]))
    story.append(Paragraph("1º evento — 12.10.2026", st["h1"]))
    story.append(GoldRule())
    story.append(
        Paragraph(
            "<b>Jantar de Fundação</b> na Alpi Motors. Meta: 14–18 pessoas à mesa; "
            "fechar 8–12 fundadores no ato ou em 48h (prazo até 14/10).",
            st["body"],
        )
    )
    story.append(Paragraph("Experiência da noite", st["h2"]))
    story.extend(
        bullets(
            [
                "3 carros ícone (não pátio cheio)",
                "Drink + jantar curto / finger food elevado",
                "Luz nos carros, som baixo, kit 1 página + QR",
                "Fotógrafo — conteúdo para o mês no Instagram",
            ],
            st,
        )
    )
    story.append(Paragraph("Marca âncora", st["h2"]))
    story.append(
        Paragraph(
            "Recomendação: <b>Porsche</b> (ou melhor halo car da Alpi: Porsche / BMW M / Mercedes-AMG). "
            "Uma marca em destaque + 1–2 carros de apoio.",
            st["body"],
        )
    )
    story.append(Paragraph("Espaços para empresas da marca", st["h2"]))
    story.append(
        Paragraph(
            "<b>Sim — patrocínio curado, não feira.</b> Máx. 3 empresas. Sem banner gigante. "
            "Venda só sob demanda do convidado.",
            st["body"],
        )
    )
    story.append(
        premium_table(
            [
                ["PACOTE", "ENTREGA", "FAIXA"],
                ["Presença", "Canto discreto + 1 pessoa + menção Insta", "R$ 1.500–2.500"],
                ["Âncora da noite", "Carro destaque + fala 5 min + stories", "R$ 4.000–7.000"],
                ["Hospitality", "Patrocina drink/jantar + branding sutil", "Custo + R$ 1.000"],
            ],
            [38 * mm, 78 * mm, 44 * mm],
        )
    )
    story.append(PageBreak())

    # 08 ROTEIRO
    story.append(Paragraph("08  —  OPERAÇÃO", st["eyebrow"]))
    story.append(Paragraph("Roteiro da noite e os primeiros 20", st["h1"]))
    story.append(GoldRule())
    story.append(
        premium_table(
            [
                ["HORÁRIO", "BLOCO"],
                ["19:30", "Chegada, drink, carros"],
                ["19:55", "Abertura do anfitrião (8 min)"],
                ["20:05", "Manifesto MARQUE (5 min)"],
                ["20:10", "Calendário 90 dias (7 min)"],
                ["20:20", "Planos Founder / Membro (8 min)"],
                ["20:30", "Jantar + circulação mesa a mesa"],
                ["21:20", "Fechamento + prazo 48h (5 min)"],
                ["21:30", "Encerramento discreto"],
            ],
            [30 * mm, 130 * mm],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Aquisição (método seleção)", st["h2"]))
    story.extend(
        bullets(
            [
                "Lista de 40 → convidar 22 → confirmar 16 à mesa.",
                "Convite <b>1 a 1</b> — nunca post de “inscrições abertas”.",
                "Perfil: donos premium da Alpi, empresários locais, âncoras sociais, parceiros de status.",
                "Quem fecha indica 1 pessoa (com veto do clube).",
            ],
            st,
        )
    )
    story.append(
        QuoteBox(
            "“Dia 12/10 abrimos o MARQUE Motor Club em Cascavel — círculo curado de carros "
            "e marcas premium, com casa na Alpi Motors. Só 20 vagas de fundador. "
            "Queria você na mesa do jantar de fundação.”"
        )
    )
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("09  —  CALENDÁRIO", st["eyebrow"]))
    story.append(Paragraph("Até o lançamento e 90 dias", st["h1"]))
    story.append(GoldRule())
    story.append(
        premium_table(
            [
                ["QUANDO", "AÇÃO"],
                ["Até 20/09", "Lista de 40 · 5 parceiros"],
                ["22–28/09", "Convites 1 a 1"],
                ["05/10", "Confirmar presença (meta 16)"],
                ["10/10", "Montagem + 3 carros ícone"],
                ["<b>12/10</b>", "<b>Jantar de Fundação</b>"],
                ["Até 14/10", "Fechar pagamentos (48h)"],
                ["Até 20/10", "Completar 20 sócios"],
                ["Nov/2026", "Encontro #1 na Alpi"],
                ["Dez/2026", "Jantar + night drive"],
                ["Jan/2027", "Road trip 1 dia"],
            ],
            [40 * mm, 120 * mm],
        )
    )
    story.append(PageBreak())

    # 10 CLOSE
    story.append(Paragraph("10  —  GOVERNANÇA", st["eyebrow"]))
    story.append(Paragraph("Decisões e próximos passos", st["h1"]))
    story.append(GoldRule())

    story.append(Paragraph("Travado", st["h2"]))
    story.extend(
        bullets(
            [
                "Nome: <b>MARQUE Motor Club</b>",
                "Casa: <b>Alpi Motors — Cascavel/PR</b>",
                "Modelo: <b>anuidade</b>",
                "Data: <b>12/10/2026</b>",
                "Cap: <b>20 fundadores</b> (8 Founder + 12 Membro)",
                "Identidade: logo + arte Instagram V3",
            ],
            st,
        )
    )
    story.append(Paragraph("Pendências operacionais", st["h2"]))
    story.extend(
        bullets(
            [
                "CNPJ / contrato de associação e conta para receber",
                "Lista dos 40 convidados",
                "5 parceiros com benefício escrito",
                "Marca âncora e 3 carros do 12/10",
                "Fotógrafo + menu/drink",
                "Instagram + teaser com a arte V3",
                "Pix/link e kit físico de boas-vindas",
            ],
            st,
        )
    )

    story.append(Spacer(1, 10 * mm))
    # closing band
    close = Table(
        [[
            Paragraph(
                "<font color='#C4A97A'><b>MARQUE MOTOR CLUB</b></font><br/>"
                "<font color='#A8A8B0'>Cascavel · by Alpi Motors · Fundação 12.10.2026</font><br/><br/>"
                "<font color='#F4F1EA'>Seleção. Marca. Pertencimento.</font>",
                ParagraphStyle("close", fontSize=9, leading=13, alignment=TA_CENTER),
            )
        ]],
        colWidths=[160 * mm],
        rowHeights=[32 * mm],
    )
    close.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRAPHITE),
        ("BOX", (0, 0), (-1, -1), 1.2, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(close)

    doc.build(story)
    data = OUT.read_bytes()
    OUT_ARTIFACT.write_bytes(data)
    OUT_ARTIFACT_ALT.write_bytes(data)
    # keep old filename in folder too
    (BASE / "MARQUE-Motor-Club-Apresentacao-Socios.pdf").write_bytes(data)
    print(f"OK {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
