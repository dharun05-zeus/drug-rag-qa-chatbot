import os
import fitz  # PyMuPDF

# Setup paths relative to script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

pdf_path = os.path.join(DATA_DIR, "hackathonol_label.pdf")

def create_mock_pdf():
    print("--- Creating Mock Prescribing PDF ---")
    doc = fitz.open()  # Create a new empty PDF document

    # Page 1: Prescribing Highlights, Indications & Dosage Instructions
    page1 = doc.new_page()
    text_page1 = (
        "HACKATHONOL (ragcillin sodium) Tablets, for Oral Use\n\n"
        "HIGHLIGHTS OF PRESCRIBING INFORMATION\n"
        "These highlights do not include all the information needed to use HACKATHONOL safely. "
        "See full prescribing information below.\n\n"
        "1. INDICATIONS AND USAGE\n"
        "Hackathonol is a cognitive stabilizer indicated for:\n"
        " - Alleviation of hackathon presentation stress and coding anxiety.\n"
        " - Support in resolving complex syntax errors and compiler warnings.\n"
        " - Enhancing logical reasoning during late-night code development.\n\n"
        "2. DOSAGE AND ADMINISTRATION\n"
        " - The standard starting dose is 10 mg taken orally once daily in the morning.\n"
        " - The maximum recommended daily dose is 20 mg.\n"
        " - Missed Dose: If a dose of Hackathonol is missed, the patient should take it as "
        "soon as they remember. If it is close to the next scheduled dose, the patient should "
        "skip the missed dose and resume the normal daily schedule. Patients must NOT double "
        "their dose to make up for a missed one."
    )
    # Write text to first page
    page1.insert_text((50, 50), text_page1, fontsize=11, fontname="helv")

    # Page 2: Warnings, Adverse Reactions (Side Effects) & Storage Details
    page2 = doc.new_page()
    text_page2 = (
        "HACKATHONOL Prescribing Information (Continued)\n\n"
        "3. WARNINGS AND PRECAUTIONS\n"
        " - Excessive usage may lead to extreme caffeine dependency or severe sleep deprivation.\n"
        " - Avoid mixing Hackathonol with undocumented code blocks or legacy spaghetti architectures.\n\n"
        "4. ADVERSE REACTIONS (SIDE EFFECTS)\n"
        "The most common adverse reactions (incidence >= 5%) associated with Hackathonol are:\n"
        " - Late-night coding euphoria (12%)\n"
        " - Mild syntax errors (8%)\n"
        " - Increased energy drink consumption (15%)\n"
        " - Spontaneous keyboard typing (6%)\n\n"
        "5. HOW SUPPLIED / STORAGE AND HANDLING\n"
        " - Hackathonol is supplied as 10 mg blue, capsule-shaped tablets.\n"
        " - Storage: Store at room temperature between 68°F to 77°F (20°C to 25°C) in a dry place. "
        "Keep the container tightly closed to protect from humidity."
    )
    # Write text to second page
    page2.insert_text((50, 50), text_page2, fontsize=11, fontname="helv")

    # Save PDF to backend/data folder
    doc.save(pdf_path)
    doc.close()
    
    print(f"Success! Mock prescribing label created at: {pdf_path}")
    print("You can now run 'python ingest.py' to embed and load this document into ChromaDB!")

if __name__ == "__main__":
    create_mock_pdf()
