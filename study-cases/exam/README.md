# Exam-Score Case Study — dataset and Python project

This folder is a complete, runnable version of the Neuron Lab **Exam case**.

## Files

| File | Purpose |
| --- | --- |
| `exam_data.xlsx` | All 1,200 generated students, the 10 batch sheets, validation and test sheets, and instructions. |
| `train_exam.py` | Reads the workbook, trains the 2 → 3 → 1 network, evaluates it, and writes results. |
| `requirements.txt` | Python libraries used by the script. |
| `setup.ps1` | One-command Windows setup (creates `.venv`, installs requirements). |
| `setup.sh` | Equivalent setup for macOS/Linux. |
| `README.md` | This guide. |

`results_exam.xlsx` is created after training.

## Workbook sheets

- **README** — the same explanation inside Excel.
- **Summary** — row counts, seed, network shape, weights, biases, batches.
- **Full_Data** — 1,200 rows with:
  - `student_id`
  - `split` (`train`, `validation`, `test`)
  - `batch` (1–10 for training rows)
  - `study_hours`
  - `attendance`
  - `exam_score` (the target)
- **Batch_01 … Batch_10** — each training batch, 100 complete rows.
- **Validation** — 100 held-out students.
- **Test** — 100 students opened at the end.

The first four rows are the illustrative examples used in the lesson:

| Student | Study hours/week | Attendance | Exam score |
| --- | ---: | ---: | ---: |
| 1 | 5 | 70 | 58 |
| 2 | 10 | 85 | 75 |
| 3 | 15 | 95 | 89 |
| 4 | 8 | 80 | 68 |

The data is synthetic and generated with seed 42. Study habits help predict a
score but do not completely determine it.

## Create the environment (Windows PowerShell)

Open PowerShell in this folder:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python train_exam.py
```

If PowerShell blocks activation, run this once in the same window:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate again.

Or run `setup.ps1`, which creates the environment and installs the libraries.

## Create the environment (macOS / Linux)

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python train_exam.py
```

Or run `bash setup.sh`.

## How the script imports the Excel file

The important line is:

```python
frame = pd.read_excel(DATA_FILE, sheet_name="Full_Data")
```

`DATA_FILE` is `exam_data.xlsx` in the same folder as the script. The script
uses `openpyxl` behind the scenes, which is why `openpyxl` is in
`requirements.txt`.

It then selects the training rows with:

```python
train = frame[frame["split"] == "train"]
```

and reads `study_hours` and `attendance` as the two inputs and `exam_score` as
the target. The target is standardized during training for stable gradients,
then converted back to a score out of 100 for the report.

## What the script does

- Uses the same 2 → 3 → 1 network: 2 inputs, 3 ReLU hidden neurons, 1 linear output.
- Counts **9 weights and 4 biases**, independent of the number of students.
- Uses seed **42** for the starting weights.
- Trains for **10 epochs** with **10 batches of 100** per epoch.
- Each batch produces **one average loss, one set of gradients, and one update**.
- The next batch starts from the updated weights.
- Evaluates MAE/RMSE before and after training on train, validation, and test.
- Writes `results_exam.xlsx` with:
  - **Metrics**
  - **Training_History**
  - **Predictions** for the first four students.

## Expected output

You should see 1,000 training rows, 100 validation rows, and 100 test rows;
10 batch sheets of 100 rows; 9 weights and 4 biases; 100 updates; and a lower
MAE after training. The exact numbers are printed when you run the script.

## Common problems

- **`ModuleNotFoundError: pandas`** — activate the virtual environment and run
  `python -m pip install -r requirements.txt`.
- **`Missing exam_data.xlsx`** — keep the workbook and the script in the same folder.
- **`Permission denied` while activating on Windows** — use the
  `Set-ExecutionPolicy -Scope Process` command above.
- **Excel asks about the file** — it is a normal `.xlsx` workbook; open it read-only if you only want to inspect it.
