"""Build the downloadable Excel workbooks and Python project ZIPs for both cases.

Run from the repository root:
    python scripts/export_study_cases.py

It writes:
  frontend/public/downloads/house/...
  frontend/public/downloads/exam/...
  <Desktop>/NeuronLab-Study-Cases/...
"""
from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

import numpy as np
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
STUDY = ROOT / "study-cases"
GUIDE = STUDY / "student-build-guide.pdf"
PUBLIC = ROOT / "frontend" / "public" / "downloads"
DESKTOP = Path.home() / "Desktop" / "NeuronLab-Study-Cases"

HEADER_FILL = PatternFill("solid", fgColor="13294B")
HEADER_FONT = Font(color="FFFFFF", bold=True)
TITLE_FONT = Font(color="13294B", bold=True, size=16)
MUTED_FONT = Font(color="5B6472", italic=True)
THIN = Side(style="thin", color="D8DEE8")
BORDER = Border(bottom=THIN)
SPLIT_FILLS = {
    "train": PatternFill("solid", fgColor="E8F7EE"),
    "validation": PatternFill("solid", fgColor="FFF4DE"),
    "test": PatternFill("solid", fgColor="EDE9FF"),
}


def house_rows(seed: int = 42):
    rng = np.random.default_rng(seed)
    total = 1200
    area = rng.integers(80, 301, size=total).astype(float)
    bedrooms = rng.integers(1, 6, size=total).astype(float)
    area[:3] = [120.0, 180.0, 250.0]
    bedrooms[:3] = [2.0, 3.0, 4.0]
    price = 500.0 * area - 10_000.0 * bedrooms + 5_000.0 + rng.normal(0.0, 2_400.0, total)
    price[:3] = [45_000.0, 65_000.0, 90_000.0]
    price = np.maximum(price, 15_000.0)
    order = np.random.default_rng(seed + 1).permutation(1000)
    batches = {int(index): position // 100 + 1 for position, index in enumerate(order)}
    rows = []
    for index in range(total):
        split = "train" if index < 1000 else "validation" if index < 1100 else "test"
        rows.append({
            "row_id": index + 1,
            "split": split,
            "batch": batches.get(index) if split == "train" else None,
            "area_m2": int(area[index]),
            "bedrooms": int(bedrooms[index]),
            "price_omr": int(round(float(price[index]))),
        })
    return rows, {
        "case": "House-Price Case Study",
        "features": ["area_m2 (m²)", "bedrooms"],
        "target": "price_omr (OMR)",
        "target_key": "price_omr",
        "id": "row_id",
        "rows": ["row_id", "split", "batch", "area_m2", "bedrooms", "price_omr"],
        "first": [
            [1, "train", "120 m²", "2", "45,000"],
            [2, "train", "180 m²", "3", "65,000"],
            [3, "train", "250 m²", "4", "90,000"],
        ],
        "unit": "OMR",
        "network": "2 inputs → 3 hidden neurons (ReLU) → 1 output (Linear)",
        "weights": 9,
        "biases": 4,
        "python": "train_house.py",
        "excel": "house_data.xlsx",
        "readme": "train_house.py",
        "script": "house-python.zip",
        "slug": "house",
        "folder": "House-Price-Case",
        "file": "house_data.xlsx",
        "image": "house-prices-thumb.webp",
    }


def exam_rows(seed: int = 42):
    rng = np.random.default_rng(seed)
    total = 1200
    study = rng.uniform(1.0, 20.0, size=total).round()
    attendance = rng.integers(50, 101, size=total).astype(float)
    study[:4] = [5.0, 10.0, 15.0, 8.0]
    attendance[:4] = [70.0, 85.0, 95.0, 80.0]
    score = 10.0 + 3.0 * study + 0.5 * attendance + rng.normal(0.0, 3.0, total)
    score[:4] = [58.0, 75.0, 89.0, 68.0]
    score = np.clip(score, 0.0, 100.0)
    order = np.random.default_rng(seed + 1).permutation(1000)
    batches = {int(index): position // 100 + 1 for position, index in enumerate(order)}
    rows = []
    for index in range(total):
        split = "train" if index < 1000 else "validation" if index < 1100 else "test"
        rows.append({
            "student_id": index + 1,
            "split": split,
            "batch": batches.get(index) if split == "train" else None,
            "study_hours": int(study[index]),
            "attendance": int(attendance[index]),
            "exam_score": int(round(float(score[index]))),
        })
    return rows, {
        "case": "Exam-Score Case Study",
        "features": ["study_hours (hours/week)", "attendance (%)"],
        "target": "exam_score (out of 100)",
        "target_key": "exam_score",
        "id": "student_id",
        "rows": ["student_id", "split", "batch", "study_hours", "attendance", "exam_score"],
        "first": [
            [1, "train", "5", "70%", "58"],
            [2, "train", "10", "85%", "75"],
            [3, "train", "15", "95%", "89"],
            [4, "train", "8", "80%", "68"],
        ],
        "unit": "points / 100",
        "network": "2 inputs → 3 hidden neurons (ReLU) → 1 output (Linear)",
        "weights": 9,
        "biases": 4,
        "python": "train_exam.py",
        "excel": "exam_data.xlsx",
        "readme": "train_exam.py",
        "script": "exam-python.zip",
        "slug": "exam",
        "folder": "Exam-Score-Case",
        "file": "exam_data.xlsx",
        "image": "exam-poster-en-thumb.webp",
    }


def write_sheet(ws, headers, rows, widths=None):
    ws.append(headers)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER
    for row in rows:
        ws.append(row)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    for index, header in enumerate(headers, 1):
        width = (widths or {}).get(header, max(12, len(str(header)) + 3))
        ws.column_dimensions[get_column_letter(index)].width = width
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top")
            cell.border = BORDER


def add_readme_sheet(ws, meta, rows):
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 86
    ws["A1"] = meta["case"]
    ws["A1"].font = TITLE_FONT
    ws["A2"] = "Complete synthetic dataset for the Neuron Lab study case"
    ws["A2"].font = MUTED_FONT
    lines = [
        ("Features", " • ".join(meta["features"])),
        ("Target", meta["target"]),
        ("Rows", "1,000 train + 100 validation + 100 test = 1,200"),
        ("Network", meta["network"]),
        ("Parameters", "9 weights + 4 biases = 13 trainable values"),
        ("Seed", "42"),
        ("Batches", "10 batches × 100 training rows; one update per batch"),
        ("Epochs", "10 epochs × 10 batches = 100 updates"),
        ("Full data sheet", "Full_Data contains every row, its split and batch number"),
        ("Batch sheets", "Batch_01 … Batch_10 contain 100 complete rows each"),
        ("Validation", "100 held-out rows; no weight updates"),
        ("Test", "100 held-out rows; opened once at the end"),
        ("Data note", "Illustrative synthetic data generated reproducibly with seed 42."),
        ("Python", "See train_house.py / train_exam.py and README.md in the downloaded project."),
    ]
    row_index = 4
    for label, value in lines:
        ws.cell(row=row_index, column=1, value=label).font = Font(bold=True, color="13294B")
        ws.cell(row=row_index, column=2, value=value).alignment = Alignment(wrap_text=True)
        row_index += 1
    row_index += 1
    ws.cell(row=row_index, column=1, value="First illustrative rows").font = Font(bold=True, color="13294B")
    row_index += 1
    headers = ["#", "split", *[feature.split(" ")[0] for feature in meta["features"]], "target"]
    for column, header in enumerate(headers, 1):
        cell = ws.cell(row=row_index, column=column, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    for offset, item in enumerate(meta["first"], 1):
        for column, value in enumerate(item, 1):
            ws.cell(row=row_index + offset, column=column, value=value)


def build_workbook(meta, rows, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.title = "README"
    add_readme_sheet(ws, meta, rows)

    summary = wb.create_sheet("Summary")
    summary.column_dimensions["A"].width = 24
    summary.column_dimensions["B"].width = 42
    summary["A1"] = meta["case"]
    summary["A1"].font = TITLE_FONT
    summary_rows = [
        ("Training rows", sum(1 for row in rows if row["split"] == "train")),
        ("Validation rows", sum(1 for row in rows if row["split"] == "validation")),
        ("Test rows", sum(1 for row in rows if row["split"] == "test")),
        ("Weights", meta["weights"]),
        ("Biases", meta["biases"]),
        ("Parameters", meta["weights"] + meta["biases"]),
        ("Batch size", 100),
        ("Batches per epoch", 10),
        ("Updates per 10 epochs", 100),
        ("Seed", 42),
    ]
    for index, (label, value) in enumerate(summary_rows, 3):
        summary.cell(row=index, column=1, value=label).font = Font(bold=True)
        summary.cell(row=index, column=2, value=value)

    headers = meta["rows"]
    full = [[row[header] for header in headers] for row in rows]
    write_sheet(wb.create_sheet("Full_Data"), headers,
                full, {headers[0]: 12, "split": 14, "batch": 10})
    for batch in range(1, 11):
        batch_rows = [[row[header] for header in headers] for row in rows if row["batch"] == batch]
        write_sheet(wb.create_sheet(f"Batch_{batch:02d}"), headers,
                    batch_rows, {headers[0]: 12, "split": 14, "batch": 10})
    for split in ("validation", "test"):
        split_rows = [[row[header] for header in headers] for row in rows if row["split"] == split]
        write_sheet(wb.create_sheet(split.capitalize()), headers,
                    split_rows, {headers[0]: 12, "split": 14, "batch": 10})
    wb.save(target)


def copy_project(meta, excel: Path, target: Path):
    target.mkdir(parents=True, exist_ok=True)
    for name in (meta["python"], "README.md", "requirements.txt", "setup.ps1", "setup.sh"):
        shutil.copy2(STUDY / meta["slug"] / name, target / name)
    shutil.copy2(excel, target / excel.name)
    if GUIDE.is_file():
        shutil.copy2(GUIDE, target / "STUDENT_BUILD_GUIDE.pdf")


def build_zip(meta, folder: Path, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(folder.iterdir()):
            if path.is_file() and path.name not in {"results_house.xlsx", "results_exam.xlsx"}:
                archive.write(path, arcname=path.name)
                if path.suffix == ".sh":
                    info = archive.getinfo(path.name)
                    info.external_attr = 0o755 << 16


def main():
    for builder in (house_rows, exam_rows):
        data, details = builder()
        public_folder = PUBLIC / details["slug"]
        public_folder.mkdir(parents=True, exist_ok=True)
        excel = public_folder / details["excel"]
        build_workbook(details, data, excel)
        desktop = DESKTOP / details["folder"]
        copy_project(details, excel, desktop)
        build_zip(details, desktop, public_folder / details["script"])
        # A direct copy of the notebook-free starter script for easy reading.
        shutil.copy2(STUDY / details["slug"] / details["python"], public_folder / details["python"])
        print(f"{details['case']}: {excel.stat().st_size/1024:.0f} KB workbook, "
              f"{(public_folder / details['script']).stat().st_size/1024:.0f} KB project")
    DESKTOP.mkdir(parents=True, exist_ok=True)
    if GUIDE.is_file():
        shutil.copy2(GUIDE, PUBLIC / "student-build-guide.pdf")
        shutil.copy2(GUIDE, DESKTOP / "student-build-guide.pdf")
    (DESKTOP / "README.md").write_text(
        "# Neuron Lab study cases\n\n"
        "Two complete, downloadable case studies:\n\n"
        "- **House-Price-Case** — area and bedrooms → price.\n"
        "- **Exam-Score-Case** — study hours and attendance → exam score.\n\n"
        "Each folder contains the Excel workbook, the Python training script, the requirements, "
        "the setup helpers, and a README with the environment and install commands.\n",
        encoding="utf-8",
    )
    print("Desktop folder:", DESKTOP)


if __name__ == "__main__":
    main()
