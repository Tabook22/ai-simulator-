import pytest
import tiktoken
from fastapi.testclient import TestClient

from backend import tokenizer
from backend.main import create_app

ENC = tiktoken.get_encoding("o200k_base")


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "tokenizer-test.sqlite3")) as instance:
        yield instance


def check(result, text):
    """The count is the tokenizer's own; bytes rebuild the text; the preview rebuilds it exactly."""
    ids = ENC.encode(text, disallowed_special=())
    assert result["token_count"] == len(ids) == len(result["tokens"])
    assert [token["id"] for token in result["tokens"]] == ids
    assert [token["position"] for token in result["tokens"]] == list(range(len(ids)))
    rebuilt = b"".join(bytes.fromhex(token["bytes"].replace(" ", "")) for token in result["tokens"])
    assert rebuilt == text.encode("utf-8")
    assert "".join(segment["text"] for segment in result["segments"]) == text
    assert sorted(p for segment in result["segments"] for p in segment["tokens"]) == list(range(len(ids)))
    for token in result["tokens"]:
        if token["piece"] is not None:
            assert token["piece"] == ENC.decode([token["id"]])


@pytest.mark.parametrize("text", [
    "ship",
    "The ship reached the port.",
    "In the name of Allah, the Most Gracious, the Most Merciful.",
    "بسم الله الرحمن الرحيم",
    "The word سفينة means ship.",
    "Emoji 👩🏽‍🚀🚢 and 🇴🇲!",
    "  leading,   repeated   spaces and a trailing line break\n\n",
    "Line one\r\nLine two\tTabbed",
])
def test_count_ids_and_preview_match_the_tokenizer(client, text):
    response = client.post("/api/tokenize", json={"text": text})
    assert response.status_code == 200
    result = response.json()
    check(result, text)
    assert result["tokenizer"] == "tiktoken" and result["encoding"] == "o200k_base"


def test_ship_example_counts():
    result = tokenizer.tokenize("The ship reached the port.")
    assert result["word_count"] == 5
    assert [token["piece"] for token in result["tokens"]] == ["The", " ship", " reached", " the", " port", "."]


def test_partial_characters_are_kept_whole_and_shown_as_bytes():
    text = "🚢"
    result = tokenizer.tokenize(text)
    check(result, text)
    partial = [token for token in result["tokens"] if token["partial"]]
    if len(result["tokens"]) > 1:
        assert partial and all(token["piece"] is None for token in partial)
        assert len(result["segments"]) == 1 and result["segments"][0]["text"] == text
    # Rare characters are split into byte pieces; the table shows real bytes, not invented text.
    rare = tokenizer.tokenize("𓀀𓁐")
    check(rare, "𓀀𓁐")
    assert any(token["partial"] for token in rare["tokens"])


def test_control_markers_are_ordinary_text():
    text = "<|endoftext|> and <|im_start|> are just text here."
    result = tokenizer.tokenize(text)
    check(result, text)
    assert ENC.eot_token not in [token["id"] for token in result["tokens"]]


def test_empty_text_and_word_counting():
    result = tokenizer.tokenize("")
    assert result["token_count"] == 0 and result["tokens"] == [] and result["segments"] == []
    assert result["word_count"] == 0
    assert tokenizer.count_words("بسم الله الرحمن الرحيم") == 4
    assert tokenizer.count_words("Hello , world ! 🚢") == 2


def test_a_full_page_and_the_limit(client):
    page = ("The ship reached the port after a long voyage across the sea. وصلت السفينة إلى الميناء.\n" * 60)
    response = client.post("/api/tokenize", json={"text": page})
    assert response.status_code == 200
    check(response.json(), page)

    too_long = "a" * (tokenizer.MAX_CHARACTERS + 1)
    response = client.post("/api/tokenize", json={"text": too_long})
    assert response.status_code == 413
    assert "up to 20,000 characters" in response.json()["detail"]


def test_hero_animation_uses_the_real_ids():
    from pathlib import Path
    import re
    source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "tokenizer.ts").read_text(encoding="utf-8")
    hero = [int(n) for n in re.search(r"HERO_IDS = \[([^\]]+)\]", source).group(1).split(",")]
    assert hero == ENC.encode("The ship reached the port.")


def test_embedding_story_examples_use_real_ids():
    """The " bank" and " photosynthesis" examples on the page use real o200k_base IDs."""
    from pathlib import Path
    source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "EmbeddingStory.tsx").read_text(encoding="utf-8")
    assert "BANK_ID = 6922" in source
    assert ENC.encode("I sat on the river bank.") == [40, 10139, 402, 290, 20608, 6922, 13]
    assert ENC.encode("I opened a bank account.") == [40, 13906, 261, 6922, 3527, 13]
    assert "[[40, 'I'], [10139, ' sat'], [402, ' on'], [290, ' the'], [20608, ' river'], [6922, ' bank'], [13, '.']]" in source
    assert "[[40, 'I'], [13906, ' opened'], [261, ' a'], [6922, ' bank'], [3527, ' account'], [13, '.']]" in source
    assert ENC.encode(" photosynthesis") == [8309, 73972]
    assert "{ id: 8309, piece: ' photos' }, { id: 73972, piece: 'ynthesis' }" in source
