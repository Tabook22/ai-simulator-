from backend.exam import exam_case


def test_exam_case_keeps_the_two_three_one_shape_and_batch_contract():
    result = exam_case(epochs=10, batch_size=100, learning_rate=0.05)

    assert result["dataset"]["counts"] == {"train": 1000, "validation": 100, "test": 100}
    assert result["dataset"]["batch_size"] == 100
    assert result["dataset"]["batches_per_epoch"] == 10
    assert result["updates"] == 100
    assert result["network"]["inputs"] == 2
    assert result["network"]["hidden"] == 3
    assert result["network"]["outputs"] == 1
    assert result["network"]["weights"] == 9
    assert result["network"]["biases"] == 4
    assert result["network"]["layers"][0]["activation"] == "relu"
    assert result["network"]["layers"][1]["activation"] == "linear"

    assert result["predictions"][0]["study_hours"] == 5
    assert result["predictions"][0]["attendance"] == 70
    assert result["predictions"][0]["actual"] == 58
    assert result["predictions"][1]["actual"] == 75
    assert result["predictions"][2]["actual"] == 89
    assert result["predictions"][3]["actual"] == 68
    assert len(result["batch_losses"]) == 10
    assert result["final"]["train"]["mae"] < result["initial"]["train"]["mae"]
