"""A tiny character-level transformer that the LLM playground can explain.

One attention head, one residual block, a ReLU feed-forward layer, and a
softmax over the next character. Both the forward pass and the analytic
backward pass live here, so the classroom can show real numbers travelling in
both directions.

The model is deliberately small enough to read:

    x    = embedding(token) + position
    q,k,v= x · Wq, x · Wk, x · Wv
    a    = softmax(q · kᵀ / √d)     (causal)
    o    = (a · v) · Wo + bo
    h    = o + x
    h2   = relu(h · W1 + b1) · W2 + b2 + h
    p    = softmax(h2 · Wout + bout)
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np

CORPUS = (
    "the cat sat on the mat . the dog sat on the log . "
    "the cat saw the dog . the dog saw the cat . "
    "the cat ran to the mat . the dog ran to the log . "
)

WORD = re.compile(r"[a-z]+|[.]")


def word_tokenizer(text: str) -> list[str]:
    return WORD.findall(text.lower())


def sentence(pieces: list[str]) -> str:
    text = ""
    for piece in pieces:
        if not text:
            text = piece
        elif piece == ".":
            text += piece
        else:
            text += " " + piece
    return text


def join_token(text: str, token: str) -> str:
    text = text.rstrip()
    if not text:
        return token
    return text + token if token == "." else text + " " + token


def short(value: float) -> str:
    """A compact number for the chain-rule cards."""
    if value == 0:
        return "0"
    if abs(value) >= 1000:
        return f"{value:.0f}"
    if abs(value) >= 10:
        return f"{value:.2f}"
    if abs(value) >= 1:
        return f"{value:.3f}"
    if abs(value) < 1e-4:
        return f"{value:.2e}"
    return f"{value:.5f}"


def length(vector) -> float:
    return float(np.linalg.norm(vector))


def strongest_component(vector) -> tuple[int, float]:
    index = int(np.argmax(np.abs(vector)))
    return index, float(vector[index])


CONTEXT = 12
D_MODEL = 16
D_HIDDEN = 32
SEED = 7
PRETRAIN_STEPS = 3000
PRETRAIN_RATE = 0.3
WEIGHTS = Path(__file__).with_name("llm_weights.npz")


def softmax(values, axis=-1):
    shifted = values - np.max(values, axis=axis, keepdims=True)
    exponential = np.exp(shifted)
    return exponential / exponential.sum(axis=axis, keepdims=True)


class LanguageModel:
    """A tiny next-character transformer with explicit gradients."""

    def __init__(self, corpus: str = CORPUS, context: int = CONTEXT,
                 d_model: int = D_MODEL, d_hidden: int = D_HIDDEN, seed: int = SEED,
                 tokenizer=word_tokenizer):
        self.corpus = corpus
        self.context = context
        self.d_model = d_model
        self.d_hidden = d_hidden
        self.tokenizer = tokenizer
        self.pieces = tokenizer(corpus)
        self.vocab = sorted(set(self.pieces))
        self.stoi = {token: index for index, token in enumerate(self.vocab)}
        self.itos = self.vocab

        rng = np.random.default_rng(seed)
        scale = 0.12
        size = len(self.vocab)
        self.params = {
            "E": rng.normal(0, scale, (size, d_model)),
            "P": rng.normal(0, 0.02, (context, d_model)),
            "Wq": rng.normal(0, scale, (d_model, d_model)),
            "Wk": rng.normal(0, scale, (d_model, d_model)),
            "Wv": rng.normal(0, scale, (d_model, d_model)),
            "Wo": rng.normal(0, scale, (d_model, d_model)),
            "bo": np.zeros(d_model),
            "W1": rng.normal(0, scale, (d_model, d_hidden)),
            "b1": np.zeros(d_hidden),
            "W2": rng.normal(0, scale, (d_hidden, d_model)),
            "b2": np.zeros(d_model),
            "Wout": rng.normal(0, scale, (d_model, size)),
            "bout": np.zeros(size),
        }

    # ------------------------------------------------------------------ basics

    @property
    def parameters(self) -> int:
        return int(sum(value.size for value in self.params.values()))

    def copy(self) -> "LanguageModel":
        clone = object.__new__(LanguageModel)
        clone.corpus = self.corpus
        clone.context = self.context
        clone.d_model = self.d_model
        clone.d_hidden = self.d_hidden
        clone.tokenizer = self.tokenizer
        clone.pieces = list(self.pieces)
        clone.vocab = list(self.vocab)
        clone.stoi = dict(self.stoi)
        clone.itos = clone.vocab
        clone.params = {name: value.copy() for name, value in self.params.items()}
        return clone

    def clean(self, prompt: str) -> tuple[list[str], list[str]]:
        pieces = self.tokenizer(prompt)
        unknown = sorted({piece for piece in pieces if piece not in self.stoi})
        known = [piece for piece in pieces if piece in self.stoi]
        return known, unknown

    def encode(self, prompt: str) -> list[int]:
        known, _ = self.clean(prompt)
        if not known:
            known = [self.vocab[0]]
        return [self.stoi[piece] for piece in known[-self.context:]]

    def display(self, prompt: str) -> str:
        known, _ = self.clean(prompt)
        return sentence(known)

    def windows(self):
        ids = np.array([self.stoi[piece] for piece in self.pieces], dtype=int)
        starts = len(ids) - self.context
        inputs = np.stack([ids[start:start + self.context] for start in range(starts)])
        targets = np.stack([ids[start + 1:start + 1 + self.context] for start in range(starts)])
        return inputs, targets

    def next_token(self, prompt: str) -> tuple[str | None, bool]:
        pieces = self.tokenizer(prompt)
        if not pieces:
            return None, False
        count = len(pieces)
        for start in range(len(self.pieces) - count):
            if self.pieces[start:start + count] == pieces:
                return self.pieces[start + count], True
        return None, False

    def target_at(self, prompt: str, ids: list[int], index: int) -> tuple[str | None, bool]:
        """The real next token: inside the prompt, then from the story."""
        if index < len(ids) - 1:
            return self.itos[ids[index + 1]], True
        return self.next_token(prompt)

    # ----------------------------------------------------------------- forward

    def forward(self, ids):
        array = np.asarray(ids, dtype=int)
        single = array.ndim == 1
        if single:
            array = array[None, :]
        batch, steps = array.shape
        p = self.params
        causal = np.tril(np.ones((steps, steps), dtype=bool))

        x = p["E"][array] + p["P"][:steps]
        q = x @ p["Wq"]
        k = x @ p["Wk"]
        v = x @ p["Wv"]
        scores = q @ np.transpose(k, (0, 2, 1)) / np.sqrt(self.d_model)
        scores = np.where(causal, scores, -1e9)
        attention = softmax(scores, axis=-1)
        context = attention @ v
        out = context @ p["Wo"] + p["bo"]
        hidden = out + x
        a1 = hidden @ p["W1"] + p["b1"]
        g = np.maximum(a1, 0.0)
        y = g @ p["W2"] + p["b2"]
        hidden2 = y + hidden
        logits = hidden2 @ p["Wout"] + p["bout"]
        probs = softmax(logits, axis=-1)

        cache = {
            "ids": array, "x": x, "q": q, "k": k, "v": v,
            "scores": scores, "attention": attention, "context": context,
            "out": out, "hidden": hidden, "a1": a1, "g": g, "y": y,
            "hidden2": hidden2, "logits": logits, "probs": probs,
            "batch": batch, "steps": steps,
        }
        return probs, cache

    # ---------------------------------------------------------------- backward

    def backward(self, cache, dlogits):
        p = self.params
        x, q, k, v = cache["x"], cache["q"], cache["k"], cache["v"]
        attention, context = cache["attention"], cache["context"]
        hidden, a1, g = cache["hidden"], cache["a1"], cache["g"]
        hidden2 = cache["hidden2"]
        grads = {}

        grads["Wout"] = np.einsum("ntd,ntv->dv", hidden2, dlogits)
        grads["bout"] = dlogits.sum(axis=(0, 1))
        dhidden2 = dlogits @ p["Wout"].T

        grads["W2"] = np.einsum("nth,ntd->hd", g, dhidden2)
        grads["b2"] = dhidden2.sum(axis=(0, 1))
        dg = dhidden2 @ p["W2"].T
        da1 = dg * (a1 > 0)
        grads["W1"] = np.einsum("ntd,nth->dh", hidden, da1)
        grads["b1"] = da1.sum(axis=(0, 1))
        dhidden = dhidden2 + da1 @ p["W1"].T

        grads["Wo"] = np.einsum("ntd,nte->de", context, dhidden)
        grads["bo"] = dhidden.sum(axis=(0, 1))
        dcontext = dhidden @ p["Wo"].T

        dattention = dcontext @ np.transpose(v, (0, 2, 1))
        dv = np.transpose(attention, (0, 2, 1)) @ dcontext
        dscores = attention * (dattention - (dattention * attention).sum(axis=-1, keepdims=True))

        root = np.sqrt(self.d_model)
        dq = dscores @ k / root
        dk = np.transpose(dscores, (0, 2, 1)) @ q / root
        grads["Wq"] = np.einsum("ntd,nte->de", x, dq)
        grads["Wk"] = np.einsum("ntd,nte->de", x, dk)
        grads["Wv"] = np.einsum("ntd,nte->de", x, dv)

        dx = dq @ p["Wq"].T + dk @ p["Wk"].T + dv @ p["Wv"].T + dhidden
        dE = np.zeros_like(p["E"])
        np.add.at(dE, cache["ids"], dx)
        grads["E"] = dE
        dP = np.zeros_like(p["P"])
        dP[:cache["steps"]] = dx.sum(axis=0)
        grads["P"] = dP

        extras = {
            "dattention": dattention, "dscores": dscores, "dx": dx, "dcontext": dcontext,
            "dlogits": dlogits, "dh2": dhidden2, "dh": dhidden, "dmlp": da1 @ p["W1"].T,
            "dq": dq, "dk": dk, "dv": dv,
        }
        return grads, extras

    # ------------------------------------------------------------------ losses

    def loss(self, probs, targets):
        picked = np.take_along_axis(probs, targets[..., None], axis=-1)
        return float(-np.log(np.maximum(picked, 1e-12)).mean())

    def batches(self, steps: int, rate: float):
        inputs, targets = self.windows()
        history = []
        for _ in range(steps):
            probs, cache = self.forward(inputs)
            history.append(self.loss(probs, targets))
            onehot = np.zeros_like(probs)
            np.put_along_axis(onehot, targets[..., None], 1.0, axis=-1)
            dlogits = (probs - onehot) / probs[..., 0].size
            grads, _ = self.backward(cache, dlogits)
            for name in self.params:
                self.params[name] -= rate * grads[name]
        probs, _ = self.forward(inputs)
        history.append(self.loss(probs, targets))
        return history

    def corpus_loss(self):
        inputs, targets = self.windows()
        probs, _ = self.forward(inputs)
        return self.loss(probs, targets)

    # ---------------------------------------------------------------- classroom

    def explain(self, prompt: str, position: int | None = None):
        _, unknown = self.clean(prompt)
        ids = self.encode(prompt)
        probs, cache = self.forward(ids)
        steps = len(ids)
        index = steps - 1 if position is None else max(0, min(int(position), steps - 1))

        attention = cache["attention"][0, index, :index + 1]
        scores = cache["scores"][0, index, :index + 1]
        row = probs[0, index]
        order = np.argsort(-row)
        target, matched = self.target_at(prompt, ids, index)
        target_index = self.stoi[target] if target in self.stoi else int(order[0])
        target_probability = float(row[target_index])

        def vector(values):
            return [round(float(value), 5) for value in values]

        return {
            "prompt": self.display(prompt),
            "unknown": unknown,
            "tokens": [self.itos[token] for token in ids],
            "position": index,
            "attention": [round(float(value), 6) for value in attention],
            "scores": [round(float(value), 6) for value in scores],
            "ids": [int(token) for token in ids],
            "token_embedding": vector(self.params["E"][ids[index]]),
            "position_embedding": vector(self.params["P"][index]),
            "embedding": vector(cache["x"][0, index]),
            "context_vector": vector(cache["context"][0, index]),
            "mlp_input": vector(cache["hidden"][0, index]),
            "mlp": vector(cache["g"][0, index]),
            "final_vector": vector(cache["hidden2"][0, index]),
            "logits": [round(float(value), 5) for value in cache["logits"][0, index]],
            "probs": [round(float(value), 6) for value in row],
            "top": [
                {"token": self.itos[int(index_)], "prob": round(float(row[index_]), 6)}
                for index_ in order[:10]
            ],
            "predicted": self.itos[int(order[0])],
            "predicted_prob": round(float(row[order[0]]), 6),
            "target": target if target is not None else self.itos[target_index],
            "target_prob": round(target_probability, 6),
            "loss": round(float(-np.log(max(target_probability, 1e-12))), 6),
            "matched": matched,
            "context_window": self.context,
            "vocab": self.vocab,
            "corpus": self.corpus,
            "parameters": self.parameters,
            "model_loss": round(self.corpus_loss(), 6),
        }

    def gradients(self, prompt: str, position: int | None = None, target: str | None = None):
        ids = self.encode(prompt)
        probs, cache = self.forward(ids)
        steps = len(ids)
        index = steps - 1 if position is None else max(0, min(int(position), steps - 1))
        row = probs[0, index]

        lookup, matched = self.target_at(prompt, ids, index)
        chosen = target if target in self.stoi else (lookup if lookup in self.stoi else self.itos[int(np.argmax(row))])
        chosen_index = self.stoi[chosen]

        dlogits = np.zeros_like(probs)
        dlogits[0, index] = row
        dlogits[0, index, chosen_index] -= 1.0
        grads, extras = self.backward(cache, dlogits)
        dattention = extras["dattention"][0, index, :index + 1]
        loss = float(-np.log(max(row[chosen_index], 1e-12)))
        norms = {
            name: float(np.linalg.norm(value))
            for name, value in grads.items()
        }
        return {
            "loss": round(loss, 6),
            "target": chosen,
            "target_prob": round(float(row[chosen_index]), 6),
            "attention": [round(float(value), 6) for value in cache["attention"][0, index, :index + 1]],
            "dattention": [round(float(value), 6) for value in dattention],
            "dscores": [round(float(value), 6) for value in extras["dscores"][0, index, :index + 1]],
            "dembedding": [round(float(value), 5) for value in extras["dx"][0, index]],
            "gradient_norm": round(float(np.sqrt(sum(float(np.sum(value ** 2)) for value in grads.values()))), 6),
            "norms": {name: round(value, 5) for name, value in norms.items()},
            "matched": matched,
        }

    def trace(self, prompt: str, position: int | None = None, target: str | None = None,
              link: int | None = None):
        """Follow one loss value back through every stage of the computation."""
        ids = self.encode(prompt)
        probs, cache = self.forward(ids)
        count = len(ids)
        query = count - 1 if position is None else max(0, min(int(position), count - 1))
        row = probs[0, query]
        lookup, matched = self.target_at(prompt, ids, query)
        chosen = target if target in self.stoi else (
            lookup if lookup in self.stoi else self.itos[int(np.argmax(row))])
        target_index = self.stoi[chosen]

        dlogits = np.zeros_like(probs)
        dlogits[0, query] = row
        dlogits[0, query, target_index] -= 1.0
        _, extra = self.backward(cache, dlogits)

        attention = cache["attention"][0, query, :query + 1]
        if link is None:
            earlier = attention[:query]
            index = int(np.argmax(earlier)) if earlier.size else 0
        else:
            index = max(0, min(int(link), query))
        a_i = float(attention[index])
        token_i = self.itos[ids[index]]
        token_q = self.itos[ids[query]]

        value = cache["v"][0, index]
        key = cache["k"][0, index]
        query_vector = cache["q"][0, query]
        context = cache["context"][0, query]
        hidden = cache["hidden"][0, query]
        hidden2 = cache["hidden2"][0, query]
        score = float(cache["scores"][0, query, index])
        logit = float(cache["logits"][0, query, target_index])
        p_target = float(row[target_index])
        loss = float(-np.log(max(p_target, 1e-12)))

        dz = dlogits[0, query]
        dz_target = float(dz[target_index])
        dh2 = extra["dh2"][0, query]
        dh = extra["dh"][0, query]
        dmlp = extra["dmlp"][0, query]
        dc = extra["dcontext"][0, query]
        dattn = float(extra["dattention"][0, query, index])
        dscore = float(extra["dscores"][0, query, index])
        dkey = extra["dk"][0, index]
        dvalue = extra["dv"][0, index]
        dquery = extra["dq"][0, query]
        dx_i = extra["dx"][0, index]
        dx_q = extra["dx"][0, query]

        link_vector = a_i * value
        context_norm = length(context)
        link_share = length(link_vector) / max(context_norm, 1e-9)
        residual_norm = length(dh2)
        mlp_norm = length(dmlp)
        dh_norm = length(dh)
        dc_norm = length(dc)
        dz_norm = length(dz)
        dh2_norm = length(dh2)
        dx_i_norm = length(dx_i)
        dx_q_norm = length(dx_q)
        dq_norm = length(dquery)
        dkey_norm = length(dkey)
        dvalue_norm = length(dvalue)
        v_norm = length(value)
        k_norm = length(key)
        q_norm = length(query_vector)
        dot = float(np.dot(query_vector, key))
        top_h2, _ = strongest_component(dh2)
        top_x, top_x_value = strongest_component(dx_i)
        diagonal = a_i * (1.0 - a_i)
        link_dot = float(np.dot(dc, value))

        chain = [
            {
                "key": "loss", "title": "Loss", "seed": True,
                "equation": f"L = −log p({chosen}) = −log({short(p_target)}) = {short(loss)}",
                "local": f"∂L/∂p = −1/p = {short(-1.0 / max(p_target, 1e-12))}",
                "incoming": "1 (the seed slope)",
                "outgoing": f"∂L/∂p = {short(-1.0 / max(p_target, 1e-12))}",
                "norm": 1.0,
                "note": "Backprop starts with a slope of one on the loss.",
            },
            {
                "key": "softmax", "title": "Softmax → probability", "seed": False,
                "equation": f"p = softmax(z)   p({chosen}) = {short(p_target)}",
                "local": f"∂p_t/∂z_t = p_t(1−p_t) = {short(p_target * (1 - p_target))}",
                "incoming": f"∂L/∂p = {short(-1.0 / max(p_target, 1e-12))}",
                "outgoing": f"∂L/∂z_t = p_t − 1 = {short(dz_target)}   ‖∂L/∂z‖ = {short(dz_norm)}",
                "norm": round(dz_norm, 6),
                "note": "Softmax couples every logit: raising one lowers the others, so the error spreads to all of them.",
            },
            {
                "key": "logit", "title": "Target logit", "seed": False,
                "equation": f"z_({chosen}) = h2 · Wout[:,{chosen}] + bout = {short(logit)}",
                "local": f"∂z/∂h2 = Wout[:,{chosen}]   dim {top_h2 + 1} → {short(float(self.params['Wout'][top_h2, target_index]))}",
                "incoming": f"∂L/∂z = {short(dz_target)}",
                "outgoing": f"∂L/∂h2 = (∂L/∂z) Woutᵀ   ‖·‖ = {short(dh2_norm)}",
                "norm": round(dh2_norm, 6),
                "note": "Only the output row for this token connects its logit to the hidden vector.",
            },
            {
                "key": "residual", "title": "Residual + MLP", "seed": False,
                "equation": "h2 = y + h   y = ReLU(h W1 + b1) W2 + b2",
                "local": "∂h2/∂h = I + ∂y/∂h   (identity plus the MLP Jacobian)",
                "incoming": f"‖∂L/∂h2‖ = {short(dh2_norm)}",
                "outgoing": f"‖∂L/∂h‖ = {short(dh_norm)}   residual {short(residual_norm)} · MLP {short(mlp_norm)}",
                "norm": round(dh_norm, 6),
                "note": "The error splits into two roads: the residual shortcut and the MLP.",
            },
            {
                "key": "context", "title": "Context vector", "seed": False,
                "equation": f"h = c Wo + bo + x_q   ‖c‖ = {short(context_norm)}",
                "local": "∂h/∂c = Wo",
                "incoming": f"‖∂L/∂h‖ = {short(dh_norm)}",
                "outgoing": f"∂L/∂c = (∂L/∂h) Woᵀ   ‖·‖ = {short(dc_norm)}",
                "norm": round(dc_norm, 6),
                "note": "The output projection mixes the context; the residual then adds the query token's own vector.",
            },
            {
                "key": "link", "title": "Attention link", "seed": False,
                "equation": f"c = Σ a_j v_j   a({token_i}) = {short(a_i)}   ‖v({token_i})‖ = {short(v_norm)}",
                "local": f"∂c/∂a = v({token_i})",
                "incoming": f"‖∂L/∂c‖ = {short(dc_norm)}",
                "outgoing": f"∂L/∂a = ∂L/∂c · v({token_i}) = {short(link_dot)}",
                "norm": round(abs(dattn), 6),
                "note": f"{link_share * 100:.1f}% of the context comes from this link. The dot product is how much the loss would move if this weight moved.",
                "share": round(link_share, 4),
            },
            {
                "key": "attention", "title": "Softmax → attention", "seed": False,
                "equation": f"a = softmax(score)   a({token_i}) = {short(a_i)}",
                "local": f"∂a_i/∂score_i = a_i(1−a_i) = {short(diagonal)}",
                "incoming": f"∂L/∂a_i = {short(dattn)}",
                "outgoing": f"∂L/∂score_i = a_i(∂L/∂a_i − Σ a_j ∂L/∂a_j) = {short(dscore)}",
                "norm": round(abs(dscore), 6),
                "note": "Softmax keeps the weights summing to one: a boost to one link is a cut to the others.",
            },
            {
                "key": "keyvalue", "title": "Key and value", "seed": False,
                "equation": f"score = q·k/√16 = {short(dot)}/4 = {short(score)}   k = x Wk   v = x Wv",
                "local": f"∂score/∂x = q Wkᵀ/√16   ∂c/∂x = a Wvᵀ",
                "incoming": f"∂L/∂score_i = {short(dscore)}   ∂L/∂a_i = {short(dattn)}",
                "outgoing": f"∂L/∂x({token_i}) = dk Wkᵀ + dv Wvᵀ   ‖·‖ = {short(dx_i_norm)}",
                "norm": round(dx_i_norm, 6),
                "note": f"The query side also gets error: ‖∂L/∂q‖ = {short(dq_norm)}, ‖∂L/∂x(query)‖ = {short(dx_q_norm)}.",
            },
            {
                "key": "embedding", "title": "Embedding + position", "seed": False,
                "equation": f"x({token_i}) = E[{token_i}] + P[{index + 1}]",
                "local": "∂x/∂E = I   ∂x/∂P = I",
                "incoming": f"‖∂L/∂x({token_i})‖ = {short(dx_i_norm)}",
                "outgoing": f"∂L/∂E = ∂L/∂P = ∂L/∂x   top dim {top_x + 1} → {short(top_x_value)}",
                "norm": round(dx_i_norm, 6),
                "note": "The same numbers land on the word's embedding row and its position row. Repeated words share the row.",
            },
        ]

        max_norm = max((step["norm"] for step in chain[1:]), default=1.0) or 1.0
        return {
            "tokens": [self.itos[token] for token in ids],
            "position": query,
            "query": token_q,
            "target": chosen,
            "loss": round(loss, 6),
            "matched": matched,
            "max_norm": round(max_norm, 6),
            "link": {
                "index": index,
                "token": token_i,
                "weight": round(a_i, 6),
                "score": round(score, 5),
                "gradient": round(dattn, 6),
                "share": round(link_share, 4),
                "v_norm": round(v_norm, 5),
                "k_norm": round(k_norm, 5),
            },
            "steps": chain,
        }

    def generate(self, prompt: str, count: int = 8, temperature: float = 0.8, seed: int | None = None):
        rng = np.random.default_rng(seed)
        text = self.display(prompt) or prompt.strip()
        steps = []
        for _ in range(count):
            data = self.explain(text)
            row = np.array(data["probs"], dtype=float)
            if temperature <= 0.001:
                chosen = int(np.argmax(row))
            else:
                scaled = np.log(np.maximum(row, 1e-12)) / temperature
                scaled -= scaled.max()
                weights = np.exp(scaled)
                weights /= weights.sum()
                chosen = int(rng.choice(len(weights), p=weights))
            token = self.itos[chosen]
            text = join_token(text, token)
            steps.append({
                "token": token,
                "position": data["position"],
                "attention": data["attention"],
                "probability": round(float(row[chosen]), 6),
                "text": text,
            })
        return {"prompt": self.display(prompt), "text": text, "steps": steps}


def pretrained() -> LanguageModel:
    """Load the saved classroom weights, falling back to training once."""
    global _PRETRAINED
    if _PRETRAINED is None:
        model = LanguageModel()
        loaded = False
        try:
            with np.load(WEIGHTS) as data:
                if data["E"].shape == model.params["E"].shape:
                    model.params = {name: data[name].astype(float) for name in model.params}
                    loaded = True
        except (FileNotFoundError, KeyError, ValueError):
            loaded = False
        if not loaded:
            model.batches(PRETRAIN_STEPS, PRETRAIN_RATE)
        _PRETRAINED = model
    return _PRETRAINED.copy()


def fresh() -> LanguageModel:
    return pretrained()


_PRETRAINED: LanguageModel | None = None
