# Neuron Lab

Neuron Lab is a local teaching simulator for neural networks and the transformer block behind language models. Start with **one neuron by hand**, pick any neuron, and watch its inputs travel along the connections, multiply by their weights, add up, take the bias, and pass through an activation rule. Then open the **Worked examples** gallery to step through complete forward and backward passes with every number on screen, and the **LLM playground** to see the same ideas scale up: words become tokens, tokens become vectors, attention decides which earlier words matter, and cross-entropy backpropagation adjusts the weights.

The interface is built as a classroom story: guided presets, a four-step quest, a six-stage forward-pass animation with the actual numbers riding the connections, a training view that shows every gradient update, a worked-example gallery for backpropagation, a tiny word-level transformer that explains next-token prediction and attention, a **reading room** that points students toward the books, papers, videos, posts, and podcasts worth their time, and a **screening room** of the best current LLM lectures.

## At a glance

![The classroom overview with the journey cards, quest bar, network diagram, and inspector](docs/screenshots/classroom.png)

The main network shows signal flow **only while a forward pass is running**. Every moving value packet carries a gold arrow on a parallel lane just below it, with the same phase and timing, so the arrow, the packet, and the calculation move together:

![Gold arrows on the lane below each value packet during the Sum step](docs/screenshots/network-arrows.gif)

Use the **− / + / Fit** controls or **Ctrl + scroll over the diagram** to zoom, then **drag anywhere** to pan. A plain scroll moves the page, so the diagram never traps the mouse wheel; in full-screen mode a plain scroll zooms. The zoom level stays visible over the canvas:

![The network diagram zoomed to 156% with the zoom controls](docs/screenshots/network-zoom.png)

The **expand** button in the zoom bar fills the screen with the diagram. Use **Exit full screen**, the shrink button, or **Esc** to return to the panel:

![The network diagram in full-screen mode](docs/screenshots/diagram-fullscreen.png)

**Challenge explanations** now go beyond the short answer. Revealing the student challenge gives the full arithmetic, what each number means in plain language, why it matters for the next layer, a what-if table, and buttons that run the bias variants in the diagram:

![The revealed student challenge with the what-if table and try buttons](docs/screenshots/challenge.png)

**Every calculation can be opened.** A **?** in the calculation card header and a **!** beside each stage open the full explainer. The calculation panel itself is now a floating card: drag its header to move it, drag the bottom-right corner to resize it, and scroll the body for long calculations:

![The draggable calculation panel with a ? in the header and ! beside each stage](docs/screenshots/calc-panel.png)

![The full calculation explainer with the whole equation, variable table, step cards, and what-if](docs/screenshots/explainer.png)

**Every settings control has a `!` guide.** The `!` beside a section or control opens a plain-language guide with the simple idea, why it matters, how it changes the calculation, a what-if example, the current values, and a one-line reminder:

![The network settings panel with a ! beside every section and key control](docs/screenshots/settings.png)

![The architecture guide explaining the network shape in plain language](docs/screenshots/settings-guide.png)

| Forward pass in progress | Training report |
| --- | --- |
| ![Labelled dots travelling along the connections while the timeline shows the current stage](docs/screenshots/forward-pass.png) | ![Loss chart, before and after predictions, and the selected weight update](docs/screenshots/training.png) |

**Run the error backward.** Under the forward-pass button, set the **target** and **learning rate**, then press **Run backward pass**. The step-by-step panel compares the prediction with the target, measures the error slope, sends the error back through every layer, shows each weight’s gradient and correction, and finishes with the before/after loss. Coral packets carry the error backward, red labels show weight gradients, and **Apply correction** writes the new weights:

![The backward pass panel with error packets, gradient labels, and the old/gradient/new correction table](docs/screenshots/backprop.png)

Or press **Auto-train** with a number of steps. It runs the forward pass, repeats the backward step, keeps the step with the lowest loss, and applies that best correction automatically. The loss chart shows the whole journey from the first guess to the best step:

![The automatic backward pass with the loss journey, before/best/final predictions, and the best result applied](docs/screenshots/auto-backprop.png)

**Ask the neuron tutor.** The **Ask the tutor** button on the Network output opens a chat that reads the current prediction, target, loss, and output-neuron math. It explains why the result came out that way, answers “what if” questions about the bias, weights, inputs, or activation, and suggests how to get closer to a target — including an **Auto-train toward …** action:

![The Neuron tutor explaining the output, the products, the bias, and the ReLU result](docs/screenshots/tutor.png)

**Worked examples** put every forward and backward calculation on one screen. The network shows only the active direction — **gold arrows** on a forward step, **green arrows** on a backward step — and the update table shows old, gradient, and new:

![A forward step with only gold arrows](docs/screenshots/examples.png)

![A backward step with only green arrows](docs/screenshots/examples-backprop.png)

**Tinker with a neural network.** The **Playground** tab now follows the TensorFlow Playground board: a run/parameter bar on top, **Data** on the left, **Features + hidden layers** in the center, and **Output** on the right. Small orange/blue dots travel along the weighted connections **only while Play is active**; pausing freezes them at their current positions, and Step updates the network without animating. It includes the full classification/regression switch, Circle/XOR/Gaussian/Spiral and Plane/Gaussian regression data, all seven engineered features, 0–6 hidden layers with 1–8 neurons, the full learning-rate list, L1/L2 regularization and rate, ratio/noise/batch controls, regenerate, Play/Pause/Step/Reset, test/training loss, the output heatmap with axes, Show test data, Discretize output, and the color legend. Hover a neuron to preview its map in Output; click a feature to toggle it, a neuron to edit its bias, or a connection to edit its weight. The original model semantics are preserved: ±1 labels, Tanh output for classification, Linear output for regression, 0.5 × squared error, and 500/1,200-point datasets:

![The TensorFlow Playground-style 2D board with the top parameter bar, data column, live network, and output heatmap](docs/screenshots/tf-playground.png)

**العربية / English.** The top bar has a persisted language switch, and **the whole interface is available in Arabic**: every lab, the lesson guide, the challenges and their worked answers, the settings guides, the neuron tutor, the glossary, the house-price and exam-score case studies, the advisor, the Python guide’s explanations, and the reading and screening rooms. Arabic mode sets the document to RTL and uses an Arabic-friendly type stack. Formulas, generated Python code, the tiny model’s English tokens, and the titles and authors of external resources stay as they are; any text without a translation falls back to English.

![The Playground in Arabic with the RTL board, translated controls, and output labels](docs/screenshots/playground-arabic.png)

**A real-world case study.** The **House case** tab follows a house-price project through all ten steps — define, collect and clean, split, scale, choose the network, initialize, train in batches, repeat epochs, validate, and test. Each step is a full classroom document with the actual numbers, and the live lab trains a real 2 → 3 → 1 network on 1,000 training houses in batches of 100:

![The house-price case study with the ten-step pipeline and the first step document](docs/screenshots/house-case-steps.png)

![The live mini-batch lab with batch losses, training and validation error, before/after MAE, and sample predictions](docs/screenshots/house-lab.png)

The case study also keeps the two classroom reference posters at the top, so students can zoom them while reading the steps:

![The two house-price reference posters: the whole run and the step-by-step project flow](docs/screenshots/house-references.png)

**A second case study: exam scores.** The **Exam case** tab applies the same ten-step pipeline to a different question: predict a student’s exam score from weekly study hours and attendance percentage. Each row gives the network two features and one target; the target is compared with the prediction but never fed in. The case uses 1,000 synthetic student records, 100 validation and 100 test records, the same 2 → 3 → 1 network (9 weights and 4 biases), seed 42, and 10 batches of 100:

- One batch → 100 predictions → one average loss → gradients → one optimizer update.
- Ten batches complete one epoch; the next batch always starts from the previous batch’s updated weights.
- The live lab reports the 10 batch losses, training/validation RMSE, before/after MAE for all three splits, and sample score predictions.
- The four illustrative rows — 5 h / 70% / 58, 10 h / 85% / 75, 15 h / 95% / 89, and 8 h / 80% / 68 — are included in the first step.
- Both the English and Arabic reference posters are built in with the same zoomable viewer.

![The exam-score case study with the ten-step rail, the four illustrative students, and the 2 → 3 → 1 lab](docs/screenshots/exam-case-step.png)

![The English and Arabic exam-score reference posters](docs/screenshots/exam-case.png)

![The exam-score case in Arabic](docs/screenshots/exam-case-arabic.png)

**Download the data, Python project, and build guide.** Both case headers include four actions: **Download Excel dataset**, **Download Python project**, **Copy Python code**, and **Student build guide**.

The 16-page **Student build guide** is a printable PDF that starts from the workbook and walks through the full development path: the problem statement, environment setup, Excel import, data pipeline, 2 → 3 → 1 design, mini-batch training, honest evaluation, FastAPI backend, React interface, interactive lesson design, reproducibility tests, deployment, and student challenges. It is included in both project ZIPs and both desktop folders.

The Excel workbook for each case contains:

- a **README** sheet,
- a **Summary** sheet,
- **Full_Data** with all 1,200 rows, each marked `train`, `validation`, or `test`, and each training row carrying its batch number,
- **Batch_01 … Batch_10** with the complete 100 rows of every batch,
- separate **Validation** and **Test** sheets.

The Python project ZIP contains the workbook, a working training script, `requirements.txt`, `setup.ps1`, `setup.sh`, and a README. Each script imports the workbook with:

```python
frame = pd.read_excel("house_data.xlsx", sheet_name="Full_Data")
```

and then trains the same seeded 2 → 3 → 1 network, evaluates all three splits, prints the results, and writes `results_house.xlsx` or `results_exam.xlsx`.

On Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python train_house.py
```

Use `train_exam.py` in the exam folder. The projects are also created on the desktop at:

```text
C:\Users\nmtab\Desktop\NeuronLab-Study-Cases\House-Price-Case
C:\Users\nmtab\Desktop\NeuronLab-Study-Cases\Exam-Score-Case
```

![The Excel and Python project download panel in the exam case](docs/screenshots/case-downloads.png)

![A page from the student build guide showing the network and data-pipeline steps](docs/screenshots/student-build-guide.png)

**Plan the hardware and software.** The **Advisor** tab reads the current network and training assumptions, then shows the exact parameter count, batches, updates, and parameter storage. It recommends CPU, RAM, and GPU suitability with visible heuristics and limitations, estimates training memory separately from storage, compares software by learning objective, and includes the full 2 → 3 → 1 worked example:

![The hardware and software advisor for a 2 → 3 → 1 house-price network](docs/screenshots/advisor.png)

![The advisor's hardware recommendation, optional computer fields, detected CPU count, and assumptions](docs/screenshots/advisor-recommendation.png)

**One example, one workspace.** The Python guide tab opens with a picker. Each example (build a neuron from scratch; train your network in PyTorch; house prices in PyTorch) opens alone in its own bordered workspace, with its own code, settings and files, and switching unmounts the previous one so nothing carries over. The house-price workspace offers only house data and asks to load the 2 → 3 → 1 network; the your-network workspace never offers house data. The last example opened is remembered. To add an example, add one entry to `PY_EXAMPLES` in `frontend/src/PythonWorkspaces.tsx`.

**Build it from scratch, part by part.** The Python guide opens with an animated series that pairs a picture of the neuron with the plain Python that computes it and the terminal output that code prints, line by line. Part 1, the neuron: should I ride my bike today? Inputs, weights and a bias are multiplied and added (0.75, ride), then it rains (−0.75, stay home). Part 2, activation functions: step, sigmoid and ReLU, each drawn as a curve with a dot at z. Sliders change the day, and the code and output follow; the floats are computed in Python's order, so they match a real run digit for digit. Copy the code or download it as a .py file.

**Generate the Python training guide.** The **Python guide** tab turns the current architecture, seed, and split into a complete 15-step PyTorch workflow. Every step shows its purpose, input, code, output, and a check before continuing. The guide copies per-step code, copies the complete script, and downloads a runnable `.py`, an explanatory `.ipynb`, and a `requirements.txt`. The default dataset is a clearly labeled synthetic classroom demonstration; complete rows from Teach the network can be used instead. The script starts from a fresh seeded initialization of the selected architecture rather than copying the browser's trained weights. The generated script is tested end to end — data, training, validation, test, prediction, and save/reload:

![The Python training guide matched to a 2 → 3 → 1 house-price network](docs/screenshots/python-guide.png)

![Step 7 of the generated guide showing the exact layers, parameter count, and copyable code](docs/screenshots/python-guide-step7.png)

**The reading room** is a curated library of 43 books, papers, videos, posts, podcasts, courses, and interactive tools, organized into six learning paths. Search it, save what you want, mark what you finish, and jump straight into the matching lab:

![The resource library with learning paths, filters, and resource cards](docs/screenshots/library.png)

**Watch** is the screening room: 23 LLM lectures, every one scored 9.0+, with the latest 2025–26 talks marked. Play them in the page, read the chapters, save them for later, and open the matching lab:

![The screening room with the Deep Dive primer, quality scores, and the latest picks](docs/screenshots/watch.png)

**LLM playground** turns words into tokens and draws attention as moving light. Press **Backprop one step** to send the error the other way:

![The LLM playground with tokens, attention arcs carrying light, next-token probabilities, and the backprop panel](docs/screenshots/llm.png)

| The error flowing backward | The model after a training step |
| --- | --- |
| ![Coral light travelling backward along the attention links](docs/screenshots/llm-backprop.png) | ![The loss curve and the weight update after one gradient step](docs/screenshots/llm-training.png) |

**Chain-rule tracer** follows one loss value back through every stage, with the local slope and the error at each hop:

![The chain-rule tracer with nine cards and an amber traced attention link](docs/screenshots/llm-tracer.png)

**Presentation view** enlarges the interface for a projector and keeps the same controls:

![Presentation view with larger type](docs/screenshots/presentation.png)

## Run locally

Use Python 3.11 or newer and Node.js 22 or newer. Run the commands from the project folder. Installing dependencies requires internet access. The running simulator uses your computer and needs no API keys or external assets.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### macOS and Linux

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
npm --prefix frontend ci
npm --prefix frontend run build
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open [Neuron Lab](http://127.0.0.1:8000). Press **Ctrl+C** in the server terminal to stop it. For frontend development, keep FastAPI running and run `npm --prefix frontend run dev` in another terminal. Set `PORT` and `NEURON_LAB_API` to run a second copy on another port or against another backend. On PowerShell use `npm.cmd`. Vite serves the UI at [port 5173](http://127.0.0.1:5173) and forwards API calls to FastAPI.

## Five-minute classroom walkthrough

| Time | What to do |
| --- | --- |
| 0:00–1:00 | Open **One neuron by hand** from the journey cards. Select **Output 1** and show its calculation card on the diagram. Multiply 2 × 0.5 and 3 × 1, add the products to get 4, then add the bias of −1. ReLU gives 3. Open **Exact values** when you want all the displayed digits. |
| 1:00–2:00 | Edit **Weight 1** to 1. The run button starts to glow because the diagram needs a new run. Ask students to predict the new output, then click **Run forward pass** for 4. Open the student challenge, reveal the full explanation, read the what-if table, and press **Try bias −5**, **Try bias −3**, then **Back to original** to see outputs 0, 1, and 3. |
| 2:00–3:00 | Add a hidden layer under **Architecture** to build a **2 → 2 → 1** network. Set the layer activations and click **Initialize weights** to start from the shown seed. Run the forward pass and load **Two layers** to compare with a hand-set network. |
| 3:00–4:00 | Watch the six stages change in the animation timeline: Move, Multiply, Sum, Bias, Activate, Pass. The dots carry the current number. Click **Pause**, open a neuron, and read the math for that stage; set **0.5×** or **2×** to slow down or speed up the class. Use **Next layer** to visit the hidden layer and outputs. In **Why activation matters**, run Linear and ReLU on the same total of −3. |
| 4:00–5:00 | Open **Teach the network**, then **Load AND gate**. Pick a weight and click **One training step**. Compare the predictions and loss before and after, and use the old value, gradient, and new value to explain the update. Switch to **Presentation view** for a larger type scale. |

## Worked examples in five minutes

Five tiny networks, each with a complete forward pass, loss, backward pass, and parameter update.

The network shows the direction of the current process. On a forward step, **only gold arrows** move input → output. On a backward step, **only green arrows** move output → input. Choose **Both** when you want the two directions side by side. Use **Flow** to choose **Auto** (follow the current step), **Both**, **Forward**, or **Backward**, change the arrow **Speed**, pause and resume the arrows with **Pause arrows**, or click any connection to flip the direction. The direction arrows keep moving even when the operating system asks for reduced motion, because the movement is the lesson; the pause button gives students control.

![A forward step with only gold arrows, then a backward step with only green arrows](docs/screenshots/examples-flow.gif)

| Example | Shape | What students should notice |
| --- | --- | --- |
| One weight, one bias | 1 → 1 | The whole chain rule in one step. Loss 1 → 0, prediction 0 → 1. |
| ReLU that passes the error | 2 → 1 | An active ReLU has slope 1, so both weights get a gradient. |
| ReLU that blocks the error | 2 → 1 | A negative total gives slope 0. Every gradient is 0 and nothing moves. |
| Two layers, hidden error | 2 → 2 → 1 | The output error travels back through Wᵀ, is scaled by the hidden slopes, and becomes the hidden gradients. |
| Sigmoid squashes the slope | 1 → 1 | A 0.197 slope turns a large output error into a small update. |

| Time | What to do |
| --- | --- |
| 0:00–1:00 | Open **Worked examples** and stay on **One weight, one bias**. Read the setup, then press **Next** through the weighted sum, the activation, and the loss. Every card shows the actual arithmetic. |
| 1:00–2:00 | Continue into the backward pass: `∂L/∂prediction`, the delta, the weight and bias gradients, the update table (old / gradient / new), and the result. The ribbon shows prediction 0 → 1 and loss 1 → 0; the diagram switches to the updated weights. |
| 2:00–3:00 | Compare **ReLU that passes the error** with **ReLU that blocks the error**. In the blocked case the total is negative, the slope is 0, every gradient is 0, and the loss cannot move. |
| 3:00–4:00 | Open **Two layers, hidden error** and follow the error into the hidden layer: `∂L/∂a = W(next)ᵀ · δ(next)`, then `δ = ∂L/∂a × f′(z)`, then the hidden gradients. Only the active hidden neuron moves. |
| 4:00–5:00 | Open **Sigmoid squashes the slope**, then press **Play** on any example to run the demonstration automatically. Use **Restart** to reset the walkthrough. |

### How the gallery computes

Every example is real. `engine.trace` runs a single-example forward pass, computes mean squared error (the same loss as the training tab), then a full backward pass over every layer and parameter; the update is one exact gradient-descent step. The API returns every intermediate value: products, sums, z, activations, slopes, deltas, weight and bias gradients, the updated network, and the new loss. `tests/test_examples.py` checks every weight and bias against a numerical slope and asserts that the one-weight example lands exactly on the target.

## The reading room in five minutes

Open **Library** in the top bar. It is a curated collection, not a search engine:

- **43 resources** across books, papers, videos, posts, podcasts, courses, and interactive tools.
- **Six learning paths** that put them in a sensible order, from “what is a neuron” to interpretability and society.
- **Search and filters** for media type, level, free-only, and saved items.
- **Save and finish** marks live in the browser's local storage, so they survive a refresh without an account.
- **Open in the lab** buttons connect a reading to the matching simulator.

| Path | What it covers | Resources |
| --- | --- | --- |
| The 30-minute introduction | 3Blue1Brown, the Illustrated Transformer, Wolfram, and TensorFlow Playground | 4 |
| Backprop, by hand | Nielsen, Karpathy's Zero to Hero, the 1986 paper, and Karpathy's backprop essay | 4 |
| Inside the transformer | Illustrated Transformer, 3Blue1Brown's GPT lesson, the attention paper, Raschka, and Anthropic's circuits framework | 5 |
| How an LLM is trained | GPT-2, GPT-3, scaling laws, InstructGPT, and Latent Space | 5 |
| Open the black box | Circuits, induction heads, ROME, grokking, monosemanticity, and Distill | 6 |
| AI in the world | Mitchell, Russell, Christian, Lex Fridman, and Dwarkesh | 5 |

The library is intentionally opinionated. Every entry has a one-line “why” and a time estimate, and the “Open in the lab” buttons mean a student can read about backprop and then step through it in **Worked examples**. **Print list** produces a paper reading list of the current filters for a classroom handout. Some books are paid; the free ones are marked. Nothing is sponsored.

## The screening room: the best LLM lectures

**Watch** is a quality-gated video library, not a YouTube search result. It has **23 picks, every one scored 9.0 or higher**, and **12 from 2025–26**. The scores are editorial, out of 10, based on clarity, accuracy, depth, production, and freshness. Views and likes are shown when verified, but they are a signal, not the score.

| Pick | Channel | Year | Length | Score |
| --- | --- | ---: | ---: | ---: |
| Deep Dive into LLMs like ChatGPT | Andrej Karpathy | 2025 | 3h 21m | 9.9 |
| Attention in transformers, step-by-step | 3Blue1Brown | 2024 | 15m | 9.8 |
| Let’s build GPT: from scratch | Andrej Karpathy | 2023 | 1h 56m | 9.8 |
| The spelled-out intro to backpropagation | Andrej Karpathy | 2022 | 2h 25m | 9.7 |
| Let’s reproduce GPT-2 (124M) | Andrej Karpathy | 2024 | 3h 59m | 9.7 |
| But what is cross-entropy? | 3Blue1Brown | 2026 | 32m | 9.7 |
| Intro to Large Language Models | Andrej Karpathy | 2023 | 1h | 9.6 |
| Transformers, the tech behind LLMs | 3Blue1Brown | 2024 | 27m | 9.6 |
| CS25 V6: Overview of Transformers | Stanford CS25 | 2026 | 1h 20m | 9.4 |
| MIT 6.S191: Deep Sequence Modeling | MIT 6.S191 | 2026 | 1h | 9.3 |
| GRPO Explained: DeepSeekMath and reasoning RL | Yannic Kilcher | 2025 | 50m | 9.2 |
| On the Biology of a Large Language Model | Yannic Kilcher | 2025 | 45m | 9.1 |

The newest additions include Karpathy’s 2025 **Deep Dive** and **How I use LLMs**, 3Blue1Brown’s 2026 **Compression is Intelligence** series, the 2026 **Stanford CS25 V6** lectures, the 2026 **MIT 6.S191** sequence-modeling and massively-parallel-training lectures, and Yannic Kilcher’s 2025 paper deep dives on **GRPO** and **circuit tracing**. Older videos stay only when they are still the best explanation of a core idea.

Every card gives you the **why**, the score, the length, the channel, and the topics. The **New 2025–26** filter shows only the latest picks. **Save for later** and **watched** marks persist in the browser. The in-page player streams from YouTube; the rest of Neuron Lab still works offline.

## LLM playground in six minutes

The lab reads top to bottom. The prompt card at the top shows the model’s answer; the six stages below show how it got there. Use the rail on the left to jump between stages.

| Time | What to do |
| --- | --- |
| 0:00–1:00 | Open **LLM playground**. The prompt is “the cat ran to the”. Click **Predict next**, read stage 1 (**Tokens**) to see each word become a number, then jump to stage 5 (**Softmax**): the model says **mat**, the story agrees, and the loss is tiny. Point out that the probabilities are a softmax over the whole vocabulary, not a single answer. |
| 1:00–2:00 | Watch the attention graph. Light flows from **cat** and **to** into the highlighted query **the**. Click any token: the tokens to its right dim because attention is causal, and clicking an earlier token re-runs the question “what comes next after this word?”. The table shows each `q·k` score and its softmax weight. |
| 2:00–3:00 | Read the vector strips in **Embeddings** (token row + position row = x), **Attention** (context), and **MLP** (input, the 32 hidden neurons, finished vector). Colour is the sign, brightness is the magnitude; hover a cell to read its number. These are the numbers a real LLM holds in its residual stream. |
| 3:00–4:00 | Press **Backprop one step**. The links turn coral and light flows backward; the table switches to `∂L/∂score` and `∂L/∂a`. After the gradient animation the weights update, the loss chart adds a point, and the model predicts again. Try the **the dog ran to the** example: it is confidently wrong, so the loss and the gradients are large — a useful discussion of overfitting and data. |
| 4:00–5:00 | Press **Trace top link**. Nine cards walk from the loss to the attention link, then to the key/value vectors and the token embedding. Read the local slope, the error arriving, the error sent back, and the share of the context (80.7% for **to**). Use **Next** or click a card to step through. |
| 5:00–6:00 | Press **Generate 8** to watch autoregression: one token is appended, attention runs again, and the output feeds the next step. Drag the temperature slider to compare the careful top-token distribution with a flatter, more surprising one. |

## How the LLM demo works

- The vocabulary is the **11 words and punctuation marks** in a tiny story. The prompt is tokenized into words, and the last **12 tokens** are the context window.
- One attention head, `d = 16`, a 32-wide ReLU MLP, and a softmax over the vocabulary — **2,667 parameters** in total. The equations are `x = embedding + position`, `q/k/v = x·W`, `a = softmax(q·kᵀ/√d)`, `c = a·v`, then a residual MLP and a next-token softmax.
- The model is trained with **cross-entropy** and full-batch gradient descent on the story. Both the forward and the analytic backward pass live in `backend/llm.py`; a numerical gradient check in `tests/test_llm.py` agrees with it to better than `1e-6`.
- The saved weights are loaded at startup. If you change the story or the dimensions, run `python -m backend.train_llm` to regenerate `backend/llm_weights.npz`.
- The demo is deliberately small and overfits its story. The “the dog ran to the” prompt shows the failure mode honestly: the model relies on “ran to the” and ignores the subject. That gap is the reason real LLMs need scale, data, and more heads and layers.

### Chain-rule tracer

Click **Trace top link**, a bolt in the attention table, or any attention arc. The tracer freezes the loss on one target token and walks backward through nine stages:

`loss → softmax → target logit → residual + MLP → context → attention link → attention softmax → key/value → embedding + position`.

Every card shows the forward equation, the local slope (`∂this/∂that`), the error arriving, the error sent back, and a bar for the relative signal strength. The **Attention link** card is the heart of it: it answers “how much would the loss change if this one link moved?” with `∂L/∂a = (∂L/∂c) · v`, and the number matches the attention gradient exactly. The last card shows the error landing on the token's embedding row and its position row.

The traced arc turns amber, its source token gets a dashed **link** label, and every other arc dims — so the graph keeps the context while one path is in focus. **Prev/Next** or clicking a card steps through the chain; closing the tracer returns the graph to its normal light flow.

### Where this can go next

- A draw-a-digit input with forward and backward passes from the pixel grid, in the spirit of classic MNIST visualizers.
- Multi-head and two-layer attention with a head selector, so students can see different heads learn different jobs.
- A token-embedding map (PCA of the tiny model, or a bundled 2D projection) to show that similar words land near each other.
- A context-window and KV-cache inspector: what the model can still see at token 4,096.
- Sampling controls: top-k, top-p, beam search, and a side-by-side temperature comparison.
- A “hallucination” sandbox that gives the model an out-of-story prompt, shows high confidence, and asks students to explain why.
- A fine-tuning story: paste a new tiny corpus, train a few steps, and watch which weights move.

### Inspiration

The experience borrows the immediate cause-and-effect loop of [TensorFlow Playground](https://playground.tensorflow.org/), the forward/backward animation and per-neuron inspection from [wdv.com's simulator](https://wdv.com/NN/), the experiment prompts from [8gwifi's playground](https://8gwifi.org/neural_network_playground.jsp), the clear theory framing from [ml0x](https://ml0x.com/tools/neural-network-playground.html), and the architecture map from [Simulations4All](https://simulations4all.com/simulations/neural-network-explorer). The LLM lab adds the step those playgrounds stop short of: a real attention block, next-token probabilities, and a backward pass.


## What makes it easy to follow

- **Tokenizer** — students type a word, a sentence or a whole page (English, Arabic, mixed, emoji, several lines) and see exactly how a real tokenizer cuts it: **tiktoken** with the **o200k_base** encoding, run by the FastAPI backend (`POST /api/tokenize`, `backend/tokenizer.py`). The page (`TokenizerLab.tsx`, `tokenizer.css`) shows the token count beside the word count, redraws the original text with every token in its own colour and outline (neighbours also alternate solid and dotted underlines, so colour is not the only cue; Arabic letters stay joined across token boundaries), and shows each token's **Token position** and **Token ID** on hover, tap or keyboard focus (Tab, then the arrow keys). Under the text, **Each token and its ID** shows every token as a card with its piece on top and its ID underneath, in the same colour, following each line's reading direction (hovering a card highlights the same token in the text); texts over 300 tokens show only the total and a note to hover the text instead. **The big picture** (`EmbeddingStory.tsx`, `embedding.css`) opens the vector section: four joined panels follow the selected token from the sentence, through the tokenizer (piece → ID) and a lookup in the embedding table, to its starting vector, under the key idea “the token ID selects the row, and the row supplies the vector”. Below it, every word of the text sits above its tokens, IDs and table rows (words split into several tokens are marked); the table view lists the rows the text reads, sorted by ID with the gaps between them, and shows when repeated tokens share one row; a timeline explains that IDs are fixed before training, the row's numbers are learned during training (a slider animates this, clearly labelled as illustrative), and both are frozen afterwards; and “ bank” in two sentences (real ID 6922) reads the same row, then a toy attention step gives the two copies different vectors. **From tokens to vectors** (`VectorLab.tsx`, `vectors.ts`): click any token (card, text or matrix row) and follow it through five steps: the ID; the ID picking one row of the embedding table (a one-hot vector times the table); reading that row (the token vector, shown beside its neighbouring rows); the sinusoidal position vector of the original Transformer, with its formula; and token vector + position vector = input vector, added column by column. **Play the steps** lights them up in turn. Then every token's input vector is stacked into a matrix (a heat map) and averaged column by column (mean pooling, with the d1 sum written out) into one vector for the whole text. Repeated tokens are pointed out: same ID and row, different position, different input vector. The table is a clearly labelled demonstration table of 8 numbers per token, fixed per ID but not learned (GPT-4o's real table is not public); a note explains how real tables differ (learned, 896 to 4,096+ numbers per token, RoPE in newer models). A collapsible table lists Position, Token piece and Token ID with spaces (·), tabs (→), line breaks (↵) and invisible characters (⟨U+200D⟩) made visible. When a token holds only part of a character (common for emoji and rare characters), the preview keeps the character whole and the table shows the token's real bytes, such as ⟨F0 9F 9A⟩, instead of invented text. Text that looks like a control marker (`<|endoftext|>`) is treated as ordinary text. Counting updates live as you type, three examples load with one click, empty input shows 0 tokens, and text over 20,000 characters gets a clear message. Tests check that the count equals the number of IDs returned and that the preview rebuilds the submitted text exactly. tiktoken is installed from `backend/requirements.txt`; on its first run it downloads the o200k_base vocabulary once and caches it (the server starts this in the background, and the page shows a clear message if the vocabulary cannot be loaded).
- **Fine-tuning lab** — a lesson of its own on teaching a foundation model a new subject, in seven parts with a quiz: why fine-tune (base model vs fine-tuned answers), the training examples and the chat format, freezing the base, **LoRA** (a real adapter trained in the browser beside a frozen matrix: `W·x + B·(A·x)`, with a live count of frozen numbers changed that stays at 0, and a rank that is too small visibly getting stuck), **quantization** (weights snapping to 2^bits levels, even spacing vs NF4, the rounding error and the model size), **QLoRA** (a memory calculator for model size, base precision, rank and target layers, with which GPUs it fits), and **Unsloth** (the seven steps of a real run with copyable code and what each does to memory). Three animated scenes with play, pause and step controls show the processes happening: **how LoRA adapters are added** (a layer is frozen, A and B attach to every target module, data flows forward on two roads, the error flows back, only A and B change, then they merge into W), **how a block of weights is quantized** (real float16 bits, absmax, scaling to ±1, the 16 NF4 levels, snapping, 4-bit codes, dequantizing and double quantization), and **what Unsloth does** (the model download filling GPU memory, adapters, training, memory offloading to RAM, and export). Everything is in English and Arabic.
- **How the fine-tuning lab is organised** — fourteen parts in six chapters that follow a real project (Foundations, Data, Methods, Training, Evaluate and deploy, Real projects), shown one part at a time with Previous / Next. A pipeline map at the top shows where the current part sits and which parts have been visited; the rail groups the parts by chapter. Each part has Watch (the animation), Try (the hands-on tools, with an “on this page” index for long parts) and Remember (a summary card with the key formula, three facts and the common mistake). The reference sheet puts every summary card and the glossary on one printable page, and Ctrl+K (or /) searches parts, tools and words. The position and the visited parts are remembered.
- **Fine-tuning for images and the UTAS-70 project** (parts 13 and 14, built from a final-year student project on the native plants of Dhofar): an animated transfer-learning scene (an ImageNet CNN, the frozen body, a new head with one output per species, 224 × 224 preparation and augmentation, stage 1 training the head only, stage 2 unfreezing the top blocks at a much lower learning rate, and the top three with a confidence threshold); CNN fine-tuning beside LLM fine-tuning; a backbone calculator for MobileNetV2, EfficientNet-B0 and ResNet50 showing how few numbers the new head trains; photo preparation with live augmentation and ImageNet normalization; a split-by-tree demo that shows leakage; a clickable confusion matrix with precision, recall and macro F1; and a threshold slider with unknown plants. The project part opens with **the relay**, a twelve-step animation in three acts: what YOLO is and why it matters (one look, a grid, many boxes, the best box kept, a name with its confidence), how RAG uses that name (name index, filter by plant, rank by meaning, passages with sources), and how the fine-tuned model packs the prompt and writes the final answer in its learned style. It then follows a photo through the whole three-part system: YOLO as the eyes (names the plant), a RAG digital archive of all the references as the memory (filtered by the species name, then ranked by meaning), and Qwen3.8-27B fine-tuned with QLoRA on examples from about 20% of the references as the brain (writes the answer in a botanist's style, with sources). It adds a system map where each part can be switched off to see what breaks (with YOLO classify and detect commands, the archive pipeline and the answer style), a reference-split tool (style from a slice of the references, facts from all of them), an archive search that shows why the name filter matters, the research questions with their tests and the literature gap, the twelve steps as two parallel tracks with the critical path, the four-layer architecture, a species record turned into JSONL lines (with the record as context, in English or Arabic, and “not in the sources” answers), a comparison of the base, fine-tuned and fine-tuned + RAG systems, and a twelve-point guide for students planning their own project, with a GPU fit check. Species records, passages and scores are illustrations, not the project's results.
- **Built from the course notes** (“Fine tuning language models with LoRA, QLoRA and Unsloth”): the lab now has twelve parts. New are **Key words** (what a parameter is — one neuron with its weights and bias, z = 2×0.5 + 3×0.4 + 0.2 = 2.4, trained either fully or the LoRA way with the original parameters locked; a ladder from 3 parameters to an 8B model and the 0.6% LoRA trains; and why parameters are patterns, not a file of facts — then an animated loop of parameter → frozen → trainable → activation → loss → gradient → optimizer → batch/epoch, a calculator with a locked knob showing that frozen means not updated, not inactive, and a searchable glossary linked to the parts), **From documents to JSONL** (an animated pipeline from sources through OCR review, metadata, cleaning, reviewed pairs, JSONL lines, the split by source and tokens; the same example in seven formats — chat messages, Alpaca, ShareGPT, plain text, preference pairs, a JSON array and CSV/Parquet; a live JSONL checker that explains each broken line; and the chat template, token mask and truncation), **One training step** (an animated forward pass, cross-entropy loss, backward pass and update, a learning-rate demo, an effective-batch calculator and a training-versus-validation chart) and **Workflow and evaluation** (the eight stages, the card-ordering activity, evaluation criteria, the adapter package, separate versus merged, and true-or-false misconceptions). The existing parts gained the four approaches compared, quantization vs pruning and fine-tuning vs RAG, a LoRA parameter calculator with the notes’ worked examples and the scale alpha/r, a real initialization comparison, why the order matters in QLoRA, 4-bit storage vs 16-bit computation, the 27B memory sum, and an animated **AI kitchen** scene for Unsloth.
- **RAG and fine-tuning together** — part 11 also explains how the two work together, as an open-book exam (RAG looks up approved passages and their sources) with a coached student (fine-tuning teaches how to answer). A third scene follows a proverb question: RAG finds a heritage-book page and a family interview that disagree, the fine-tuned Qwen keeps the proverb's wording and presents both accounts with citations, and a new interview becomes searchable without retraining. Tools: “Is one enough?” (three questions light up RAG alone, fine-tuning alone, or both), one answer built three ways (with both, without RAG, without fine-tuning; click any piece to see where it came from), and “Test RAG first”, where students judge five test answers on two separate checks (right passage? explained well?) to decide whether to fix the search or fine-tune. Sources in these tools are illustrative samples.
- **Fine-tuning, RAG, or both?** — an animated storyteller-and-library scene (RAG is the library of real stories, fine-tuning teaches the storyteller's voice, citing and honest “not found” answers; with fine-tuning only details get invented, with RAG only the answer is correct but flat), a “do you need fine-tuning?” situation picker, a strength chart for fine-tuning only / RAG only / both, a data-sorting activity (library or lessons?), the 80–100% / 5–20% split versus putting the same data in both, one story used two ways (a RAG library entry with metadata beside the fine-tuning conversation, with highlights and a comparison table), a JSONL builder that turns a question, retrieved context and answer into one valid train.jsonl line (with or without context), how train.jsonl is applied (load, template, train on the answer only, update LoRA only), an animated seven-step cartoon of the whole RAG application (fine-tune first, build the app, upload and embed sources, embed the question, search the vector database, send question + context to the fine-tuned model, answer with its source), a meaning map that shows vector search and the “not found” case, and the recommended order of work and evaluation. Three everyday analogies sit with their topics: extra lessons (part 1), sticky notes on a printed textbook for LoRA, and a photo saved with fewer bits per colour for quantization.
- **RAG in depth** — part 12 of the fine-tuning lab explains what RAG is and why it is needed (knowledge the model never saw, fewer invented answers, a source for every claim, updates without retraining), then animates both pipelines step by step: indexing (upload, extract with PyMuPDF or OCR, clean and find headings, chunk with overlap and parent/neighbour links, tokenize, embed into a 1,024-number vector, store vector + text + metadata in a vector database with an HNSW index) and answering (the question through the same tokenizer and embedding model, metadata filter, nearest neighbours by cosine similarity, hybrid BM25 + reranking, a prompt with numbered sources, a cited answer). Tools: a chunking lab on a UTAS-70 flora entry and a TurathAI story (fixed size, by sentence, by section; size and overlap sliders; whether the test answer stays in one chunk), text → tokens → vector with a cosine-similarity table, a search lab over both projects (filter, top-k, threshold, hybrid search with RRF), a prompt-and-citations view, the RAG design of both projects side by side with their chunk metadata, and a RAG doctor of common failures and fixes.
- **Check yourself: a 225-question bank** — the fine-tuning lab's review quiz draws a fresh random set every time from 100 multiple-choice, 50 fill-in-the-blank, 25 explain-in-your-words (key points detected, self-tick, model answer), 25 match-and-link (drag and drop, or tap a card then a slot) and 25 look-at-the-picture questions whose figures are drawn in SVG. Unseen questions come first (remembered in the browser), options are shuffled, every question is bilingual, and a weak answer links back to the part that teaches it. The bank lives in `frontend/src/quiz/` (one file per kind); a test checks counts, unique ids and the format.
  Students pick an option and press **Check my answer**. After checking, every question offers **Explain it step by step** (3–5 numbered reasons written for a 12-year-old, ending with "So the answer is: …", in both languages, in `quiz/steps-*.ts`) and **Learn more** (the lab part that teaches it, its key words in plain language, and two trusted outside resources per part, in `quiz/learnMore.ts`). A test checks that all 225 questions have explanations. Inside the step-by-step panel, **Read more sources** searches the internet for the idea behind the answer (`quiz/searchTopics.ts`, `quiz/MoreSources.tsx`): the question is matched to up to three topics, live Wikipedia summaries are fetched in the student's language (Arabic falls back to the English article, labelled), and one-click searches open Google, YouTube, Wikipedia and Google Scholar in a new tab. A page is shown only if it names the topic and clearly belongs to AI, data or heritage, so loose search matches are dropped. Only the topic is sent, never anything the student typed.
- **Evidence for RAG + fine-tuning** — part 12 also shows that RAG includes the language model that writes: the same two interviews answered by Qwen as it comes (generalises to all of Dhofar), Qwen with clearer instructions (misreads a local word) and fine-tuned Qwen (explains it, keeps the two accounts apart, limits the claim). A fix ladder maps each test result to the first fix to try (search, instructions and examples, then fine-tuning if it persists), a fair-test panel compares regular and fine-tuned Qwen on the same held-out questions and passages, and a closing card states the claim precisely: the archive preserves, RAG brings, fine-tuned Qwen explains. Interviews and scores are illustrative.
- **Two projects, one recipe** — part 13 of the fine-tuning lab opens the real-projects chapter with the course goal: take a free, open-weight foundation model (Qwen3.8 8B or 27B) and make it an expert, in Omani intangible heritage (TurathAI) or in recognising Omani plants (UTAS-70). An animated two-lane scene shows the shared recipe (RAG for verified facts and references, the key component of both; fine-tuning for the expert way of answering) and the extra computer-vision step in UTAS-70, then follows a question and a photo through each lane. Tools: the two project briefs side by side, an 8B-vs-27B chooser with QLoRA and serving memory against four GPUs, a remembered roadmap for each project linking every step to the part that teaches it, and a game sorting eight jobs between vision, RAG and fine-tuning.
- **A real project: TurathAI** — part 12 of the fine-tuning lab follows a UTAS student project that plans to fine-tune Qwen3.8-27B on verified Omani intangible heritage with QLoRA and Unsloth on a rented RunPod GPU, then answer with RAG and citations. It has two animated scenes (the project's eight phases from sources to deployment, including OCR correction, cultural review, JSONL and the split by story family; and how a question is answered online with retrieval, citations and archive updates without retraining), a **dataset builder** that turns real UNESCO-listed Omani elements (Al-Bar’ah, Al-Khanjar, Alheda’a) into a source-register entry, Arabic JSONL lines and the chat template, and flags a **leak** when one story is split across sets, a 27B memory plan, the team's Unsloth code, an **evaluation workbench** with the report's rubric and a teacher's scoring to compare with, and a remembered **eight-phase checklist** for students planning their own project.

- **Nine numbered lessons** — the lab tabs are numbered 1–9 and stay in the same place on every screen. Under them, a lesson guide names the question the lab answers, lists the ideas and three things to try, and has **Continue** and back buttons. **Hide intro** collapses the guide and the home header into a compact workspace; the choice is remembered.
- **Neuron anatomy** — the inspector opens with a picture of the selected neuron: inputs → × weights → Σ → + bias → activation → output, with the live numbers on every part. During a forward pass the part being calculated lights up.
- **The activation as a curve** — the Activate step draws the activation function with a dot where this neuron sits, and states the slope at that point. The slope is the number backpropagation multiplies the error by, so a flat ReLU visibly explains why a switched-off neuron stops learning.
- **A diagram that stays put** — the forward-pass timeline, the backward-pass lesson, and the auto-train report open below the network diagram, and starting a run scrolls the diagram into view.
- **A complete backward pass** — every neuron’s δ is shown with its real activation slope, hidden neurons show where their error comes from (Σ δ(next) × w), and the correction table lists every layer.
- **The LLM playground as a guided pipeline** — the prompt travels down the page through six colour-coded stages, **Tokens → Embeddings → Attention → MLP → Softmax → Learn**. Each stage pairs a live picture with *What happens*, *Why it matters*, and a *Try it* prompt, and a connector between stages names what is handed on (“5 token numbers”, “1 context vector”). A sticky rail on the left shows the live result of every stage (“reads “to” 52%”, “20 of 32 neurons on”) and jumps to it. Tokens shows each word’s vocabulary number, the whole vocabulary, and the training story; Embeddings shows token row + position row = the vector the model reads; MLP lights its 32 hidden neurons; Softmax shows every score beside its probability; Learn shows the loss calculation and how large the gradient is for each group of weights. During **Backprop one step** the connectors and the rail turn coral and run upward. Words outside the vocabulary are reported instead of silently dropped.
- **A searchable glossary** — about 45 terms in four groups (one neuron, networks, learning, language models), each with a plain-language meaning, a worked example, and a link to the lab that shows it.

- **Classroom journey** — four preset cards in the page header describe the goal of each story, and the matching preset stays highlighted.
- **Your quest** — four small missions (run the numbers, open a neuron, change a weight, teach the network) light up as the student does them, with a progress ring and a small celebration when all four are complete. Progress is saved in the browser and can be reset with the circular arrow.
- **A diagram that explains itself** — each of the six stages has a name, an icon, a progress bar, a one-line explanation, and a step counter. Data dots flow continuously along the connections for the whole layer — they never jump back to the start when the stage changes — and keep going into the next layer when values pass forward. The leading packets are labelled with the value they carry, with a soft glow trail behind them, and a neuron ring pulses while its products are being added.
- **Signal-flow arrows that ride the calculation** — during a forward pass, every moving value packet carries a high-contrast gold arrow on a parallel lane just below it, with the same phase and timing. Nothing moves when nothing is being calculated; the legend names **Signal flow** only while the pass runs. The lesson motion keeps playing even when the operating system asks for reduced motion, because the movement is the explanation; **Pause** stops it.
- **Zoom, pan, and expand the network** — the Network diagram has **− / + / Fit** controls, a live percentage, **Ctrl + scroll-to-zoom around the pointer**, and **drag-anywhere panning** after zooming. The **expand** button fills the viewport; **Exit full screen** (or Esc) restores it. This makes a specific connection or weight readable in a wide network.
- **The math in two places** — the calculation card on the diagram follows the current animation stage, while the inspector keeps the full four-step breakdown, editable weights and bias, and a note of what the last run used.
- **Pacing controls** — pause, resume, show the result, replay, and a 0.5×/1×/1.5×/2× speed control. Reduced-motion preferences stop the decorative motion, but the value packets and direction arrows keep moving because they are the lesson; **Pause** stops them.
- **Small rewards** — output values pop when they arrive, training shows a percentage drop badge and a confetti burst when the loss improves, and the run button pulses whenever the diagram is out of date.
- **From neurons to LLMs** — the **LLM playground** reuses the same visual language: tokens become nodes, attention links carry moving light, gradients flow back in coral, and the next-token probabilities are always on screen. The model is real, the numbers are computed live, and the weights can be trained from the page.
- **Worked backprop examples** — five tiny networks with a step-by-step walkthrough of the forward pass, loss, backward pass, and parameter update. Every card shows the substituted arithmetic. The network draws **gold-forward** and **green-backward** arrow lanes; choose **Auto / Both / Forward / Backward**, change the speed, pause or resume the arrows, or click a connection to flip. The diagram also lights the forward flow in cyan and the backward flow in coral.
- **Backward pass on the main network** — set a target and learning rate for your own network, then step through the loss, error slope, every layer’s share of the error, the gradients, the update, and the new prediction. Coral error packets move from output to inputs, red labels show the weight gradients, and the correction table shows **old / gradient / new** for every knob. **Apply correction** updates the network by one gradient step; the before/after loss makes the effect visible.
- **Auto-train** — give the target, learning rate, and number of steps. The app runs the forward pass, repeats the backward step, tracks the loss after every step, keeps the network with the lowest loss, and applies it. The result panel shows before, best, and final predictions, the best step, and a loss chart, so students can see that the final step is not always the best one.
- **Neuron tutor chat** — a local chat on the Network output that reads the current numbers. Ask why the prediction is what it is, what would happen if the bias/weight/activation changed, why the loss is high, or how to reach a target. It answers with the actual arithmetic, shows the target’s reachable range for the activation, and can launch **Auto-train** toward a target the student names. It only changes the network when the student presses Auto-train.
- **English / Arabic interface** — a persisted language switch in the top bar with a right-to-left layout. Every screen is translated: about 2,200 pieces of text in `frontend/src/locales/ar.json`. The neuron tutor understands questions typed in Arabic, and the glossary can be searched in either language.
- **2D playground** — a TensorFlow Playground-style board built into Neuron Lab. A top run bar controls play, pause, step, reset, epoch, learning rate, activation, L1/L2 regularization, regularization rate, and problem type. The left **Data** column provides Circle, XOR, Gaussian, Spiral, Plane, and Gaussian regression datasets, a training/test ratio slider, noise, batch size, and regenerate. The center is a live network with seven feature maps, 0–6 hidden layers, 1–8 neurons per layer, weighted links with moving signal dots, and click-to-toggle features, bias editing, and weight editing. The right **Output** column shows test/training loss, an axis-labelled heatmap of the selected neuron or output, Show test data, Discretize output, the color legend, and a loss chart. Classification uses tanh output and ±1 labels; regression uses linear output; both use the original 0.5 × squared-error objective.
- **House-price case study** — a complete ten-step project in the **House case** tab: define the task, clean the records, split train/validation/test, scale the features, choose a 2 → 3 → 1 network (9 weights + 4 biases), initialize with seed 42, train in batches of 100, repeat across epochs, validate, and test. Each step has a full document with a student check, and the live lab trains on 1,000 houses, reports the 10 batch losses, the per-epoch training/validation error, before/after MAE for all three splits, and sample predictions. The case study can be printed, and the two reference posters are built in with a zoomable viewer.
- **Exam-score case study** — a second ten-step project in the **Exam case** tab: predict a score out of 100 from study hours and attendance. It uses the same 2 → 3 → 1 network (9 weights, 4 biases), 1,000 training students, 100 validation and 100 test students, seed 42, and 10 batches of 100. The live lab reports batch losses, training/validation RMSE, before/after MAE, and four sample predictions. Both the English and Arabic reference posters are included in the zoomable poster viewer.
- **Downloadable case data and Python projects** — each case offers an `.xlsx` workbook and a ZIP starter project. The workbook contains the full 1,200 rows, 10 complete batch sheets, validation/test sheets, a summary, and instructions. The Python project imports the workbook with pandas, trains the same seed-42 2 → 3 → 1 network, reports MAE/RMSE for all splits, and writes a results workbook. A copy-code button also puts the entire script on the clipboard.
- **Hardware & software advisor** — reads the current fully connected network, counts weights, biases, and parameters per layer, and computes batches per epoch, optimizer updates, and exact parameter storage. Optional fields cover training examples, batch size, epochs, precision, optimizer, and the student's RAM/CPU/GPU; browser-reported CPU cores are labeled separately. The recommendation explains CPU sufficiency, suggested RAM, and whether a dedicated GPU is unnecessary, optional, or worth evaluating, with transparent threshold rules and no fabricated timings. The software table covers browser playgrounds, NumPy, PyTorch, Colab, Jupyter, and VS Code, and the educational section and 2 → 3 → 1 worked example use the house-price context.
- **Python training guide** — generates a complete 15-step PyTorch walkthrough from the current architecture, activation functions, and seed: environment setup, seeds, data inspection, cleaning/splitting, scaling, tensors/batches, model inspection, loss/optimizer, a non-destructive one-batch demonstration, a full mini-batch training loop, validation and best-checkpoint selection, plots, test metrics, a new-example prediction, and save/reload. The guide provides per-step and complete-script copy buttons, downloadable `.py`, `.ipynb`, and `requirements.txt`, and clearly labels synthetic data, defaults, hardware assumptions, and early-stopping behavior. The full generated script is executed end to end in the test suite.
- **A reading room, not a link dump** — 43 curated resources with a one-line reason, a time estimate, a level, and six learning paths. Search, filter by media type, save what you want, and jump into the matching lab from the card.
- **A screening room with a quality gate** — 23 LLM lectures, all scored 9.0+, 12 from 2025–26, with in-page players, chapters, watch-later and watched marks, and lab links. No random tutorials, no clickbait.
- **Challenges that explain, not just answer** — revealing a challenge gives the full arithmetic, a plain-language explanation of every number, the effect on the next layer, a what-if table, and (for the one-neuron challenge) buttons that run bias −5, −3, or the original −1 in the diagram.
- **Settings explained for beginners** — a **!** beside the preset, architecture, inputs, hidden layers, outputs, input values, activation functions, starting weights, seed, and initialize button opens a plain-language guide: the simple idea, why it matters, what it changes in the calculation, a what-if example, the current values, and a reminder. It is written for a student who has never seen a neural network.
- **Every number has a name** — the **?** on a calculation card (or **Explain** in the inspector) opens `a = f(Σ xᵢ·wᵢ + b)` with a symbol table, step-by-step symbolic and substituted equations, and what-if examples; a **!** beside each card stage jumps straight to that step. The calculation panel is draggable by its header, resizable from the corner, and scrolls, so long equations never collide with the title or get clipped.
- **A tracer, not just an animation** — press **Trace top link** in the LLM lab to follow one loss value through nine chain-rule stages, with the local slope, the error arriving, the error sent back, and the link's contribution on screen. The traced arc turns amber while the rest of the graph dims.
- **Keyboard and screen readers** — neurons are reachable with Tab and toggled with Enter or Space, Escape closes an open calculation, and each stage is announced through a live region. Token chips in the LLM graph are buttons with names and selection state.

## How the lab handles changes

- **Initialize weights** sets starting weights from the seed and sets biases to zero. The backend uses uniform He initialization for ReLU and uniform Xavier initialization for Linear, Sigmoid, and Tanh.
- **Run forward pass** animates each layer using the calculated values. Blue pulses follow the curved connections as values arrive, and amber pulses show weighted products. Click a neuron to open its calculation, then click it again to close it. The pulses continue whether the calculation is open or closed. After an edit, the diagram marks the results as needing a new run and the run button pulses.
- **Train** uses mean squared error and updates the weights and biases once per step using the full dataset. The predictions and selected weight in the report belong to the last step. The chart covers the whole session.
- **Reset training** restores the parameters from before the first step of that session. Changing the network or examples starts a fresh session from the current parameters. The training rate and step count can change between runs in a session.
- Resizing keeps a weight when both of its neurons still exist and remain adjacent. If you add or remove the last hidden layer, the output neurons keep their biases and activation. Their new incoming connections get new weights.
- **Lessons** saves named snapshots of the current network and any training settings and examples. Reopening a lesson recalculates its forward pass. Training history is kept for the current session.
- **Quest progress and animation speed** are stored only in this browser. The lab works without them and never sends them to the server.

## Tests

Run the API and math tests from the project folder.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

```bash
.venv/bin/python -m pytest -q
```

Playwright builds the frontend and starts a separate FastAPI instance on port 8011 with its own temporary database. Run it with your virtual environment active so Playwright can find Python.

**PowerShell**

```powershell
$env:Path = "$(Resolve-Path .venv/Scripts);$env:Path"
Set-Location frontend
npx.cmd playwright install chromium
npm.cmd test
```

**macOS and Linux**

```bash
source .venv/bin/activate
cd frontend
npx playwright install chromium
npm test
```

If Chrome is already installed, set `NEURON_LAB_BROWSER=chrome` in your shell to run the suite with it.

### Verification results

- The production build, 36 pytest checks, and 41 Playwright tests pass. TypeScript also passes `tsc --noEmit --noUnusedLocals --noUnusedParameters`, so there are no unused imports, locals, or parameters.

- The first lesson produced products `[1, 3]`, sum `4`, and output `3`. The second produced hidden outputs `[3, 0]` and final output `1.75`.
- The gradient check compared every weight and bias in a small two-layer network with a numerical approximation. The checks agreed within `1e-8`.
- The AND preset reduced mean squared error from `0.241154` to `0.051130` in 120 steps at a learning rate of 1.
- The transformer gradient check compared every parameter group with a numerical approximation and agreed within `1e-6`. Its attention rows sum to one and never look at future tokens.
- The worked-example checks compared every weight and bias in all five examples with a numerical slope, confirmed the one-weight step reaches loss 0, and confirmed that the blocked ReLU has zero gradients.
- The tracer check walked the loss back to the token embedding and confirmed that `∂L/∂a` equals the attention gradient reported by the backward pass.
- The LLM browser checks walked through the default prompt, clicked an earlier token to move the causal query, appended the top token, ran a backprop step, traced the loss through nine chain-rule cards, and reset the model.
- The worked-example browser checks walked the one-weight example to the updated loss and followed the error into a hidden layer.
- The worked-example flow check confirmed that a forward step shows only the gold lane and a backward step shows only the green lane; it switched between **Auto**, **Both**, **Forward**, and **Backward**, changed the speed, paused and resumed the arrows, and clicked a connection to flip the flow. A reduced-motion run confirmed the arrows still animate.
- The main-network checks confirmed there are no arrows at rest, then verified that every moving value packet has an arrow on a parallel lane with the same phase and animation. A reduced-motion run confirmed the value packets and arrows keep moving together, and the Pause control stops them.
- The learning-path tests checked the neuron anatomy and activation curve, the real sigmoid slope (not a flat 1) in the backward-pass arithmetic, the lesson guide and its remembered **Hide intro** choice, the glossary search and its jump into a lab, every LLM stage card, and the unknown-word notice.
- The diagram zoom test checked **125%** with the buttons, **drag-to-pan**, **Fit** returning to **100%**, a plain mouse wheel leaving the zoom at 100%, and **Ctrl + wheel zoom**.
- The full-screen diagram test confirmed the expanded canvas fills the viewport and **Exit full screen** restores the panel.
- The challenge test revealed the full explanation and what-if table, then ran bias −5, −3, and the original −1, checking outputs 0, 1, and 3.
- The explainer test opened the full calculation from the card and the inspector, checked the whole equation, variable table, bias step, per-step **!** focus, what-if section, and that the calculation panel can be dragged and resized.
- The settings-guide test opened the architecture, input-value, and hidden-layer guides and checked the simple idea, why it matters, the calculation effect, what-if, current values, and remember line.
- The backward-pass API test checked the loss, the weight gradients, and the lower loss after one step. The browser test set target 1, stepped through compare → error → output layer, saw the coral error packets and gradient labels, applied the correction, and watched the output change from 3 to 0.
- The auto-train API test checks that the kept best loss is the minimum of the history. The browser test set target 1, pressed Auto-train, saw the loss chart and best step, confirmed the best result was applied, then ran it again and closed back to the setup.
- The tutor browser test opened the chat, asked why the output is what it is, checked the product arithmetic and ReLU explanation, asked how to reach the target, pressed the tutor’s Auto-train action, and saw the automatic result and the tutor’s summary.
- The house-case API test checked the 2 → 3 → 1 shape (9 weights, 4 biases), 1,000/100/100 split, 10 batches, 100 updates, 11 epoch points, and lower train/test MAE after training. The browser test opened the case study, checked the 10 step rail, the House 1,000 row, the two reference posters and the zoom viewer, the live lab, the batch shape, and the network’s 9 weights and 4 biases.
- The exam-case API test checked the same 2 → 3 → 1 shape, 1,000/100/100 split, 10 batches, 100 updates, 9 weights, 4 biases, the four illustrative students, and lower training MAE. The browser test opened the Exam case, found both English and Arabic posters, opened the zoom viewer, waited for the live 2 → 3 → 1 lab, and checked 10 batch losses and the four student predictions.
- The downloadable workbooks were checked independently: 1,200 full rows, 10 batch sheets with exactly 100 rows each, and 100 validation plus 100 test rows. Both Python scripts ran end to end with pandas/openpyxl: house MAE fell from 30,315 to 9,397 OMR; exam MAE fell from 12.25 to 3.30 points; both wrote their results workbooks. The 16-page student build guide was rendered from its HTML source, included in both project ZIPs and desktop folders, and its PDF download returns 200 from the running app.
- The advisor browser test loaded the 2 → 3 → 1 house setup, checked 9 weights, 4 biases, 13 parameters, 10 batches, 200 updates, and 52 B float32 storage, verified that the GPU is unnecessary, that 1,005 examples give 11 batches and 220 updates, and that float16 storage is 26 B. The software links target the verified official pages.
- The Python guide tests checked all 15 steps, the exact `nn.Linear(2, 3)` / `nn.Linear(3, 1)` layers, 13 trainable parameters, 10 batches and 200 updates, the incomplete-batch 1,005 → 11 case, a 15-code-cell notebook, and the copy/download actions. A small generated guide ran end to end with Python 3.14 and PyTorch 2.13: it trained, restored the best validation state, reported test MAE/RMSE, predicted a new house, saved the checkpoint, reloaded it, and confirmed the predictions matched.
- The playground model tests trained a 2 → 4 → 1 XOR network and a feature-engineered circle classifier, verified the 500-example classification split and ±1 labels, and trained a plane-regression network with L2 regularization. The browser test verifies that the flow canvas is frozen while paused, moves only after Play, and freezes again on Pause; it also stepped an epoch, switched to regression and verified the Plane dataset, added and removed a hidden layer, and changed regularization, regularization rate, and activation.
- The language test switched to العربية, checked `lang="ar"` and `dir="rtl"`, verified the Arabic navigation and brand, reloaded to confirm persistence, then switched back to English. The Playground test additionally verifies the flow animation is frozen while paused, runs only after Play, and freezes again on Pause.
- The library browser checks searched the collection, filtered to papers, saved a resource, filtered to saved items, and jumped from a card into the worked-example lab. A phone-width run confirmed the reading room fits without horizontal overflow.
- The video-library browser checks opened the primer and its YouTube embed, searched by channel, filtered by topic and by 2025–26 freshness, selected a video, saved and watched it, and jumped into the LLM lab. A phone-width run confirmed the screening room fits without horizontal overflow.
- The browser checks exercised keyboard neuron selection, weight editing, layer navigation, two-layer animation with pause and replay, training and reset, lesson storage, a narrow layout, the quest steps and reset, and the animation speed control. A reduced-motion run also completed the full forward pass: the value packets and arrows keep moving because that motion is the lesson, and Pause stops them.
- The layout was reviewed at 390, 420, 720, 900, 1280, 1440, and 1920 pixels, including presentation view, both dialogs, the LLM laboratory, the worked-example gallery, the resource library, and the screening room.

## Project files

- `frontend/src/App.tsx` owns the classroom state, quest tracking, speed control, the challenge explanations, and the dialogs.
- `frontend/src/Hero.tsx` contains the animated header and the four journey cards.
- `frontend/src/lessons.ts` lists the nine labs in teaching order; `LessonGuide.tsx` renders the numbered tabs and the lesson guide.
- `frontend/src/NeuronAnatomy.tsx` draws the neuron picture and the activation curve used by the inspector.
- `frontend/src/Glossary.tsx` holds the searchable glossary.
- `frontend/src/Quest.tsx` stores and renders the four guided missions.
- `frontend/src/Diagram.tsx` draws the SVG network, the labelled data packets, the moving signal-flow arrows, the draggable/resizable calculation panel, the zoom/pan/full-screen controls, and the activation burst.
- `frontend/src/ForwardPlayback.tsx` defines the six animation stages, the timeline, and the speed control.
- `frontend/src/TurathCase.tsx`, `turathContent.ts` and `turath.css` hold the TurathAI case study (part 12 of the fine-tuning lab).
- `frontend/src/HybridLesson.tsx`, `hybridContent.ts` and `hybrid.css` hold the fine-tuning-versus-RAG part and the three analogies.
- `frontend/src/RagLesson.tsx` and `rag.css` hold the RAG and JSONL tools of that part.
- `frontend/src/PlantCase.tsx`, `visionContent.ts` and `plants.css` hold parts 13 and 14, and `RelayScene.tsx` with `relay.css` holds the relay animation (fine-tuning for images and the UTAS-70 project).
- `frontend/src/LabShell.tsx`, `labNav.ts` and `labshell.css` hold the lab's frame: chapters, pipeline map, tabs, summary cards, reference sheet, search and progress.
- `frontend/src/LessonScenes.tsx` and `lesson-scenes.css` hold the key-words, documents-to-JSONL, kitchen and training-step scenes; `ParameterLesson.tsx` and `parameter.css` the parameter tools; `FineTuneLessons.tsx` and `lessons.css` the hands-on panels built from the course notes, with their wording in `lessonContent.ts`.
- `frontend/src/FineTuneScenes.tsx` and `finetune-scenes.css` hold the three animated scenes and their step player.
- `frontend/src/FineTuneLab.tsx` renders the fine-tuning lab; `finetuneModel.ts` holds its arithmetic (the LoRA trainer, the quantizer, the memory budget), `finetuneContent.ts` its English and Arabic wording, and `finetune.css` its styles. It reuses the page frame from `llm.css`.
- `frontend/src/LlmLab.tsx`, `llm.ts`, and `llm.css` render and style the transformer playground: the prompt card, the stage rail, the six stage sections, attention flow, next-token bars, the error path, and the chain-rule tracer.
- `frontend/src/BackpropExamples.tsx`, `examples.ts`, and `examples.css` render the worked-example gallery, its step cards, and the forward/backward network diagram.
- `frontend/src/ResourceLibrary.tsx`, `library.ts`, and `library.css` render and style the reading room. The resource list, one-line reasons, and six learning paths live in `library.ts`; saved and finished marks use local storage.
- `frontend/src/VideoLibrary.tsx`, `videos.ts`, and `video.css` render and style the screening room. The 23 picks, scores, chapters, and verified counts live in `videos.ts`; watch-later and watched marks use local storage.
- `backend/examples.py` defines the five worked examples. `engine.trace` in `backend/engine.py` produces the complete forward, backward, update, and new-loss data.
- `frontend/src/Inspector.tsx`, `Settings.tsx`, and `Training.tsx` render the editable math, architecture controls, and training report.
- `frontend/src/CalculationExplainer.tsx` builds the full-equation dialog with the symbol table, step cards, and what-if examples.
- `frontend/src/SettingsGuide.tsx` builds the plain-language network-settings guides.
- `frontend/src/BackpropPlayback.tsx` builds the backward-pass step panel, correction table, and before/after result.
- `frontend/src/AutoBackpropPanel.tsx` builds the automatic pass: loss chart, before/best/final predictions, and best-result summary.
- `frontend/src/NeuronTutor.tsx` builds the local result tutor: the chat, the why/what-if/improve answers, and the Auto-train action.
- `frontend/src/HouseCaseStudy.tsx` builds the ten-step house-price case study and the live mini-batch lab.
- `frontend/src/ExamCaseStudy.tsx` builds the ten-step exam-score case study and its live lab.
- `frontend/src/examConfig.ts` holds the exam case constants and poster metadata.
- `frontend/src/CaseDownloads.tsx` adds the Excel, Python-project, copy-code, and student-guide actions to both cases.
- `study-cases/house/train_house.py` and `study-cases/exam/train_exam.py` are the tested, downloadable training projects.
- `study-cases/student-build-guide.html` and `.pdf` are the printable 14-section student build guide.
- `scripts/export_study_cases.py` regenerates the Excel workbooks, ZIPs, desktop study folders, and guide copies.
- `frontend/src/HouseReferences.tsx` builds the zoomable reference-poster section, shared by both cases.
- `backend/exam.py` generates the exam data and runs the 2 → 3 → 1 mini-batch training.
- `frontend/src/Advisor.tsx` builds the hardware/software advisor panel.
- `frontend/src/advisorModel.ts` holds the parameter, batch, update, storage, and heuristic calculations.
- `frontend/src/advisor.css` styles the advisor.
- `frontend/src/PythonGuide.tsx` builds the interactive 15-step Python training guide.
- `frontend/src/guideGenerator.ts` generates the runnable script, notebook, requirements, and per-step explanations.
- `frontend/src/i18n.tsx` holds the language provider, the persisted switch, and the RTL setup.
- `frontend/src/translate.ts` is the translation engine and `frontend/src/locales/ar.json` is the Arabic dictionary, keyed by the English text. `frontend/src/i18n-jsx/` is the app’s JSX runtime (set in `vite.config.ts`): it passes every element’s text through the engine, so a screen needs no translation code of its own. A key such as `Layer {0} of {1}` is a pattern. Add `data-keep` to an element whose text must never be translated (model tokens, names the student typed).
- `frontend/scripts/i18n-extract.mjs` lists every piece of English text in the interface and `i18n-merge.mjs` merges translated lines into `ar.json`; `docs/i18n/` keeps the translation batches. To translate new text, add an entry to `ar.json` with the English text as the key.
- `frontend/src/Playground.tsx` builds the TensorFlow Playground-style board, data column, network column, and output column.
- `frontend/src/NetworkStage.tsx` draws the interactive feature/neuron/connection stage.
- `frontend/src/playgroundModel.ts` implements the seeded datasets, feature engineering, network, classification/regression losses, and regularization.
- `frontend/src/playground.css` styles the light playground board.
- `frontend/src/houseConfig.ts` holds the shared house feature/target names, split counts, batch size, learning rate, epochs, and network shape.
- `frontend/src/libraryStorage.ts` holds the localStorage helpers used by every saved preference; they fail quietly when storage is blocked.
- `frontend/src/python-guide.css` styles the guide.
- `backend/house.py` generates the classroom house set and runs the 2 → 3 → 1 mini-batch training.
- `frontend/src/styles.css` holds the dark classroom theme, motion system, and responsive rules.
- `backend/engine.py` contains the NumPy forward pass, initializers, and training math.
- `backend/llm.py` contains the word-level transformer forward pass and analytic backward pass. `backend/train_llm.py` regenerates `backend/llm_weights.npz` if the story or dimensions change.
- `backend/models.py` contains the Pydantic validation for architecture, numbers, training examples, and LLM requests.
- `backend/schema.sql` creates the lesson table. FastAPI runs it at startup and saves lessons in `backend/lessons.sqlite3` by default. Set `NEURON_LAB_DB` to use another database path.
- `tests/` and `frontend/tests/` contain the pytest and Playwright suites.
- `frontend/scripts/` contains the screenshot helpers used while polishing the interface.
"# ai-simulator-" 
