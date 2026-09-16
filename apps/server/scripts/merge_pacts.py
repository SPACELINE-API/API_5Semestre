"""Merge an isolated Pact JSON into a shared Pact file."""

import argparse
from pathlib import Path

from app.shared.pact_writer import merge_pact_files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("generated", type=Path, help="newly generated Pact JSON")
    parser.add_argument("destination", type=Path, help="shared Pact JSON")
    args = parser.parse_args()
    merge_pact_files(args.generated, args.destination)


if __name__ == "__main__":
    main()
