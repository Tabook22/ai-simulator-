"""Real tokenization for the Tokenizer page: tiktoken with the o200k_base encoding.

The count and the token IDs come straight from the tokenizer. Each token is also mapped back onto the
characters of the submitted text, so the page can colour the original text without changing it. When a
token holds only part of a character's UTF-8 bytes (common for Arabic and emoji), the character is kept
whole in the preview and the token's raw bytes are reported instead of invented text.
"""
from functools import lru_cache
from pathlib import Path
import os
import re

# Keep the downloaded vocabulary beside the app, not in a temp folder the system may clear.
os.environ.setdefault("TIKTOKEN_CACHE_DIR", str(Path(__file__).resolve().parent / ".tiktoken-cache"))

import tiktoken  # noqa: E402  (reads TIKTOKEN_CACHE_DIR when it loads an encoding)

ENCODING = "o200k_base"
MAX_CHARACTERS = 20_000
_WORD = re.compile(r"\S+")


@lru_cache(maxsize=1)
def encoding():
    return tiktoken.get_encoding(ENCODING)


def warm_up():
    try:
        encoding()
    except Exception:  # reported to the student by the route instead
        pass


def count_words(text: str) -> int:
    """Words: runs of characters between spaces that hold at least one letter or digit."""
    return sum(1 for match in _WORD.finditer(text) if any(char.isalnum() for char in match.group()))


def tokenize(text: str) -> dict:
    enc = encoding()
    # disallowed_special=() treats text such as "<|endoftext|>" as ordinary text, never as a control marker.
    ids = enc.encode(text, allowed_special=set(), disallowed_special=())

    # Byte offset where each character starts, plus the end of the text.
    char_starts, offset = [], 0
    for char in text:
        char_starts.append(offset)
        offset += len(char.encode("utf-8"))
    total_bytes = offset
    byte_to_char = [0] * (total_bytes + 1)
    for index, start in enumerate(char_starts):
        size = len(text[index].encode("utf-8"))
        for byte in range(start, start + size):
            byte_to_char[byte] = index
    byte_to_char[total_bytes] = len(text)
    boundaries = set(char_starts) | {total_bytes}

    tokens, cursor = [], 0
    for position, token_id in enumerate(ids):
        raw = enc.decode_single_token_bytes(token_id)
        start_byte, end_byte = cursor, cursor + len(raw)
        cursor = end_byte
        whole = start_byte in boundaries and end_byte in boundaries
        tokens.append({
            "position": position,
            "id": token_id,
            "piece": raw.decode("utf-8") if whole else None,
            "bytes": raw.hex(" ").upper(),
            "start": byte_to_char[start_byte],
            # The character holding the token's last byte, plus one: a partial character stays whole.
            "end": byte_to_char[end_byte - 1] + 1 if raw else byte_to_char[start_byte],
            "partial": not whole,
        })
    assert cursor == total_bytes, "token bytes must rebuild the text exactly"

    # Preview segments: consecutive tokens that share a character are drawn as one coloured piece.
    segments = []
    for token in tokens:
        if segments and token["start"] < segments[-1]["end"]:
            segments[-1]["end"] = max(segments[-1]["end"], token["end"])
            segments[-1]["tokens"].append(token["position"])
        else:
            segments.append({"start": token["start"], "end": token["end"], "tokens": [token["position"]]})
    for segment in segments:
        segment["text"] = text[segment["start"]:segment["end"]]

    return {
        "tokenizer": "tiktoken",
        "tokenizer_version": tiktoken.__version__,
        "encoding": ENCODING,
        "token_count": len(ids),
        "word_count": count_words(text),
        "character_count": len(text),
        "max_characters": MAX_CHARACTERS,
        "tokens": tokens,
        "segments": segments,
    }
