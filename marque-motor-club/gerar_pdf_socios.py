#!/usr/bin/env python3
"""Gera PDF de apresentação do MARQUE Motor Club para sócios."""

from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
    KeepTogether,
    HRFlowable,
    ListFlowable,
    ListItem,
)

BASE = Path(__file__).resolve().parent
LOGO = BASE / "marque-motor-club-logo.png"
ARTE = BASE / "marque-instagram-v3-full-name.png"
OUT = BASE / "MARQUE-Motor-Club-Apresentacao-Socios.pdf"
OUT_ARTIFACT = Path("/opt/cursor/artifacts/MARQUE-Motor-Club-Apresentacao-Socios.pdf")

# Paleta
GRAPHITE = HexColor("#111111")
CHARCOAL = HexColor("#1A1A1A")
SILVER = HexColor("#8A8A8A")
LIGHT = HexColor("#F2F0EB")
MUTED = HexColor("#555555")
LINE = HexColor("#D0D0D0")
ACCENT = HexColor("#2A2A2A")


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=42,
            leading=46,
            textColor=GRAPHITE,
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=SILVER,
            alignment=TA_CENTER,
            letterSpacing=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=GRAPHITE,
            spaceBefore=4,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=CHARCOAL,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyLeft",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=CHARCOAL,
            alignment=TA_LEFT,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Quote",
            fontName="Helvetica-Oblique",
            fontSize=11,
            leading=16,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=10,
            spaceAfter=10,
            leftIndent=20,
            rightIndent=20,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletItem",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=CHARCOAL,
            leftIndent=8,
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=CHARCOAL,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHead",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=GRAPHITE,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Caption",
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=SILVER,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Footer",
            fontName="Helvetica",
            fontSize=8,
            textColor=SILVER,
            alignment=TA_CENTER,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Label",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=GRAPHITE,
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    return styles


def hr():
    return HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=4, spaceAfter=12)


def bullet_list(items, styles):
    flow = []
    for item in items:
        flow.append(Paragraph(f"• {item}", styles["BulletItem"]))
    return flow


def section_title(num, title, styles):
    return KeepTogether(
        [
            Paragraph(f"{num}  {title}", styles["Section"]),
            hr(),
        ]
    )


def build():
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="MARQUE Motor Club — Apresentação para Sócios",
        author="MARQUE Motor Club",
        subject="Plano de lançamento e posicionamento",
    )

    story = []

    # CAPA
    story.append(Spacer(1, 18 * mm))
    if LOGO.exists():
        img = Image(str(LOGO), width=55 * mm, height=55 * mm)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("MARQUE", styles["CoverTitle"]))
    story.append(Paragraph("MOTOR CLUB", styles["CoverSub"]))
    story.append(Spacer(1, 6 * mm))
    story.append(hr())
    story.append(
        Paragraph(
            "Apresentação para sócios e parceiros<br/>Casa: Alpi Motors · Cascavel/PR<br/>Jantar de Fundação: 12.10.2026",
            styles["Caption"],
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(
        Paragraph(
            "“Não foi feito para muitos. Foi feito para quem entende marca, carro e postura.”",
            styles["Quote"],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "Documento interno — resume posicionamento, marca, modelo de cobrança, "
            "planos, 1º evento e plano de aquisição dos primeiros 20 sócios.",
            styles["Body"],
        )
    )
    story.append(PageBreak())

    # 1. CONTEXTO
    story.append(section_title("01", "Contexto e oportunidade", styles))
    story.append(
        Paragraph(
            "A referência de mercado é o <b>Benzin Motor Club</b> (São Paulo): um clube "
            "automotivo premium que cresce por <b>seleção</b>, não por volume. O valor está "
            "em exclusividade, experiências únicas, curadoria de carros e um círculo de "
            "pessoas alinhadas — não em desconto de oficina ou grupo aberto de WhatsApp.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            "Em Cascavel, já existem <b>local</b> (Alpi Motors) e <b>parceiros</b>. "
            "O que falta é formalizar um clube com critério, identidade própria e modelo "
            "financeiro claro. A Alpi deixa de ser só ponto de venda e passa a ser a "
            "<b>casa ritual</b> do círculo.",
            styles["Body"],
        )
    )
    story.append(Paragraph("O que somos / o que não somos", styles["Label"]))
    table_data = [
        [
            Paragraph("<b>Somos</b>", styles["TableHead"]),
            Paragraph("<b>Não somos</b>", styles["TableHead"]),
        ],
        [
            Paragraph("Seleção por indicação", styles["TableCell"]),
            Paragraph("Grupo aberto de WhatsApp", styles["TableCell"]),
        ],
        [
            Paragraph("Encontros, estrada e networking", styles["TableCell"]),
            Paragraph("Só exposição de carro", styles["TableCell"]),
        ],
        [
            Paragraph("Cultura + lifestyle premium", styles["TableCell"]),
            Paragraph("Programa de desconto da loja", styles["TableCell"]),
        ],
        [
            Paragraph("Poucos membros certos", styles["TableCell"]),
            Paragraph("Meta de centenas de inscritos", styles["TableCell"]),
        ],
    ]
    t = Table(table_data, colWidths=[80 * mm, 80 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F5F5F5")),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8 * mm))

    # 2. NOME
    story.append(section_title("02", "Por que o nome MARQUE", styles))
    story.append(
        Paragraph(
            "<b>Marque</b>, no vocabulário automobilístico europeu (francês/inglês), "
            "significa <b>marca</b> — a linhagem, o emblema, a identidade de um fabricante. "
            "Falar em “marque” é falar de Porsche, BMW, Mercedes, Ferrari: não só do carro, "
            "mas do <b>código cultural</b> por trás dele.",
            styles["Body"],
        )
    )
    story.append(Paragraph("Por que esse nome funciona para nós", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "<b>Liga direto a carros e marcas premium</b> — o DNA do clube.",
                "<b>Curto e internacional</b> — funciona em merch, domínio e Instagram.",
                "<b>Não copia o Benzin</b> — tom europeu parecido, identidade própria.",
                "<b>Não usa nome protegido</b> de montadora (evita risco de marca).",
                "<b>Escalável</b> — pode viver “na Alpi” sem ser só “clube da loja”.",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Nome completo:</b> MARQUE Motor Club<br/>"
            "<b>Assinatura:</b> Cascavel · by Alpi Motors<br/>"
            "<b>Handle sugerido:</b> @marque.club / @marquemotorclub",
            styles["BodyLeft"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "Manifesto: MARQUE não foi feito para muitos. Foi feito para quem entende "
            "marca, carro e postura. Crescemos por seleção. O privilégio não é entrar — "
            "é pertencer.",
            styles["Quote"],
        )
    )
    story.append(PageBreak())

    # 3. IDENTIDADE
    story.append(section_title("03", "Identidade visual", styles))
    story.append(
        Paragraph(
            "A identidade evita o visual genérico de “clube de carro no Instagram” "
            "(neon, roxo, carro desfocado com luz de cinema). O caminho escolhido é "
            "<b>editorial / Swiss</b>: tipografia forte, espaço negativo, preto e prata — "
            "cara de convite de marca, não de render de IA.",
            styles["Body"],
        )
    )

    if LOGO.exists():
        story.append(Paragraph("Logo", styles["Label"]))
        logo = Image(str(LOGO), width=42 * mm, height=42 * mm)
        logo.hAlign = "CENTER"
        story.append(logo)
        story.append(
            Paragraph(
                "Brasão geométrico + wordmark MARQUE. Uso em fundo claro (kit, PDF, "
                "papelaria) e adaptação futura em fundo escuro para merch.",
                styles["Caption"],
            )
        )

    if ARTE.exists():
        story.append(Paragraph("Arte de lançamento (Instagram)", styles["Label"]))
        arte = Image(str(ARTE), width=95 * mm, height=95 * mm)
        arte.hAlign = "CENTER"
        story.append(arte)
        story.append(
            Paragraph(
                "Peça aprovada (V3): tipografia dominante, data do jantar de fundação "
                "12.10.2026, tom de poster de motorsport/agência.",
                styles["Caption"],
            )
        )

    story.append(Paragraph("Direção de marca", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "Paleta: grafite, prata, off-white — sem roxo, sem neon.",
                "Tom de voz: discreto, seletivo, confiante — nunca “promoção”.",
                "Foto: carros reais da Alpi e dos sócios; evitar stock genérico.",
                "Regra: menos texto, mais critério. Escassez real (vagas limitadas).",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    # 4. COBRANÇA
    story.append(section_title("04", "Por que cobrança anual", styles))
    story.append(
        Paragraph(
            "Decisão dos sócios fundadores do projeto: <b>anuidade no lançamento</b>. "
            "Mensalidade fica para fases posteriores (reposição via lista de espera), "
            "não para os primeiros 20.",
            styles["Body"],
        )
    )
    story.append(Paragraph("Racional", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "<b>Compromisso:</b> fundador não “testa um mês” — entra no círculo.",
                "<b>Caixa:</b> jantar, kit, fotógrafo e 1ª road trip precisam de fôlego.",
                "<b>Seleção:</b> preço + anuidade filtram perfil alinhado ao Benzin.",
                "<b>Operação simples:</b> menos inadimplência e cobrança mensal no início.",
                "<b>Escassez:</b> depois de 14/10/2026 a condição de fundador encerra "
                "e a entrada sobe.",
            ],
            styles,
        )
    )
    story.append(
        Paragraph(
            "Regra de produto: a <b>anuidade paga pertencimento</b> (agenda, acesso, "
            "grupo, benefícios). <b>Experiências extras</b> (track day, viagem) são "
            "cobradas à parte — geram memória e receita adicional.",
            styles["Body"],
        )
    )

    # 5. PLANOS
    story.append(section_title("05", "Planos e preços (fundação)", styles))
    story.append(
        Paragraph(
            "Abertura com <b>2 planos</b> e <b>20 vagas</b>. Um terceiro tier "
            "(estilo LINIE / RUF / MEISTER do Benzin) só depois de haver tração.",
            styles["Body"],
        )
    )

    plan_header = [
        Paragraph("", styles["TableHead"]),
        Paragraph("<b>MEMBRO</b>", styles["TableHead"]),
        Paragraph("<b>FOUNDER</b>", styles["TableHead"]),
    ]
    plan_rows = [
        plan_header,
        [
            Paragraph("Vagas", styles["TableCell"]),
            Paragraph("12", styles["TableCell"]),
            Paragraph("8", styles["TableCell"]),
        ],
        [
            Paragraph("Taxa de entrada", styles["TableCell"]),
            Paragraph("R$ 1.980", styles["TableCell"]),
            Paragraph("R$ 3.480", styles["TableCell"]),
        ],
        [
            Paragraph("Anuidade", styles["TableCell"]),
            Paragraph("R$ 3.480", styles["TableCell"]),
            Paragraph("R$ 4.980", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Total ano 1</b>", styles["TableCell"]),
            Paragraph("<b>R$ 5.460</b>", styles["TableCell"]),
            Paragraph("<b>R$ 8.460</b>", styles["TableCell"]),
        ],
        [
            Paragraph("Parcelamento", styles["TableCell"]),
            Paragraph("Anuidade em até 2x", styles["TableCell"]),
            Paragraph("Anuidade em até 2x", styles["TableCell"]),
        ],
        [
            Paragraph("Indicações / ano", styles["TableCell"]),
            Paragraph("1 (com veto)", styles["TableCell"]),
            Paragraph("2 (com veto)", styles["TableCell"]),
        ],
    ]
    pt = Table(plan_rows, colWidths=[50 * mm, 55 * mm, 55 * mm])
    pt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F5F5F5")),
                ("BACKGROUND", (0, 4), (-1, 4), HexColor("#EFEFEF")),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(pt)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("O que cada plano inclui", styles["Label"]))
    story.append(Paragraph("<b>MEMBRO</b>", styles["BodyLeft"]))
    story.extend(
        bullet_list(
            [
                "Encontros mensais na Alpi",
                "Grupo oficial fechado",
                "Benefícios em parceiros (camada essencial)",
                "Kit de entrada (peça + identificação)",
                "Prioridade em road trips e track days (pago à parte)",
            ],
            styles,
        )
    )
    story.append(Paragraph("<b>FOUNDER</b>", styles["BodyLeft"]))
    story.extend(
        bullet_list(
            [
                "Tudo do Membro",
                "Kit especial + numeração Founder 01–08",
                "1 experiência/ano inclusa (jantar ou day trip)",
                "Concierge leve (agenda de estética, reservas, logística)",
                "Voz consultiva no calendário do 1º ano",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Receita potencial da fundação (se lotar 20):</b> "
            "12 × R$ 5.460 + 8 × R$ 8.460 = <b>R$ 133.200</b> no ano 1 "
            "(entradas + anuidades), antes de experiências avulsas e patrocínios.",
            styles["Body"],
        )
    )
    story.append(PageBreak())

    # 6. PARCEIROS
    story.append(section_title("06", "Parceiros e benefícios", styles))
    story.append(
        Paragraph(
            "Fechar <b>5–7 parceiros</b> antes do jantar. Eles entregam benefício real; "
            "o clube entrega acesso ao círculo certo e presença nos eventos.",
            styles["Body"],
        )
    )
    partner_rows = [
        [
            Paragraph("<b>Parceiro</b>", styles["TableHead"]),
            Paragraph("<b>Benefício ao sócio</b>", styles["TableHead"]),
        ],
        [
            Paragraph("Alpi Motors", styles["TableCell"]),
            Paragraph(
                "Casa dos encontros, avaliação prioritária, pré-estoque, consignação",
                styles["TableCell"],
            ),
        ],
        [
            Paragraph("Estética / detailing", styles["TableCell"]),
            Paragraph("15–25% off ou 1 lavagem premium / trimestre", styles["TableCell"]),
        ],
        [
            Paragraph("Oficina especializada", styles["TableCell"]),
            Paragraph("Check-up / diagnóstico com prioridade", styles["TableCell"]),
        ],
        [
            Paragraph("Restaurante / chef", styles["TableCell"]),
            Paragraph("Menu do sócio ou sala reservada", styles["TableCell"]),
        ],
        [
            Paragraph("Hotel / pousada", styles["TableCell"]),
            Paragraph("Upgrade ou 10–15% em road trips", styles["TableCell"]),
        ],
        [
            Paragraph("Fotógrafo", styles["TableCell"]),
            Paragraph("Ensaio com preço de membro + cobertura dos eventos", styles["TableCell"]),
        ],
    ]
    prt = Table(partner_rows, colWidths=[45 * mm, 115 * mm])
    prt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F5F5F5")),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(prt)
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "Pacote mínimo para lançar: Alpi + estética + oficina + restaurante + fotógrafo. "
            "Benefício precisa parecer privilégio — evitar “5% em tudo”.",
            styles["Body"],
        )
    )

    # 7. EVENTO
    story.append(section_title("07", "1º evento — 12.10.2026", styles))
    story.append(
        Paragraph(
            "<b>Jantar de Fundação</b> na Alpi Motors. Meta: 14–18 pessoas à mesa; "
            "fechar 8–12 fundadores no ato ou em 48h (prazo até 14/10).",
            styles["Body"],
        )
    )
    story.append(Paragraph("O que levar na experiência", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "3 carros ícone (não pátio cheio)",
                "Drink de boas-vindas + jantar curto ou finger food elevado",
                "Luz focada nos carros, som baixo",
                "Kit 1 página + QR de pagamento",
                "Fotógrafo — conteúdo vira o mês no Instagram",
            ],
            styles,
        )
    )
    story.append(Paragraph("Marca âncora da noite", styles["Label"]))
    story.append(
        Paragraph(
            "Recomendação: <b>Porsche</b> como âncora (ou o melhor halo car disponível "
            "na Alpi: Porsche / BMW M / Mercedes-AMG). Uma marca em destaque + 1–2 carros "
            "de apoio. Não misturar seis marcas no lançamento.",
            styles["Body"],
        )
    )
    story.append(Paragraph("Espaço para empresas da marca no local?", styles["Label"]))
    story.append(
        Paragraph(
            "<b>Sim — como patrocínio curado, não como feira.</b> Chamar de "
            "“Presença Oficial” / “Parceiro de Marca”. Máximo 3 empresas: sem banner "
            "gigante, sem TV de preço, venda só se o convidado pedir.",
            styles["Body"],
        )
    )

    esp_rows = [
        [
            Paragraph("<b>Pacote</b>", styles["TableHead"]),
            Paragraph("<b>Entrega</b>", styles["TableHead"]),
            Paragraph("<b>Faixa</b>", styles["TableHead"]),
        ],
        [
            Paragraph("Presença", styles["TableCell"]),
            Paragraph("Canto discreto + 1 pessoa + menção Insta", styles["TableCell"]),
            Paragraph("R$ 1.500–2.500", styles["TableCell"]),
        ],
        [
            Paragraph("Âncora da noite", styles["TableCell"]),
            Paragraph("Carro destaque + fala 5 min + stories", styles["TableCell"]),
            Paragraph("R$ 4.000–7.000", styles["TableCell"]),
        ],
        [
            Paragraph("Hospitality", styles["TableCell"]),
            Paragraph("Patrocina drink/jantar + branding sutil", styles["TableCell"]),
            Paragraph("Custo jantar + R$ 1.000", styles["TableCell"]),
        ],
    ]
    et = Table(esp_rows, colWidths=[40 * mm, 75 * mm, 45 * mm])
    et.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F5F5F5")),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(et)
    story.append(PageBreak())

    # 8. ROTEIRO
    story.append(section_title("08", "Roteiro da noite e aquisição dos 20", styles))
    roteiro = [
        ["19:30", "Chegada, drink, carros"],
        ["19:55", "Abertura do anfitrião (8 min)"],
        ["20:05", "Manifesto MARQUE (5 min)"],
        ["20:10", "Calendário 90 dias (7 min)"],
        ["20:20", "Planos Founder / Membro (8 min)"],
        ["20:30", "Jantar + circulação mesa a mesa"],
        ["21:20", "Fechamento + prazo 48h (5 min)"],
        ["21:30", "Encerramento discreto"],
    ]
    rr = [[Paragraph(f"<b>{a}</b>", styles["TableCell"]), Paragraph(b, styles["TableCell"])] for a, b in roteiro]
    rt = Table(rr, colWidths=[25 * mm, 135 * mm])
    rt.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(rt)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("Como convidar (método Benzin)", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "Lista privada de 40 nomes → convidar 22 → confirmar 16 à mesa.",
                "Convite <b>1 a 1</b> (WhatsApp/ligação) — nunca post público de “inscrições abertas”.",
                "Perfil: donos de premium ligados à Alpi, empresários locais, 1–2 âncoras sociais, parceiros de status.",
                "Quem fecha vira fundador e indica 1 pessoa (com veto do clube).",
                "Fechar os 20 em 2–3 semanas após o jantar; depois lista de espera.",
            ],
            styles,
        )
    )

    story.append(Paragraph("Mensagem-base de convite", styles["Label"]))
    story.append(
        Paragraph(
            "“Dia 12/10 abrimos o MARQUE Motor Club em Cascavel — círculo curado de "
            "carros e marcas premium, com casa na Alpi Motors. Só 20 vagas de fundador. "
            "Queria você na mesa do jantar de fundação. Posso te reservar lugar?”",
            styles["Quote"],
        )
    )

    # 9. CALENDÁRIO
    story.append(section_title("09", "Calendário até o lançamento e 90 dias", styles))
    cal = [
        ["Até 20/09", "Nome ok · lista de 40 · 5 parceiros"],
        ["22–28/09", "Convites 1 a 1"],
        ["05/10", "Confirmar presença (meta 16)"],
        ["10/10", "Montagem do espaço + 3 carros ícone"],
        ["12/10", "Jantar de Fundação"],
        ["Até 14/10", "Fechar pagamentos (48h)"],
        ["Até 20/10", "Completar 20 sócios"],
        ["Nov/2026", "Encontro #1 na Alpi (sócios)"],
        ["Dez/2026", "Jantar + night drive curto"],
        ["Jan/2027", "Road trip 1 dia (Oeste PR / Norte SC)"],
    ]
    cr = [[Paragraph(f"<b>{a}</b>", styles["TableCell"]), Paragraph(b, styles["TableCell"])] for a, b in cal]
    ct = Table(cr, colWidths=[35 * mm, 125 * mm])
    ct.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, 4), (-1, 4), HexColor("#F5F5F5")),
            ]
        )
    )
    story.append(ct)
    story.append(PageBreak())

    # 10. PRÓXIMOS PASSOS
    story.append(section_title("10", "Decisões já tomadas e próximos passos", styles))
    story.append(Paragraph("Travado", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "Nome: <b>MARQUE Motor Club</b>",
                "Casa: <b>Alpi Motors — Cascavel/PR</b>",
                "Modelo: <b>anuidade</b> (fundação)",
                "Data: <b>jantar 12/10/2026</b>",
                "Cap: <b>20 fundadores</b> (8 Founder + 12 Membro)",
                "Arte Instagram V3 aprovada + logo em uso",
            ],
            styles,
        )
    )
    story.append(Paragraph("Pendências dos sócios (operacional)", styles["Label"]))
    story.extend(
        bullet_list(
            [
                "Definir CNPJ / contrato de associação e conta para receber",
                "Fechar lista dos 40 convidados (nomes + telefone)",
                "Assinar 5 parceiros com benefício escrito",
                "Confirmar marca âncora e 3 carros do 12/10",
                "Contratar fotógrafo e menu/drink",
                "Abrir @ no Instagram e publicar teaser com a arte V3",
                "Preparar Pix/link e kit físico de boas-vindas",
            ],
            styles,
        )
    )

    story.append(Spacer(1, 10 * mm))
    story.append(hr())
    story.append(
        Paragraph(
            "MARQUE Motor Club · Documento para sócios · Cascavel/PR · 2026",
            styles["Footer"],
        )
    )
    story.append(
        Paragraph(
            "Uso interno. Referência de estilo: Benzin Motor Club (SP) — adaptação local.",
            styles["Footer"],
        )
    )

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(SILVER)
        canvas.drawString(18 * mm, 7 * mm, "MARQUE Motor Club — confidencial")
        canvas.drawRightString(A4[0] - 18 * mm, 7 * mm, f"{doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    OUT_ARTIFACT.write_bytes(OUT.read_bytes())
    print(f"OK: {OUT}")
    print(f"OK: {OUT_ARTIFACT}")


if __name__ == "__main__":
    build()
