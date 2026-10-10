from pathlib import Path

import pytest

from ragaz.notation import extract, parse
from ragaz.verify import verify

EXAMPLES = Path(__file__).parent.parent / "examples"


@pytest.mark.parametrize("raga", ["bhupali", "yaman", "malkauns"])
def test_hand_written_examples_score_high(raga):
    report = verify((EXAMPLES / f"{raga}.txt").read_text(), raga)
    assert report.reward > 0.85, report.explain()
    assert report.scores["allowed"] == 1.0


def test_parse_octaves_holds_and_split_beats():
    comp = parse(".D S' - GR |")
    assert [(n.swara, n.octave) for n in comp.notes] == [("D", -1), ("S", 1), ("G", 0), ("R", 0)]
    assert comp.notes[1].duration == 2
    assert comp.notes[2].duration == comp.notes[3].duration == 0.5
    assert comp.notes[3].start == 3.5
    assert comp.beats == 4


def test_newline_ends_a_bar():
    assert len(parse("S R G P\nD P G R").bars) == 2


def test_forbidden_note_hurts_a_lot():
    good = "G - R S | .D S R G | P G D P | G R S - |"
    bad = "G - R S | .D S R G | P M D N | G R S - |"  # Ma and Ni in Bhupali
    report = verify(bad, "bhupali")
    assert report.reward < verify(good, "bhupali").reward * 0.8
    assert any("M is not in Bhupali" in v for v in report.violations)


def test_yaman_rejects_shuddh_ma():
    report = verify(".N R G - | R G m P | m G R - | .N R S - |", "yaman")
    assert report.scores["allowed"] < 1
    assert any("m is not in Yaman" in v for v in report.violations)


def test_broken_tala():
    report = verify("G R S | .D S R G P | P G D P | G R S - |", "bhupali")
    assert report.scores["beats"] == 0.5
    assert any("bar 1 has 3 beats" in v for v in report.violations)


def test_garbage_scores_zero():
    assert verify("hello world, here is a raga!", "yaman").reward == 0
    assert verify("", "yaman").reward == 0


def test_invalid_tokens_reduce_format():
    report = verify("G R S x | .D S R G | P G D P | G R S - |", "bhupali")
    assert 0 < report.scores["format"] < 1


def test_monotone_loop_is_penalised():
    loop = "G G G G | G G G G | G G G G | G G G G |"
    report = verify(loop, "bhupali")
    assert report.reward < 0.5
    assert report.scores["variety"] < 0.5


def test_plain_scale_run_still_scores_ok():
    # Known v0 blind spot: a bland scale is "valid". Pakad rewards fix this in v1.
    scale = "S R G P | D S' D P | G R S R | G P G S |\nS R G P | D P G R | G P D S' | D P G S |"
    assert verify(scale, "bhupali").reward > 0.6


def test_extract_prefers_code_block():
    reply = "Here you go:\n```\nG R S - | P G D P |\n```\nEnjoy | the raga"
    assert extract(reply) == "G R S - | P G D P |"
    assert extract("Notes:\nG R S - |\nthanks") == "G R S - |"


def test_octave_hopping_is_penalised():
    # The 2B baseline's best sample: valid notes, but leaps on almost every move.
    hops = "G' .S .R .G | P .N .S .R | G .G .M .P | R .N .R .G |\nS .G .S .R | P .N .S .R | G .G .M .P | R .N .R .G |"
    report = verify(hops, "yaman")
    assert report.scores["melody"] < 0.3
    assert report.reward < 0.75
    assert any("leaps" in v for v in report.violations)


def test_copy_fraction_of_format_example():
    from ragaz.prompts import EXAMPLE, copy_fraction

    assert copy_fraction(EXAMPLE) == 1
    assert copy_fraction("G R S - | D - P m | P G D P | G R S - |") == 0.25
    assert copy_fraction((EXAMPLES / "bhupali.txt").read_text()) == 0


def test_long_loops_are_penalised():
    # What the first GRPO run converged to at step 20 (scored 0.52 before the fix).
    loop = " | ".join(["S R G G"] + ["S G G G"] * 26 + ["S S G G"] * 5) + " |"
    report = verify(loop, "yaman")
    assert report.reward < 0.1, report.explain()
    assert report.scores["length"] == 0.25


def test_one_repeated_refrain_is_fine():
    report = verify((EXAMPLES / "yaman.txt").read_text(), "yaman")
    assert report.scores["variety"] == 1.0


def test_length_wants_two_cycles():
    one_cycle = "G - R S | .D S R G | P G D P | G R S - |"
    assert verify(one_cycle, "bhupali").scores["length"] == 0.5
    assert verify((EXAMPLES / "bhupali.txt").read_text(), "bhupali").scores["length"] == 1.0


def test_chopped_bars_lose_to_an_honest_short_piece():
    # Track A at step 20: 8 "bars" of 1-3 beats to satisfy the length target.
    chopped = "S R G M | P | D N | G R P N | R G P N | R G R P | R G P | N |"
    honest = ".N R G - | R G M P | M G R - | .N R S - |"
    assert verify(honest, "yaman").reward > 2 * verify(chopped, "yaman").reward


def test_pakad_rewards_signature_phrases():
    with_pakad = "G R S .D | S R G - | P G D P | G R S - |\nG P D S' | D P G - | P D P G | R G R S |"
    without = "S R G P | D S' D P | G R S R | G P G S |\nS R G P | D P G R | G P D S' | D P G S |"
    assert verify(with_pakad, "bhupali").scores["pakad"] > 0.8
    assert verify(without, "bhupali").scores["pakad"] < 0.3


def test_pakad_spam_is_penalised():
    spam = "G R S .D | S R G - | G R S .D | S R G - |\nG R S .D | S R G - | G R S .D | S R G - |"
    report = verify(spam, "bhupali")
    assert any("signature phrase repeated" in v for v in report.violations)


def test_group_profile_credits_the_piece_that_fixes_the_group():
    from ragaz.realprofile import group_profile_ranks, load_profiles

    if load_profiles() is None:
        pytest.skip("needs data/real_profiles.json")
    lopsided = [(s, 0, 1.0) for s in "S R G R S G R S".split()]
    uses_pa = [(s, 0, 1.0) for s in "S P G P D P S R".split()]
    ranks = group_profile_ranks([lopsided] * 7 + [uses_pa], "bhupali")
    assert ranks[-1] == 1.0 and max(ranks[:-1]) < 1.0


def test_v3_style_runs_without_per_piece_profile_weight():
    from ragaz.realprofile import load_profiles
    from ragaz.verify import WEIGHTS_V3

    if load_profiles() is None:
        pytest.skip("needs data/real_profiles.json")
    assert "profile" not in WEIGHTS_V3
    report = verify((EXAMPLES / "malkauns.txt").read_text(), "malkauns", style="v3")
    assert 0 < report.reward <= 1


def test_v4_catches_one_forbidden_note_and_tells_twins_apart():
    from ragaz.realprofile import load_profiles

    if load_profiles() is None:
        pytest.skip("needs data/real_profiles.json")
    with_pa = "S g m d | S g S n | S g S S | m d n S |\nS S n S | P m d n | S S g m | g S m d |"
    assert verify(with_pa, "malkauns", style="v4").reward < 0.5 * verify(with_pa.replace("P m d n", "m g d n"), "malkauns", style="v4").reward
    deshkar_style = "S G P D | P D S' D | P D G P | G R S - |\nG P D S' | D P D G | P G R S | G P D P |"
    assert verify(deshkar_style, "deshkar", style="v4").reward > verify(deshkar_style, "bhupali", style="v4").reward
    bhupali = (EXAMPLES / "bhupali.txt").read_text()
    assert verify(bhupali, "bhupali", style="v4").reward > verify(bhupali, "deshkar", style="v4").reward
