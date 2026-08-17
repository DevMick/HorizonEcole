# -*- coding: utf-8 -*-
"""Génère la grille tarifaire HorizonEcole (FCFA) en PDF via ReportLab."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak, NextPageTemplate,
)

OUT = r"C:\APP\HorizonEcole-main\docs\grille_tarifaire_horizonecole.pdf"

# ---------------------------------------------------------------- palette
INK        = colors.HexColor("#34478F")
INK_DARK   = colors.HexColor("#171F3F")
INK_50     = colors.HexColor("#EEF1FA")
INK_100    = colors.HexColor("#DCE3F5")
GREEN      = colors.HexColor("#217A54")
GREEN_50   = colors.HexColor("#EAF5F0")
AMBER      = colors.HexColor("#CC8722")
AMBER_50   = colors.HexColor("#FDF3E4")
SLATE_0    = colors.HexColor("#F5F6FA")
SLATE_100  = colors.HexColor("#ECEEF4")
SLATE_200  = colors.HexColor("#DEE1EA")
SLATE_500  = colors.HexColor("#8A8FA3")
SLATE_600  = colors.HexColor("#5C6178")
SLATE_900  = colors.HexColor("#1B1E2B")
WHITE      = colors.white

MARGIN_X = 1.4 * cm
PAGE_W, PAGE_H = A4
USABLE = PAGE_W - 2 * MARGIN_X   # 18.2 cm

# ---------------------------------------------------------------- styles
def P(size=8.2, leading=10.4, color=SLATE_900, font="Helvetica",
      align=TA_LEFT, space_after=0, space_before=0):
    return ParagraphStyle(
        "s%s" % id(object()), fontName=font, fontSize=size, leading=leading,
        textColor=color, alignment=align, spaceAfter=space_after,
        spaceBefore=space_before,
    )

S_TITLE     = P(21, 24, WHITE, "Helvetica-Bold")
S_SUB       = P(9.5, 13, colors.HexColor("#C7CBD9"))
S_META_K    = P(6.6, 8.5, colors.HexColor("#9AA6D4"), "Helvetica-Bold")
S_META_V    = P(8.6, 11, WHITE, "Helvetica-Bold")
S_H1        = P(13, 16, INK, "Helvetica-Bold")
S_H2        = P(10.6, 13, INK_DARK, "Helvetica-Bold")
S_H2_SUB    = P(8, 10.5, SLATE_600)
S_BODY      = P(8.6, 11.6, SLATE_900)
S_BODY_S    = P(7.8, 10.4, SLATE_600)
S_NOTE      = P(7.4, 9.8, SLATE_600)
S_TH        = P(7.4, 9.4, WHITE, "Helvetica-Bold")
S_TH_C      = P(7.4, 9.4, WHITE, "Helvetica-Bold", TA_CENTER)
S_TD        = P(8, 10.2, SLATE_900, "Helvetica-Bold")
S_TD_SUB    = P(6.9, 8.6, SLATE_500)
S_TD_N      = P(7.9, 10, SLATE_900)
S_TD_C      = P(7.9, 10, SLATE_900, "Helvetica", TA_CENTER)
S_PRICE_A   = P(9.4, 11.5, INK, "Helvetica-Bold", TA_CENTER)
S_PRICE_B   = P(9.4, 11.5, GREEN, "Helvetica-Bold", TA_CENTER)
S_PRICE_U   = P(6.4, 8, SLATE_500, "Helvetica", TA_CENTER)
S_CARD_T    = P(8.8, 11, INK_DARK, "Helvetica-Bold")
S_CARD_B    = P(7.5, 9.8, SLATE_600)


def price_cell(value, unit, style):
    return [Paragraph(value, style), Paragraph(unit, S_PRICE_U)]


# ---------------------------------------------------------------- header / footer
def draw_page(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFillColor(INK_DARK)
        canvas.rect(0, PAGE_H - 1.5 * cm, PAGE_W, 1.5 * cm, stroke=0, fill=1)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(WHITE)
        canvas.drawString(MARGIN_X, PAGE_H - 1.0 * cm, "HORIZONECOLE")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#A9B4DC"))
        canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 1.0 * cm,
                               "Grille tarifaire \u2014 Ao\u00fbt 2026 \u2014 FCFA (XOF) HT")

    # pied de page
    canvas.setStrokeColor(SLATE_200)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, 1.15 * cm, PAGE_W - MARGIN_X, 1.15 * cm)
    canvas.setFont("Helvetica", 6.6)
    canvas.setFillColor(SLATE_500)
    canvas.drawString(MARGIN_X, 0.78 * cm,
                      "Document commercial confidentiel \u2014 HorizonEcole \u00b7 "
                      "Prix indicatifs en FCFA (XOF) hors taxes \u00b7 Devis valable 60 jours")
    canvas.drawRightString(PAGE_W - MARGIN_X, 0.78 * cm, "%d" % doc.page)
    canvas.restoreState()


# ---------------------------------------------------------------- helpers de mise en forme
def section(title, subtitle=None, top=0.5 * cm):
    els = [Spacer(1, top), Paragraph(title, S_H1)]
    line = Table([[""]], colWidths=[2.4 * cm], rowHeights=[0.09 * cm])
    line.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), AMBER),
                              ("LINEBELOW", (0, 0), (-1, -1), 0, WHITE)]))
    els += [Spacer(1, 0.12 * cm), line, Spacer(1, 0.28 * cm)]
    if subtitle:
        els += [Paragraph(subtitle, S_BODY_S), Spacer(1, 0.24 * cm)]
    return els


def base_table_style(ncols, header_bg=INK):
    return [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, SLATE_200),
        ("BOX", (0, 0), (-1, -1), 0.6, SLATE_200),
    ]


def zebra(style, nrows, start=1, color=SLATE_0):
    for r in range(start, nrows):
        if (r - start) % 2 == 1:
            style.append(("BACKGROUND", (0, r), (-1, r), color))
    return style


story = [NextPageTemplate("rest")]

# ================================================================ EN-TETE
meta = [[
    [Paragraph("DEVISE", S_META_K), Paragraph("Franc CFA (XOF) \u2014 HT", S_META_V)],
    [Paragraph("MODULES", S_META_K), Paragraph("Primaire \u00b7 Coll\u00e8ge \u00b7 Lyc\u00e9e", S_META_V)],
    [Paragraph("D\u00c9PLOIEMENT", S_META_K), Paragraph("Cloud HorizonEcole ou serveur local", S_META_V)],
    [Paragraph("MISE \u00c0 JOUR", S_META_K), Paragraph("Ao\u00fbt 2026", S_META_V)],
]]
meta_t = Table(meta, colWidths=[3.7 * cm, 3.7 * cm, 5.4 * cm, 3.0 * cm])
meta_t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))

header = Table([[
    [Paragraph("DOCUMENT COMMERCIAL CONFIDENTIEL",
               P(7, 9, colors.HexColor("#9AA6D4"), "Helvetica-Bold")),
     Spacer(1, 0.2 * cm),
     Paragraph("Grille Tarifaire HorizonEcole", S_TITLE),
     Spacer(1, 0.12 * cm),
     Paragraph("Logiciel de gestion scolaire \u2014 March\u00e9 ivoirien \u00b7 "
               "Tarifs diff\u00e9renci\u00e9s selon le mode d'h\u00e9bergement", S_SUB),
     Spacer(1, 0.55 * cm),
     meta_t],
]], colWidths=[USABLE])
header.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), INK_DARK),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 16),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ("LEFTPADDING", (0, 0), (-1, -1), 16),
    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ("LINEBELOW", (0, 0), (-1, -1), 3, AMBER),
]))
story.append(header)
story.append(Spacer(1, 0.75 * cm))

# ================================================================ 1. INCLUS
story += section("Ce que comprend l'abonnement, quel que soit le module")

inc = [[
    Paragraph("Espace Administration", P(8.6, 11, INK, "Helvetica-Bold")),
    Paragraph("Espace Enseignant", P(8.6, 11, GREEN, "Helvetica-Bold")),
    Paragraph("Espace \u00c9l\u00e8ve &amp; Parent", P(8.6, 11, AMBER, "Helvetica-Bold")),
], [
    Paragraph("\u00c9l\u00e8ves et parents \u00b7 Inscriptions \u00b7 Classes et mati\u00e8res \u00b7 "
              "Ann\u00e9es scolaires et p\u00e9riodes \u00b7 Emploi du temps et salles \u00b7 "
              "Absences et discipline \u00b7 Frais de scolarit\u00e9, \u00e9ch\u00e9anciers et re\u00e7us \u00b7 "
              "Bulletins PDF \u00b7 Utilisateurs, r\u00f4les et droits \u00b7 Journal d'audit \u00b7 "
              "Tableau de bord", S_CARD_B),
    Paragraph("Saisie des notes par \u00e9valuation \u00b7 Coefficients et moyennes pond\u00e9r\u00e9es \u00b7 "
              "Appel et feuille de pr\u00e9sence \u00b7 Notes de conduite \u00b7 "
              "Suivi de classe et professeur principal \u00b7 Bilan de p\u00e9riode \u00b7 "
              "Emploi du temps personnel \u00b7 Documents p\u00e9dagogiques", S_CARD_B),
    Paragraph("Notes et moyennes en temps r\u00e9el \u00b7 Bulletins en ligne \u00b7 "
              "Absences et retards \u00b7 Emploi du temps de la classe \u00b7 "
              "Situation des paiements \u00b7 Comptes s\u00e9curis\u00e9s individuels", S_CARD_B),
]]
t = Table(inc, colWidths=[USABLE / 3.0] * 3)
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (0, -1), INK_50),
    ("BACKGROUND", (1, 0), (1, -1), GREEN_50),
    ("BACKGROUND", (2, 0), (2, -1), AMBER_50),
    ("TOPPADDING", (0, 0), (-1, 0), 8),
    ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 1), (-1, 1), 3),
    ("INNERGRID", (0, 0), (-1, -1), 3, WHITE),
    ("BOX", (0, 0), (-1, -1), 3, WHITE),
]))
story.append(t)
story.append(Spacer(1, 0.3 * cm))
story.append(Paragraph(
    "S\u00e9curit\u00e9 et exploitation incluses dans tous les cas : comptes prot\u00e9g\u00e9s par mot de passe "
    "chiffr\u00e9, s\u00e9paration stricte des donn\u00e9es entre \u00e9tablissements, journal des acc\u00e8s, "
    "connexion chiffr\u00e9e HTTPS, mises \u00e0 jour fonctionnelles de l'ann\u00e9e en cours.", S_NOTE))

# ================================================================ 2. DEUX MODES D'HEBERGEMENT
story += section("Deux fa\u00e7ons de d\u00e9ployer HorizonEcole", top=0.75 * cm)

modes = [[
    [Paragraph("A \u2014 H\u00e9bergement HorizonEcole (Cloud)", P(9.4, 12, INK, "Helvetica-Bold")),
     Spacer(1, 0.16 * cm),
     Paragraph("Nous fournissons et exploitons le serveur. L'\u00e9tablissement n'a besoin que "
               "d'une connexion Internet.", S_CARD_B),
     Spacer(1, 0.16 * cm),
     Paragraph("<b>Inclus :</b> serveur VPS dimensionn\u00e9 selon l'effectif, nom de domaine et "
               "certificat SSL, sauvegardes quotidiennes conserv\u00e9es 30 jours, supervision, "
               "mises \u00e0 jour appliqu\u00e9es par nos soins, restauration en cas d'incident.", S_CARD_B),
     Spacer(1, 0.16 * cm),
     Paragraph("<b>Recommand\u00e9 pour :</b> les \u00e9tablissements sans service informatique interne, "
               "l'acc\u00e8s des parents \u00e0 distance, les groupes multi-sites.", S_CARD_B)],
    [Paragraph("B \u2014 Serveur local de l'\u00e9tablissement", P(9.4, 12, GREEN, "Helvetica-Bold")),
     Spacer(1, 0.16 * cm),
     Paragraph("L'\u00e9tablissement dispose d\u00e9j\u00e0 d'un serveur : nous installons HorizonEcole "
               "sur son infrastructure.", S_CARD_B),
     Spacer(1, 0.16 * cm),
     Paragraph("<b>Inclus :</b> installation sur site, param\u00e9trage, s\u00e9curisation, script de "
               "sauvegarde locale, mises \u00e0 jour livr\u00e9es \u00e0 distance, support.", S_CARD_B),
     Spacer(1, 0.16 * cm),
     Paragraph("<b>\u00c0 la charge du client :</b> mat\u00e9riel, \u00e9lectricit\u00e9 et onduleur, r\u00e9seau, "
               "acc\u00e8s distant pour la maintenance. Pr\u00e9requis minimum : 4 vCPU, 8 Go de RAM, "
               "100 Go SSD, Linux (Ubuntu Server 22.04+).", S_CARD_B)],
]]
t = Table(modes, colWidths=[USABLE / 2.0] * 2)
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (0, -1), INK_50),
    ("BACKGROUND", (1, 0), (1, -1), GREEN_50),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("LEFTPADDING", (0, 0), (-1, -1), 9),
    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ("INNERGRID", (0, 0), (-1, -1), 4, WHITE),
    ("BOX", (0, 0), (-1, -1), 4, WHITE),
]))
story.append(t)

# --- repères coût par élève ---
story += section(
    "Repères : ce que cela représente par élève",
    "Abonnement de croisière rapporté à l'effectif, hors frais de mise en service de la "
    "première année. Le budget logiciel reste inférieur à 1 % des frais de scolarité "
    "encaissés par un établissement privé ivoirien.", top=0.7 * cm)

REPERES = [
    ("École primaire", "300 élèves", "1 067", "1 400"),
    ("Collège", "450 élèves", "933", "1 467"),
    ("Lycée", "800 élèves", "1 000", "1 400"),
]
cards = []
for titre, eff, local, cloud in REPERES:
    cards.append([
        Paragraph(titre, P(8.8, 11, INK_DARK, "Helvetica-Bold")),
        Paragraph(eff, S_TD_SUB),
        Spacer(1, 0.22 * cm),
        Table([[
            [Paragraph(local, P(13, 15, GREEN, "Helvetica-Bold", TA_CENTER)),
             Paragraph("FCFA / élève / an", S_PRICE_U),
             Paragraph("serveur local", S_PRICE_U)],
            [Paragraph(cloud, P(13, 15, INK, "Helvetica-Bold", TA_CENTER)),
             Paragraph("FCFA / élève / an", S_PRICE_U),
             Paragraph("cloud tout compris", S_PRICE_U)],
        ]], colWidths=[(USABLE / 3 - 0.5 * cm) / 2] * 2,
            style=TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ])),
    ])
t = Table([cards], colWidths=[USABLE / 3.0] * 3)
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (-1, -1), SLATE_0),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("INNERGRID", (0, 0), (-1, -1), 3, WHITE),
    ("BOX", (0, 0), (-1, -1), 0.6, SLATE_200),
]))
story.append(t)

story.append(PageBreak())

# ================================================================ 3. FORMULES D'HEBERGEMENT
story += section(
    "Formules d'h\u00e9bergement Cloud",
    "Le serveur est dimensionn\u00e9 selon l'effectif de l'\u00e9tablissement. La formule applicable "
    "\u00e0 chaque tranche est indiqu\u00e9e dans les tableaux de tarifs ci-apr\u00e8s : son prix est d\u00e9j\u00e0 "
    "compris dans la colonne \u00ab H\u00e9bergement HorizonEcole \u00bb.", top=0.15 * cm)

host_rows = [[
    Paragraph("Formule", S_TH), Paragraph("Serveur", S_TH),
    Paragraph("Ressources", S_TH), Paragraph("Capacit\u00e9 recommand\u00e9e", S_TH),
    Paragraph("Part h\u00e9bergement", S_TH_C),
]]
HOST = [
    ("Cloud Mutualis\u00e9", "VPS KVM 2 partag\u00e9",
     "2 vCPU \u00b7 8 Go RAM \u00b7 100 Go NVMe, instance partag\u00e9e et cloisonn\u00e9e",
     "jusqu'\u00e0 400 \u00e9l\u00e8ves", "100 000"),
    ("Cloud D\u00e9di\u00e9 S", "VPS KVM 1 d\u00e9di\u00e9",
     "1 vCPU \u00b7 4 Go RAM \u00b7 50 Go NVMe \u00b7 4 To de trafic",
     "jusqu'\u00e0 800 \u00e9l\u00e8ves", "240 000"),
    ("Cloud D\u00e9di\u00e9 M", "VPS KVM 2 d\u00e9di\u00e9",
     "2 vCPU \u00b7 8 Go RAM \u00b7 100 Go NVMe \u00b7 8 To de trafic",
     "jusqu'\u00e0 1 500 \u00e9l\u00e8ves", "320 000"),
    ("Cloud D\u00e9di\u00e9 L", "VPS KVM 4 d\u00e9di\u00e9",
     "4 vCPU \u00b7 16 Go RAM \u00b7 200 Go NVMe \u00b7 16 To de trafic",
     "jusqu'\u00e0 3 000 \u00e9l\u00e8ves \u00b7 multi-sites", "550 000"),
    ("Cloud D\u00e9di\u00e9 XL", "VPS KVM 8 d\u00e9di\u00e9",
     "8 vCPU \u00b7 32 Go RAM \u00b7 400 Go NVMe \u00b7 32 To de trafic",
     "groupes scolaires de plus de 3 000 \u00e9l\u00e8ves", "900 000"),
]
for f, s, r, c, p in HOST:
    host_rows.append([
        Paragraph(f, S_TD), Paragraph(s, S_TD_N), Paragraph(r, S_TD_N),
        Paragraph(c, S_TD_N), price_cell(p, "FCFA / an", S_PRICE_A),
    ])
t = Table(host_rows, colWidths=[3.0 * cm, 3.0 * cm, 5.4 * cm, 3.6 * cm, 3.2 * cm], repeatRows=1)
st = base_table_style(5)
st += [("BACKGROUND", (4, 1), (4, -1), INK_50)]
t.setStyle(TableStyle(zebra(st, len(host_rows))))
story.append(t)
story.append(Spacer(1, 0.25 * cm))
story.append(Paragraph(
    "La part h\u00e9bergement couvre le co\u00fbt du serveur, les sauvegardes externalis\u00e9es, la "
    "supervision, le nom de domaine, le certificat SSL et le temps d'exploitation. "
    "Elle n'est <b>pas</b> factur\u00e9e en mode \u00ab serveur local \u00bb.", S_NOTE))

# ================================================================ 4. ABONNEMENT ANNUEL
story += section(
    "Tarifs d'abonnement annuel",
    "HorizonEcole est propos\u00e9 exclusivement en abonnement : mises \u00e0 jour, support et "
    "\u00e9volutions inclus, r\u00e9siliable \u00e0 la fin de chaque ann\u00e9e scolaire. Le montant affich\u00e9 "
    "en grand est le <b>budget total de la premi\u00e8re ann\u00e9e, frais de mise en service compris</b> ; "
    "le montant en dessous est l'abonnement seul, reconduit les ann\u00e9es suivantes.",
    top=0.7 * cm)


S_RECUR_A = P(7, 8.8, INK, "Helvetica-Bold", TA_CENTER)
S_RECUR_B = P(7, 8.8, GREEN, "Helvetica-Bold", TA_CENTER)


def year_cell(total, recur, price_style, recur_style):
    """Prix de 1re ann\u00e9e (mise en service comprise) + abonnement des ann\u00e9es suivantes."""
    return [Paragraph(total, price_style),
            Paragraph("FCFA \u2014 1re ann\u00e9e", S_PRICE_U),
            Paragraph("puis %s FCFA / an" % recur, recur_style)]


def module_table(title, subtitle, rows):
    els = [Paragraph(title, S_H2), Spacer(1, 0.06 * cm),
           Paragraph(subtitle, S_H2_SUB), Spacer(1, 0.2 * cm)]
    data = [[
        Paragraph("Taille de l'\u00e9tablissement", S_TH),
        Paragraph("Effectif", S_TH),
        Paragraph("Formule", S_TH),
        [Paragraph("H\u00e9bergement HorizonEcole", S_TH_C),
         Paragraph("serveur et mise en service compris",
                   P(6.4, 8, colors.HexColor("#B9C3E8"), "Helvetica", TA_CENTER))],
        [Paragraph("Serveur local du client", S_TH_C),
         Paragraph("logiciel et mise en service compris",
                   P(6.4, 8, colors.HexColor("#B9C3E8"), "Helvetica", TA_CENTER))],
    ]]
    for name, desc, eff, host, c1, c2, l1, l2 in rows:
        data.append([
            [Paragraph(name, S_TD), Paragraph(desc, S_TD_SUB)],
            Paragraph(eff, S_TD_N),
            Paragraph(host, S_TD_N),
            year_cell(c1, c2, S_PRICE_A, S_RECUR_A),
            year_cell(l1, l2, S_PRICE_B, S_RECUR_B),
        ])
    t = Table(data, colWidths=[4.2 * cm, 2.3 * cm, 2.2 * cm, 4.75 * cm, 4.75 * cm], repeatRows=1)
    st = base_table_style(5)
    st += [
        ("BACKGROUND", (3, 1), (3, -1), INK_50),
        ("BACKGROUND", (4, 1), (4, -1), GREEN_50),
        ("LINEBEFORE", (3, 0), (3, -1), 0.6, SLATE_200),
        ("LINEBEFORE", (4, 0), (4, -1), 0.6, SLATE_200),
    ]
    t.setStyle(TableStyle(zebra(st, len(data), color=colors.HexColor("#FAFBFD"))))
    els.append(t)
    return els


# (nom, description, effectif, formule cloud,
#  cloud 1re ann\u00e9e, cloud ann\u00e9es suivantes, local 1re ann\u00e9e, local ann\u00e9es suivantes)
PRIMAIRE = [
    ("Petite \u00e9cole", "Quartier, communautaire", "moins de 150 \u00e9l\u00e8ves",
     "Mutualis\u00e9", "430 000", "280 000", "380 000", "180 000"),
    ("\u00c9cole moyenne", "\u00c9tablissement \u00e9tabli", "150 \u00e0 400 \u00e9l\u00e8ves",
     "Mutualis\u00e9", "670 000", "420 000", "670 000", "320 000"),
    ("Grande \u00e9cole", "Groupe scolaire", "400 \u00e0 800 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 S", "1 200 000", "800 000", "1 110 000", "560 000"),
    ("Tr\u00e8s grande \u00e9cole", "Multi-sites, direction centrale", "plus de 800 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 M", "1 800 000", "1 200 000", "1 680 000", "880 000"),
]
COLLEGE = [
    ("Petit coll\u00e8ge", "Quartier, communautaire", "moins de 200 \u00e9l\u00e8ves",
     "Mutualis\u00e9", "500 000", "350 000", "450 000", "250 000"),
    ("Coll\u00e8ge moyen", "\u00c9tablissement \u00e9tabli", "200 \u00e0 500 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 S", "910 000", "660 000", "770 000", "420 000"),
    ("Grand coll\u00e8ge", "\u00c9tablissement important", "500 \u00e0 1 000 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 M", "1 400 000", "1 000 000", "1 230 000", "680 000"),
    ("Tr\u00e8s grand coll\u00e8ge", "Multi-sites, direction centrale", "plus de 1 000 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 L", "2 250 000", "1 650 000", "1 900 000", "1 100 000"),
]
LYCEE = [
    ("Petit lyc\u00e9e", "\u00c9tablissement de proximit\u00e9", "moins de 200 \u00e9l\u00e8ves",
     "Mutualis\u00e9", "550 000", "400 000", "500 000", "300 000"),
    ("Lyc\u00e9e moyen", "\u00c9tablissement \u00e9tabli", "200 \u00e0 500 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 S", "990 000", "740 000", "850 000", "500 000"),
    ("Grand lyc\u00e9e", "Lyc\u00e9e d'envergure", "500 \u00e0 1 000 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 M", "1 520 000", "1 120 000", "1 350 000", "800 000"),
    ("Tr\u00e8s grand lyc\u00e9e", "Multi-s\u00e9ries, BAC et pr\u00e9pa", "plus de 1 000 \u00e9l\u00e8ves",
     "D\u00e9di\u00e9 L", "2 450 000", "1 850 000", "2 100 000", "1 300 000"),
]

story.append(KeepTogether(module_table(
    "Module \u00c9cole primaire",
    "CP1 \u00e0 CM2 \u00b7 Compositions \u00b7 Moyennes et rangs \u00b7 Bilan annuel \u00b7 Passage en classe sup\u00e9rieure",
    PRIMAIRE)))
story.append(Spacer(1, 0.55 * cm))
story.append(KeepTogether(module_table(
    "Module Coll\u00e8ge",
    "6e \u00e0 3e \u00b7 Notes trimestrielles \u00b7 Coefficients par mati\u00e8re \u00b7 Conseil de classe \u00b7 Pr\u00e9paration BEPC",
    COLLEGE)))
story.append(Spacer(1, 0.55 * cm))
story.append(KeepTogether(module_table(
    "Module Lyc\u00e9e",
    "2nde \u00e0 Terminale \u00b7 S\u00e9ries A, C et D \u00b7 Coefficients par s\u00e9rie \u00b7 Orientation \u00b7 Pr\u00e9paration BAC",
    LYCEE)))
story.append(Spacer(1, 0.3 * cm))
story.append(Paragraph(
    "Lecture des tarifs : le prix de <b>1re ann\u00e9e</b> = abonnement + frais de mise en service "
    "(d\u00e9taill\u00e9s ci-dessous). Les ann\u00e9es suivantes, seul l'abonnement est reconduit. "
    "La colonne <b>H\u00e9bergement HorizonEcole</b> comprend le serveur et son exploitation ; "
    "la colonne <b>Serveur local du client</b> ne couvre que le logiciel, le support et les "
    "mises \u00e0 jour \u2014 l'\u00e9tablissement fournit et exploite sa propre machine.", S_NOTE))

# ================================================================ 5. MISE EN SERVICE
setup_head = section(
    "D\u00e9tail des frais de mise en service",
    "D\u00e9j\u00e0 compris dans le prix de 1re ann\u00e9e affich\u00e9 ci-dessus, et factur\u00e9s cette ann\u00e9e-l\u00e0 "
    "uniquement : installation, param\u00e9trage de l'ann\u00e9e scolaire, reprise des donn\u00e9es "
    "existantes, cr\u00e9ation des comptes, formation des \u00e9quipes et accompagnement du "
    "premier trimestre.", top=0.75 * cm)

setup_rows = [[
    Paragraph("Tranche", S_TH),
    Paragraph("Effectif correspondant", S_TH),
    Paragraph("Prestations comprises", S_TH),
    [Paragraph("H\u00e9bergement HorizonEcole", S_TH_C)],
    [Paragraph("Serveur local du client", S_TH_C)],
]]
SETUP = [
    ("Petit \u00e9tablissement", "primaire &lt; 150 \u00b7 coll\u00e8ge et lyc\u00e9e &lt; 200",
     "Param\u00e9trage, import des \u00e9l\u00e8ves, 1 journ\u00e9e de formation", "150 000", "200 000"),
    ("\u00c9tablissement moyen", "primaire 150\u2013400 \u00b7 coll\u00e8ge et lyc\u00e9e 200\u2013500",
     "Param\u00e9trage, reprise des donn\u00e9es, 2 journ\u00e9es de formation", "250 000", "350 000"),
    ("Grand \u00e9tablissement", "primaire 400\u2013800 \u00b7 coll\u00e8ge et lyc\u00e9e 500\u20131 000",
     "Reprise compl\u00e8te, 3 journ\u00e9es de formation, accompagnement d\u00e9di\u00e9", "400 000", "550 000"),
    ("Tr\u00e8s grand \u00e9tablissement", "primaire &gt; 800 \u00b7 coll\u00e8ge et lyc\u00e9e &gt; 1 000",
     "Reprise multi-sites, 5 journ\u00e9es de formation, chef de projet d\u00e9di\u00e9", "600 000", "800 000"),
]
for tranche, eff, presta, c, l in SETUP:
    setup_rows.append([
        Paragraph(tranche, S_TD), Paragraph(eff, S_TD_N), Paragraph(presta, S_TD_N),
        price_cell(c, "FCFA", S_PRICE_A), price_cell(l, "FCFA", S_PRICE_B),
    ])
t = Table(setup_rows, colWidths=[3.0 * cm, 3.7 * cm, 5.4 * cm, 3.05 * cm, 3.05 * cm], repeatRows=1)
st = base_table_style(5)
st += [("BACKGROUND", (3, 1), (3, -1), INK_50),
       ("BACKGROUND", (4, 1), (4, -1), GREEN_50)]
t.setStyle(TableStyle(zebra(st, len(setup_rows), color=colors.HexColor("#FAFBFD"))))
setup_note = Paragraph(
    "La mise en service est plus \u00e9lev\u00e9e en mode serveur local : d\u00e9placement, installation "
    "physique, s\u00e9curisation du syst\u00e8me et mise en place des sauvegardes sur site.", S_NOTE)
story.append(KeepTogether(setup_head + [t, Spacer(1, 0.22 * cm), setup_note]))

# ================================================================ 6. PACKS MULTI-CYCLES
pack_head = section(
    "Packs multi-cycles et groupes scolaires",
    "Un \u00e9tablissement qui exploite plusieurs cycles ne paie qu'un seul h\u00e9bergement : "
    "les remises ci-dessous s'appliquent \u00e0 la somme des abonnements.", top=0.75 * cm)

pack_rows = [[
    Paragraph("Configuration", S_TH), Paragraph("Remise sur les abonnements", S_TH_C),
    Paragraph("H\u00e9bergement", S_TH), Paragraph("Exemple chiffr\u00e9", S_TH),
]]
PACKS = [
    ("Primaire + Coll\u00e8ge", "\u2212 15 %", "une seule formule, selon l'effectif total",
     "300 \u00e9l\u00e8ves + 400 \u00e9l\u00e8ves, serveur local : (320 000 + 420 000) \u2212 15 % = 629 000 FCFA / an"),
    ("Coll\u00e8ge + Lyc\u00e9e", "\u2212 15 %", "une seule formule, selon l'effectif total",
     "450 \u00e9l\u00e8ves + 350 \u00e9l\u00e8ves, serveur local : (420 000 + 500 000) \u2212 15 % = 782 000 FCFA / an"),
    ("Primaire + Coll\u00e8ge + Lyc\u00e9e", "\u2212 25 %", "D\u00e9di\u00e9 L ou XL selon l'effectif total",
     "1 200 \u00e9l\u00e8ves au total, serveur local : (320 000 + 420 000 + 500 000) \u2212 25 % = 930 000 FCFA / an"),
    ("\u00c9tablissement suppl\u00e9mentaire du m\u00eame groupe", "\u2212 30 %",
     "mutualis\u00e9 sur l'instance du groupe",
     "Le 2e site et les suivants b\u00e9n\u00e9ficient de 30 % de remise sur leur abonnement"),
]
for a, b, c, d in PACKS:
    pack_rows.append([
        Paragraph(a, S_TD),
        Paragraph(b, P(11, 13, AMBER, "Helvetica-Bold", TA_CENTER)),
        Paragraph(c, S_TD_N), Paragraph(d, S_TD_N),
    ])
t = Table(pack_rows, colWidths=[4.4 * cm, 2.4 * cm, 4.0 * cm, 7.4 * cm], repeatRows=1)
st = base_table_style(4)
st += [("BACKGROUND", (1, 1), (1, -1), AMBER_50)]
t.setStyle(TableStyle(zebra(st, len(pack_rows), color=colors.HexColor("#FAFBFD"))))
story.append(KeepTogether(pack_head + [t]))

# ================================================================ 7. CONTRATS D'ASSISTANCE
sup_head = section(
    "Contrats d'assistance",
    "L'assistance standard est comprise dans l'abonnement. Pour un accompagnement renforcé, "
    "un contrat peut être souscrit à tout moment de l'année scolaire, pour une durée "
    "minimale de 6 mois, renouvelable.", top=0.75 * cm)

sup_rows = [[
    Paragraph("Formule", S_TH), Paragraph("Ce qui est couvert", S_TH),
    [Paragraph("6 mois", S_TH_C), Paragraph("durée minimale",
                                            P(6.4, 8, colors.HexColor("#B9C3E8"),
                                              "Helvetica", TA_CENTER))],
    [Paragraph("12 mois", S_TH_C)],
    [Paragraph("24 mois", S_TH_C)],
]]
SUPPORT = [
    ("Standard", "comprise dans l'abonnement",
     "E-mail et WhatsApp, du lundi au vendredi de 8 h à 18 h. Prise en charge sous "
     "48 heures ouvrées. Mises à jour correctives et sauvegardes.",
     "incluse", "incluse", "incluse"),
    ("Renforcée", "recommandée la 1re année",
     "Hotline téléphonique et prise en charge sous 24 heures, du lundi au samedi. "
     "Une visite de suivi par trimestre. Assistance à la clôture des bulletins.",
     "180 000", "320 000", "570 000"),
    ("Premium", "grands établissements et multi-sites",
     "Prise en charge sous 4 heures, 7 jours sur 7, interlocuteur dédié. Une visite "
     "mensuelle sur site. Formation continue des nouveaux utilisateurs. Priorité sur "
     "les demandes d'évolution.",
     "300 000", "540 000", "960 000"),
]
for nom, sous, contenu, m6, m12, m24 in SUPPORT:
    incl = (m6 == "incluse")
    cells = []
    for val in (m6, m12, m24):
        if incl:
            cells.append([Paragraph("incluse", P(8.4, 11, GREEN, "Helvetica-Bold", TA_CENTER))])
        else:
            cells.append(price_cell(val, "FCFA", S_PRICE_A))
    sup_rows.append([
        [Paragraph(nom, S_TD), Paragraph(sous, S_TD_SUB)],
        Paragraph(contenu, S_TD_N),
    ] + cells)
t = Table(sup_rows, colWidths=[3.2 * cm, 6.6 * cm, 2.8 * cm, 2.8 * cm, 2.8 * cm], repeatRows=1)
st = base_table_style(5)
st += [("BACKGROUND", (2, 1), (4, 1), GREEN_50),
       ("BACKGROUND", (2, 2), (4, -1), INK_50)]
t.setStyle(TableStyle(zebra(st, len(sup_rows), color=colors.HexColor("#FAFBFD"))))
sup_note = Paragraph(
    "Souscription possible en cours d'année, par période de 6 mois indivisible. Le contrat "
    "prend effet à la date de signature et se renouvelle par tacite reconduction, sauf "
    "dénonciation un mois avant le terme. Les interventions sur site sont comprises dans "
    "les formules Renforcée et Premium à Abidjan ; les frais de déplacement à l'intérieur "
    "du pays restent facturés au réel.", S_NOTE)
story.append(KeepTogether(sup_head + [t, Spacer(1, 0.22 * cm), sup_note]))

story.append(PageBreak())

# ================================================================ 8. OPTIONS
story += section(
    "Modules et prestations compl\u00e9mentaires",
    "\u00c0 souscrire librement, en plus de l'abonnement annuel.",
    top=0.15 * cm)

opt_rows = [[
    Paragraph("Prestation", S_TH), Paragraph("Description", S_TH),
    [Paragraph("Tarif", S_TH_C)],
]]
OPTS = [
    ("Module Paie &amp; RH du personnel",
     "Bulletins de paie, bar\u00e8me d'anciennet\u00e9, contrats, heures effectu\u00e9es, acomptes et prorata",
     "200 000", "FCFA / an"),
    ("Module Budget &amp; comptabilit\u00e9",
     "Lignes budg\u00e9taires, transactions, justificatifs, bilan et tableau de tr\u00e9sorerie",
     "180 000", "FCFA / an"),
    ("Notifications SMS et WhatsApp",
     "Alertes d'absence, rappels d'\u00e9ch\u00e9ance, publication des bulletins (co\u00fbt des SMS en sus)",
     "90 000", "FCFA / an"),
    ("Sauvegarde externalis\u00e9e",
     "Sauvegarde quotidienne chiffr\u00e9e hors site \u2014 recommand\u00e9e en mode serveur local",
     "80 000", "FCFA / an"),
    ("Nom de domaine et certificat SSL",
     "Inclus dans toutes les formules Cloud ; factur\u00e9 uniquement en mode serveur local",
     "30 000", "FCFA / an"),
    ("Journ\u00e9e de formation suppl\u00e9mentaire",
     "Sur site, jusqu'\u00e0 15 participants (Abidjan)",
     "75 000", "FCFA / jour"),
    ("Intervention sur site hors forfait",
     "D\u00e9placement et intervention technique (Abidjan ; frais de transport en sus \u00e0 l'int\u00e9rieur)",
     "50 000", "FCFA / intervention"),
    ("Reprise de donn\u00e9es suppl\u00e9mentaire",
     "Import d'un historique de notes ou de paiements au-del\u00e0 de l'ann\u00e9e en cours",
     "120 000", "FCFA / ann\u00e9e reprise"),
]
for a, b, c, u in OPTS:
    opt_rows.append([
        Paragraph(a, S_TD), Paragraph(b, S_TD_N),
        price_cell(c, u, S_PRICE_A),
    ])
t = Table(opt_rows, colWidths=[5.2 * cm, 8.6 * cm, 4.4 * cm], repeatRows=1)
st = base_table_style(3)
st += [("BACKGROUND", (2, 1), (2, -1), INK_50)]
t.setStyle(TableStyle(zebra(st, len(opt_rows), color=colors.HexColor("#FAFBFD"))))
story.append(t)

# ================================================================ 8. CONDITIONS
cond_head = section("Conditions commerciales", top=0.75 * cm)

CONDS_L = [
    ("Facturation", "Prix en FCFA (XOF) hors taxes. TVA de 18 % en sus si l'\u00e9tablissement y est assujetti."),
    ("\u00c9ch\u00e9ancier", "60 % \u00e0 la signature, 40 % \u00e0 la mise en service. Abonnement payable annuellement d'avance, en d\u00e9but d'ann\u00e9e scolaire."),
    ("Moyens de paiement", "Virement bancaire, ch\u00e8que, Orange Money, MTN MoMo, Moov Money, Wave."),
    ("Paiement pluriannuel", "\u2212 10 % pour 2 ann\u00e9es r\u00e9gl\u00e9es d'avance, \u2212 15 % pour 3 ann\u00e9es."),
]
CONDS_R = [
    ("Tarif solidaire", "\u2212 20 % sur l'abonnement pour les \u00e9tablissements publics, confessionnels et associatifs."),
    ("Assistance", "Formule Standard comprise dans l'abonnement. Contrats Renforc\u00e9e et Premium souscriptibles \u00e0 partir de 6 mois, \u00e0 tout moment de l'ann\u00e9e."),
    ("R\u00e9vision des prix", "L'h\u00e9bergement \u00e9tant factur\u00e9 en devise \u00e9trang\u00e8re, la part h\u00e9bergement peut \u00eatre r\u00e9vis\u00e9e si le taux USD/FCFA varie de plus de 10 %."),
    ("R\u00e9versibilit\u00e9", "\u00c0 tout moment, export complet des donn\u00e9es de l'\u00e9tablissement (SQL et PDF) sans frais. Les donn\u00e9es appartiennent \u00e0 l'\u00e9tablissement."),
]


def cond_block(items):
    rows = []
    for k, v in items:
        rows.append([[Paragraph(k, P(8, 10.2, INK, "Helvetica-Bold")),
                      Spacer(1, 0.05 * cm),
                      Paragraph(v, S_CARD_B)]])
    t = Table(rows, colWidths=[USABLE / 2 - 0.25 * cm])
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("TOPPADDING", (0, 0), (-1, -1), 5),
             ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
             ("LEFTPADDING", (0, 0), (-1, -1), 8),
             ("RIGHTPADDING", (0, 0), (-1, -1), 8),
             ("LINEBELOW", (0, 0), (-1, -2), 0.4, SLATE_200),
             ("BOX", (0, 0), (-1, -1), 0.6, SLATE_200)]
    t.setStyle(TableStyle(style))
    return t


conds = Table([[cond_block(CONDS_L), cond_block(CONDS_R)]],
              colWidths=[USABLE / 2, USABLE / 2])
conds.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (0, 0), 0),
    ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story.append(KeepTogether(cond_head + [conds]))

story.append(Spacer(1, 0.55 * cm))
final = Table([[
    [Paragraph("Base de calcul de la part h\u00e9bergement",
               P(7.6, 10, AMBER, "Helvetica-Bold")),
     Spacer(1, 0.1 * cm),
     Paragraph("Les formules Cloud s'appuient sur des serveurs VPS de gamme KVM 1 \u00e0 KVM 8 "
               "(1 \u00e0 8 vCPU, 4 \u00e0 32 Go de RAM). Le co\u00fbt op\u00e9rateur est calcul\u00e9 sur les tarifs "
               "de renouvellement du fournisseur, convertis \u00e0 1 USD \u2248 600 FCFA, auxquels "
               "s'ajoutent les sauvegardes, la supervision, le nom de domaine et le temps "
               "d'exploitation. Le prix indiqu\u00e9 est ferme pour l'ann\u00e9e scolaire en cours.",
               S_NOTE)],
]], colWidths=[USABLE])
final.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), AMBER_50),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 9),
    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
]))
story.append(final)

# ---------------------------------------------------------------- document
doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=MARGIN_X, rightMargin=MARGIN_X,
    topMargin=1.6 * cm, bottomMargin=1.6 * cm,
    title="Grille Tarifaire HorizonEcole",
    author="HorizonEcole",
    subject="Tarifs FCFA \u2014 Primaire, Coll\u00e8ge, Lyc\u00e9e \u2014 Cloud ou serveur local",
)
frame_first = Frame(MARGIN_X, 1.6 * cm, USABLE, PAGE_H - 1.2 * cm - 1.6 * cm, id="first",
                    leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
frame_rest = Frame(MARGIN_X, 1.6 * cm, USABLE, PAGE_H - 1.5 * cm - 1.6 * cm - 0.55 * cm, id="rest",
                   leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([
    PageTemplate(id="first", frames=[frame_first], onPage=draw_page),
    PageTemplate(id="rest", frames=[frame_rest], onPage=draw_page),
])

doc.build(story)
print("OK ->", OUT)
