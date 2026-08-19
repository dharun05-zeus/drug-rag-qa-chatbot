import os
import fitz  # PyMuPDF

# Setup paths relative to script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

pdf_path = os.path.join(DATA_DIR, "rinvoq_label.pdf")

def create_rinvoq_pdf():
    print("--- Creating Real RINVOQ Prescribing PDF ---")
    doc = fitz.open()  # Create empty PDF

    # Page 1: Highlights, Indications & Usage
    page1 = doc.new_page()
    text_page1 = (
        "HIGHLIGHTS OF PRESCRIBING INFORMATION\n"
        "These highlights do not include all the information needed to use RINVOQ/RINVOQ LQ safely and effectively. "
        "See full prescribing information for RINVOQ/RINVOQ LQ.\n\n"
        "RINVOQ® (upadacitinib) extended-release tablets, for oral use\n"
        "RINVOQ® LQ (upadacitinib) oral solution\n"
        "Initial U.S. Approval: 2019\n\n"
        "WARNING: SERIOUS INFECTIONS, MORTALITY, MALIGNANCY, MAJOR ADVERSE CARDIOVASCULAR EVENTS (MACE), and THROMBOSIS\n"
        "See full prescribing information for complete boxed warning.\n"
        " - Increased risk of serious bacterial, fungal, viral, and opportunistic infections leading to hospitalization or death, including tuberculosis (TB).\n"
        " - Higher rate of all-cause mortality, including sudden cardiovascular death with another Janus kinase (JAK) inhibitor vs. TNF blockers.\n"
        " - Malignancies (lymphomas, lung cancers) have occurred.\n"
        " - Major Adverse Cardiovascular Events (MACE) such as cardiovascular death, myocardial infarction, and stroke.\n"
        " - Thrombosis (pulmonary embolism, deep vein thrombosis, arterial thrombosis).\n\n"
        "1. INDICATIONS AND USAGE\n"
        "RINVOQ is a Janus kinase (JAK) inhibitor indicated for:\n"
        " - Rheumatoid Arthritis (RA): Treatment of adults with moderately to severely active RA who have had an inadequate response or intolerance to one or more TNF blockers.\n"
        " - Psoriatic Arthritis (PsA): Treatment of adults and pediatric patients 2 years and older with active PsA who have had inadequate response/intolerance to TNF blockers.\n"
        " - Atopic Dermatitis (AD): Adults and pediatric patients 12 years and older weighing >= 40 kg with refractory, moderate to severe AD.\n"
        " - Ulcerative Colitis (UC): Adults with moderately to severely active UC who have had inadequate response/intolerance to one or more TNF blockers.\n"
        " - Crohn's Disease (CD): Adults with moderately to severely active CD who have had inadequate response/intolerance to one or more TNF blockers.\n"
        " - Ankylosing Spondylitis (AS): Adults with active AS who have had inadequate response/intolerance to TNF blockers."
    )
    page1.insert_text((50, 50), text_page1, fontsize=9, fontname="helv")

    # Page 2: Dosage & Administration
    page2 = doc.new_page()
    text_page2 = (
        "2. DOSAGE AND ADMINISTRATION\n\n"
        "General Administration Instructions:\n"
        " - RINVOQ LQ oral solution is NOT substitutable with RINVOQ extended-release tablets on a milligram-per-milligram basis.\n"
        " - Prior to treatment initiation: Update immunizations. Evaluate for active/latent TB, viral hepatitis, hepatic function, and pregnancy status.\n"
        " - Avoid initiation if: Absolute Lymphocyte Count (ALC) < 500 cells/mm3, Absolute Neutrophil Count (ANC) < 1000 cells/mm3, or Hemoglobin < 8 g/dL.\n"
        " - RINVOQ tablets should be swallowed whole. Do not split, crush, or chew.\n\n"
        "Recommended Dosages:\n"
        " - Rheumatoid Arthritis: Adults: 15 mg once daily.\n"
        " - Psoriatic Arthritis: Adults: 15 mg once daily. Pediatric patients 2 to <18 years (>= 10 kg): Weight-based dosing (Table 1).\n"
        "   * 10 kg to < 20 kg: 3 mg twice daily (RINVOQ LQ oral solution).\n"
        "   * 20 kg to < 30 kg: 4 mg twice daily (RINVOQ LQ oral solution).\n"
        "   * 30 kg and greater: 6 mg twice daily (RINVOQ LQ) or 15 mg tablet once daily.\n"
        " - Atopic Dermatitis: Initiate with 15 mg once daily. If response is inadequate, consider increasing to 30 mg once daily. For adults >= 65 years, recommended dosage is 15 mg once daily.\n"
        " - Ulcerative Colitis: Adults: Recommended induction dosage is 45 mg once daily for 8 weeks. Maintenance dosage is 15 mg once daily. A maintenance dosage of 30 mg once daily may be considered for patients with refractory, severe, or extensive disease. Discontinue if response is not achieved at 30 mg.\n"
        " - Crohn's Disease: Adults: Recommended induction dosage is 45 mg once daily for 12 weeks. Maintenance dosage is 15 mg once daily. A maintenance dosage of 30 mg once daily may be considered for refractory/extensive disease."
    )
    page2.insert_text((50, 50), text_page2, fontsize=9, fontname="helv")

    # Page 3: Specific Populations (Renal/Hepatic) & Storage details
    page3 = doc.new_page()
    text_page3 = (
        "2.12 Dosage in Patients with Renal or Hepatic Impairment\n\n"
        "Renal Impairment:\n"
        " - RA, PsA, AS: No dosage adjustment needed for mild, moderate, or severe renal impairment.\n"
        " - Atopic Dermatitis: Maximum recommended dosage is 15 mg once daily for patients with severe renal impairment (eGFR 15 to < 30 mL/min/1.73m2). No adjustment for mild/moderate.\n"
        " - Ulcerative Colitis & Crohn's Disease:\n"
        "   * Severe Renal Impairment (eGFR 15 to < 30): Induction: 30 mg once daily (for 8 weeks in UC, 12 weeks in CD). Maintenance: 15 mg once daily.\n"
        " - End-Stage Renal Disease (eGFR < 15): RINVOQ is not recommended for use.\n\n"
        "Hepatic Impairment:\n"
        " - Severe Hepatic Impairment (Child-Pugh C): RINVOQ/RINVOQ LQ is not recommended for use.\n"
        " - Mild to Moderate Hepatic Impairment (Child-Pugh A or B): No adjustment needed for RA, PsA, AD, AS. For UC and CD with moderate hepatic impairment, recommended dosage is:\n"
        "   * Induction: 30 mg once daily. Maintenance: 15 mg once daily.\n\n"
        "7. DRUG INTERACTIONS\n"
        " - Strong CYP3A4 Inhibitors (e.g., ketoconazole, clarithromycin, grapefruit):\n"
        "   * RA, PsA, AS: Monitor closely for adverse reactions.\n"
        "   * Atopic Dermatitis: Recommended dosage is 15 mg once daily.\n"
        "   * Ulcerative Colitis & Crohn's Disease: Reduce induction dosage to 30 mg once daily. Maintenance dosage is 15 mg once daily.\n"
        " - Strong CYP3A4 Inducers (e.g., rifampin): Coadministration is not recommended.\n\n"
        "16. STORAGE AND HANDLING\n"
        " - Store RINVOQ tablets between 36°F to 77°F (2°C to 25°C).\n"
        " - Store in the original bottle in order to protect from moisture.\n"
        " - Store RINVOQ LQ oral solution between 36°F to 86°F (2°C to 30°C).\n"
        " - Discard remaining oral solution 60 days after opening the bottle."
    )
    page3.insert_text((50, 50), text_page3, fontsize=9, fontname="helv")

    # Page 4: Adverse Reactions (Side Effects)
    page4 = doc.new_page()
    text_page4 = (
        "6. ADVERSE REACTIONS (SIDE EFFECTS)\n\n"
        "The most common adverse reactions observed in clinical trials are:\n"
        " - Rheumatoid Arthritis, Psoriatic Arthritis, Ankylosing Spondylitis, and Non-radiographic Axial Spondyloarthritis:\n"
        "   Adverse reactions (>= 1%) were: upper respiratory tract infections, herpes zoster, herpes simplex, bronchitis, nausea, cough, pyrexia, acne, and headache.\n"
        " - Giant Cell Arteritis:\n"
        "   Adverse reactions (>= 5%) are: upper respiratory tract infections, headache, fatigue, peripheral edema, cough, anemia, rash, herpes zoster, and nausea.\n"
        " - Atopic Dermatitis:\n"
        "   Adverse reactions (>= 1%) are: upper respiratory tract infections, acne, herpes simplex, headache, blood creatine phosphokinase increased, cough, hypersensitivity, folliculitis, nausea, abdominal pain, pyrexia, increased weight, herpes zoster, influenza, fatigue, neutropenia, myalgia, and influenza-like illness.\n"
        " - Ulcerative Colitis:\n"
        "   Adverse reactions (>= 5%) reported during induction or maintenance are: upper respiratory tract infections, increased blood creatine phosphokinase, acne, neutropenia, elevated liver enzymes, pyrexia, and rash.\n"
        " - Crohn's Disease:\n"
        "   Adverse reactions (>= 5%) reported during induction or maintenance are: upper respiratory tract infections, anemia, pyrexia, acne, herpes zoster, and headache."
    )
    page4.insert_text((50, 50), text_page4, fontsize=9, fontname="helv")

    doc.save(pdf_path)
    doc.close()
    print(f"Created RINVOQ prescribing PDF at: {pdf_path}")

if __name__ == "__main__":
    create_rinvoq_pdf()
